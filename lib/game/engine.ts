import {
  HOME_PORT_ID,
  PORT_BY_ID,
  RESOURCE_BY_ID,
  STARTING_UNITS,
  SYSTEM_BY_ID,
  UPGRADE_BY_ID,
  VARIANT_BY_ID,
} from "./content";
import type {
  GameState,
  PortMarket,
  PortProfile,
  Resource,
  ShipStats,
} from "./types";

export const SAVE_KEY = "star-trader-save-v1";
export const STATE_VERSION = 1;

// ---------------------------------------------------------------------------
// Derived ship stats & modifiers.
// ---------------------------------------------------------------------------
export interface ShipMods {
  fuelEfficiency: number; // 0..~0.7 reduction
  evade: number; // additive bonus to evade/flee
  scanner: number; // reduction to threat chance
  salvage: number; // fraction of lost cargo recovered
}

export function deriveStats(
  variantId: string,
  upgrades: string[],
): { stats: ShipStats; mods: ShipMods } {
  const variant = VARIANT_BY_ID[variantId] ?? VARIANT_BY_ID.hauler;
  const stats: ShipStats = { ...variant.base };
  const mods: ShipMods = { fuelEfficiency: 0, evade: 0, scanner: 0, salvage: 0 };

  for (const id of upgrades) {
    const up = UPGRADE_BY_ID[id];
    if (!up) continue;
    const e = up.effects;
    if (e.cargo) stats.cargo += e.cargo;
    if (e.fuelCap) stats.fuelCap += e.fuelCap;
    if (e.speed) stats.speed += e.speed;
    if (e.weapon) stats.weapon += e.weapon;
    if (e.shield) stats.shield += e.shield;
    if (e.hull) stats.hull += e.hull;
    if (e.fuelEfficiency) mods.fuelEfficiency += e.fuelEfficiency;
    if (e.evade) mods.evade += e.evade;
    if (e.scanner) mods.scanner += e.scanner;
    if (e.salvage) mods.salvage = Math.max(mods.salvage, e.salvage);
  }
  mods.fuelEfficiency = Math.min(0.7, mods.fuelEfficiency);
  mods.scanner = Math.min(0.8, mods.scanner);
  return { stats, mods };
}

export function cargoUsed(state: GameState): number {
  let total = 0;
  for (const [id, qty] of Object.entries(state.cargo)) {
    const r = RESOURCE_BY_ID[id];
    if (r) total += qty * r.unit;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Market simulation. Stock mean-reverts toward an equilibrium that itself
// drifts on a slow sine wave, producing adaptive, dynamic supply & demand.
// ---------------------------------------------------------------------------
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function roleFor(port: PortProfile, r: Resource): "produce" | "demand" | "neutral" {
  if (port.produces.includes(r.category)) return "produce";
  if (port.demands.includes(r.category)) return "demand";
  return "neutral";
}

/** Long-run equilibrium stock for a resource at a port on a given day. */
function equilibrium(
  port: PortProfile,
  market: PortMarket,
  r: Resource,
  day: number,
): number {
  const role = roleFor(port, r);
  let base = role === "produce" ? 240 : role === "demand" ? 24 : 90;
  // Higher-tier goods are scarcer everywhere.
  base *= 1 / (1 + (r.tier - 1) * 0.55);
  // Slow market trend wave, desynced per port and per resource.
  const seed = hashStr(port.id + r.id);
  const wave = Math.sin(market.phase + seed * Math.PI * 2 + day * 0.05);
  return Math.max(2, base * (1 + 0.4 * wave));
}

export function ensureMarket(state: GameState, portId: string): GameState {
  if (state.markets[portId]) return state;
  const port = PORT_BY_ID[portId];
  const phase = hashStr(portId) * Math.PI * 2;
  const market: PortMarket = { stock: {}, lastDay: state.day, phase };
  for (const r of Object.values(RESOURCE_BY_ID)) {
    market.stock[r.id] = equilibrium(port, market, r, state.day);
  }
  return { ...state, markets: { ...state.markets, [portId]: market } };
}

/** Advance a port's stock toward equilibrium for the elapsed days. */
export function simulateMarket(
  state: GameState,
  portId: string,
): PortMarket {
  const port = PORT_BY_ID[portId];
  const market = state.markets[portId];
  const days = state.day - market.lastDay;
  if (days <= 0) return market;
  const rate = 1 - Math.exp(-0.08 * days);
  const stock: Record<string, number> = { ...market.stock };
  for (const r of Object.values(RESOURCE_BY_ID)) {
    const eq = equilibrium(port, market, r, state.day);
    const cur = stock[r.id] ?? eq;
    stock[r.id] = cur + (eq - cur) * rate;
  }
  return { ...market, stock, lastDay: state.day };
}

export interface Quote {
  buy: number; // price to buy one unit from the port
  sell: number; // price the port pays for one unit
  stock: number;
}

export function quote(
  state: GameState,
  portId: string,
  resourceId: string,
): Quote {
  const port = PORT_BY_ID[portId];
  const market = state.markets[portId];
  const r = RESOURCE_BY_ID[resourceId];
  const eq = equilibrium(port, market, r, state.day);
  const stock = market.stock[resourceId] ?? eq;
  const ratio = eq / Math.max(stock, 1);
  const scarcity = Math.min(3.2, Math.max(0.4, Math.pow(ratio, 0.55)));
  const role = roleFor(port, r);
  const roleMult = role === "produce" ? 0.78 : role === "demand" ? 1.4 : 1;
  const price = r.basePrice * port.wealth * roleMult * scarcity;
  return {
    buy: Math.max(1, Math.round(price * 1.06)),
    sell: Math.max(1, Math.round(price * 0.92)),
    stock: Math.floor(stock),
  };
}

// ---------------------------------------------------------------------------
// Travel cost / time.
// ---------------------------------------------------------------------------
export interface Route {
  days: number;
  fuel: number;
  distance: number;
  intraSystem: boolean;
  danger: number;
}

export function routeBetween(
  state: GameState,
  fromPortId: string,
  toPortId: string,
): Route {
  const from = PORT_BY_ID[fromPortId];
  const to = PORT_BY_ID[toPortId];
  const { stats, mods } = deriveStats(state.variantId, state.upgrades);
  let distance: number;
  let intraSystem = false;
  if (from.systemId === to.systemId) {
    distance = 7;
    intraSystem = true;
  } else {
    const a = SYSTEM_BY_ID[from.systemId];
    const b = SYSTEM_BY_ID[to.systemId];
    distance = Math.hypot(a.x - b.x, a.y - b.y) + 6;
  }
  const days = Math.max(1, Math.ceil(distance / (stats.speed * 0.85)));
  const fuel = Math.max(
    1,
    Math.ceil(distance * 0.85 * (1 - mods.fuelEfficiency)),
  );
  const dangerA = SYSTEM_BY_ID[from.systemId].danger;
  const dangerB = SYSTEM_BY_ID[to.systemId].danger;
  const danger = intraSystem
    ? dangerB * 0.4
    : (dangerA + dangerB) / 2 + distance * 0.0025;
  return { days, fuel, distance, intraSystem, danger };
}

// ---------------------------------------------------------------------------
// State construction & persistence.
// ---------------------------------------------------------------------------
export function emptyState(): GameState {
  return {
    version: STATE_VERSION,
    started: false,
    variantId: "hauler",
    units: STARTING_UNITS,
    day: 0,
    fuel: 0,
    hull: 0,
    stats: { cargo: 0, fuelCap: 0, speed: 0, weapon: 0, shield: 0, hull: 0 },
    cargo: {},
    upgrades: [],
    unlocked: [],
    locationPortId: HOME_PORT_ID,
    markets: {},
    pending: null,
    log: [],
    stats_meta: { trips: 0, creditsEarned: 0, eventsSurvived: 0 },
  };
}

export function startGame(variantId: string): GameState {
  const { stats } = deriveStats(variantId, []);
  let state: GameState = {
    ...emptyState(),
    started: true,
    variantId,
    stats,
    fuel: stats.fuelCap,
    hull: stats.hull,
    log: [
      {
        day: 0,
        text: `Commissioned the ${VARIANT_BY_ID[variantId].name}. ${STARTING_UNITS} Units in the bank. Fly safe, captain.`,
        tone: "info",
      },
    ],
  };
  state = ensureMarket(state, HOME_PORT_ID);
  return state;
}

export function log(
  state: GameState,
  text: string,
  tone: "info" | "good" | "bad" = "info",
): GameState {
  return {
    ...state,
    log: [{ day: state.day, text, tone }, ...state.log].slice(0, 60),
  };
}

export function loadState(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: GameState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}
