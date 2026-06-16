import {
  HOME_PORT_ID,
  PORT_BY_ID,
  RECIPE_BY_OUTPUT,
  RESOURCE_BY_ID,
  UPGRADE_BY_ID,
} from "./content";
import {
  cargoUsed,
  deriveStats,
  ensureMarket,
  log,
  quote,
  routeBetween,
  simulateMarket,
} from "./engine";
import type { GameState, PendingEventKind } from "./types";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/** Sync the live market for the current location into state. */
function refreshHere(state: GameState): GameState {
  state = ensureMarket(state, state.locationPortId);
  const market = simulateMarket(state, state.locationPortId);
  return { ...state, markets: { ...state.markets, [state.locationPortId]: market } };
}

function markUnlocked(state: GameState, resourceId: string): GameState {
  if (state.unlocked.includes(resourceId)) return state;
  return { ...state, unlocked: [...state.unlocked, resourceId] };
}

// ---------------------------------------------------------------------------
// Trading
// ---------------------------------------------------------------------------
export function buy(state: GameState, resourceId: string, qty: number): GameState {
  if (qty <= 0) return state;
  state = refreshHere(state);
  const q = quote(state, state.locationPortId, resourceId);
  const r = RESOURCE_BY_ID[resourceId];
  const space = state.stats.cargo - cargoUsed(state);
  const maxByStock = Math.floor(q.stock);
  const maxBySpace = Math.floor(space / r.unit);
  const maxByCash = Math.floor(state.units / q.buy);
  qty = Math.min(qty, maxByStock, maxBySpace, maxByCash);
  if (qty <= 0) {
    return log(state, "Can't buy — not enough Units, cargo space, or stock.", "bad");
  }
  const cost = q.buy * qty;
  const market = state.markets[state.locationPortId];
  const newStock = { ...market.stock, [resourceId]: market.stock[resourceId] - qty };
  state = {
    ...state,
    units: state.units - cost,
    cargo: { ...state.cargo, [resourceId]: (state.cargo[resourceId] ?? 0) + qty },
    markets: { ...state.markets, [state.locationPortId]: { ...market, stock: newStock } },
  };
  state = markUnlocked(state, resourceId);
  return log(state, `Bought ${qty} ${r.name} for ${cost} Units.`, "info");
}

export function sell(state: GameState, resourceId: string, qty: number): GameState {
  if (qty <= 0) return state;
  state = refreshHere(state);
  const have = state.cargo[resourceId] ?? 0;
  qty = Math.min(qty, have);
  if (qty <= 0) return state;
  const q = quote(state, state.locationPortId, resourceId);
  const r = RESOURCE_BY_ID[resourceId];
  const gain = q.sell * qty;
  const remaining = have - qty;
  const newCargo = { ...state.cargo };
  if (remaining > 0) newCargo[resourceId] = remaining;
  else delete newCargo[resourceId];
  const market = state.markets[state.locationPortId];
  const newStock = { ...market.stock, [resourceId]: (market.stock[resourceId] ?? 0) + qty };
  state = {
    ...state,
    units: state.units + gain,
    cargo: newCargo,
    markets: { ...state.markets, [state.locationPortId]: { ...market, stock: newStock } },
    stats_meta: { ...state.stats_meta, creditsEarned: state.stats_meta.creditsEarned + gain },
  };
  return log(state, `Sold ${qty} ${r.name} for ${gain} Units.`, "good");
}

// ---------------------------------------------------------------------------
// Services: refuel & repair (available at every port).
// ---------------------------------------------------------------------------
export function fuelPrice(state: GameState): number {
  const port = PORT_BY_ID[state.locationPortId];
  const discount = port.produces.includes("Gas") ? 0.55 : 1;
  return Math.max(1, Math.round(3 * port.wealth * discount));
}

export function repairPrice(state: GameState): number {
  const port = PORT_BY_ID[state.locationPortId];
  return Math.max(1, Math.round(4 * port.wealth));
}

export function refuel(state: GameState): GameState {
  const need = state.stats.fuelCap - state.fuel;
  if (need <= 0) return log(state, "Fuel tank already full.", "info");
  const per = fuelPrice(state);
  const affordable = Math.min(need, Math.floor(state.units / per));
  if (affordable <= 0) return log(state, "Not enough Units to buy fuel.", "bad");
  return log(
    { ...state, units: state.units - affordable * per, fuel: state.fuel + affordable },
    `Refueled ${affordable} units for ${affordable * per} Units.`,
    "info",
  );
}

export function repair(state: GameState): GameState {
  const need = state.stats.hull - state.hull;
  if (need <= 0) return log(state, "Hull is already in perfect shape.", "info");
  const per = repairPrice(state);
  const affordable = Math.min(need, Math.floor(state.units / per));
  if (affordable <= 0) return log(state, "Not enough Units to repair the hull.", "bad");
  return log(
    { ...state, units: state.units - affordable * per, hull: state.hull + affordable },
    `Repaired ${affordable} hull for ${affordable * per} Units.`,
    "good",
  );
}

// ---------------------------------------------------------------------------
// Crafting (combination options).
// ---------------------------------------------------------------------------
export function craft(state: GameState, outputId: string): GameState {
  const port = PORT_BY_ID[state.locationPortId];
  if (!port.hasFabricator) return log(state, "No fabricator at this port.", "bad");
  const recipe = RECIPE_BY_OUTPUT[outputId];
  if (!recipe) return state;
  for (const inp of recipe.inputs) {
    if ((state.cargo[inp.resource] ?? 0) < inp.qty) {
      return log(state, "Missing ingredients for that recipe.", "bad");
    }
  }
  if (state.units < recipe.fee) return log(state, "Can't afford the fabrication fee.", "bad");
  // Check resulting cargo space (output unit count vs consumed inputs).
  const out = RESOURCE_BY_ID[outputId];
  let spaceDelta = out.unit * recipe.outputQty;
  for (const inp of recipe.inputs) spaceDelta -= RESOURCE_BY_ID[inp.resource].unit * inp.qty;
  if (cargoUsed(state) + spaceDelta > state.stats.cargo) {
    return log(state, "Not enough cargo space for the output.", "bad");
  }
  const cargo = { ...state.cargo };
  for (const inp of recipe.inputs) {
    cargo[inp.resource] -= inp.qty;
    if (cargo[inp.resource] <= 0) delete cargo[inp.resource];
  }
  cargo[outputId] = (cargo[outputId] ?? 0) + recipe.outputQty;
  state = { ...state, cargo, units: state.units - recipe.fee };
  state = markUnlocked(state, outputId);
  return log(state, `Fabricated ${recipe.outputQty} ${out.name}.`, "good");
}

// ---------------------------------------------------------------------------
// Ship upgrades.
// ---------------------------------------------------------------------------
export function buyUpgrade(state: GameState, upgradeId: string): GameState {
  const port = PORT_BY_ID[state.locationPortId];
  if (!port.hasShipyard) return log(state, "No shipyard at this port.", "bad");
  const up = UPGRADE_BY_ID[upgradeId];
  if (!up) return state;
  if (state.upgrades.includes(upgradeId)) return state;
  if (up.requires && !state.upgrades.includes(up.requires)) {
    return log(state, "Requires the previous module first.", "bad");
  }
  if (state.units < up.cost) return log(state, "Not enough Units for that upgrade.", "bad");
  const newUpgrades = [...state.upgrades, upgradeId];
  const before = state.stats;
  const { stats } = deriveStats(state.variantId, newUpgrades);
  // Grant the increase in max hull/fuel immediately.
  const fuel = Math.min(stats.fuelCap, state.fuel + Math.max(0, stats.fuelCap - before.fuelCap));
  const hull = Math.min(stats.hull, state.hull + Math.max(0, stats.hull - before.hull));
  state = {
    ...state,
    units: state.units - up.cost,
    upgrades: newUpgrades,
    stats,
    fuel,
    hull,
  };
  return log(state, `Installed ${up.name}.`, "good");
}

// ---------------------------------------------------------------------------
// Travel & threats.
// ---------------------------------------------------------------------------
export function travel(state: GameState, toPortId: string): GameState {
  if (state.pending) return state;
  if (toPortId === state.locationPortId) return state;
  const route = routeBetween(state, state.locationPortId, toPortId);
  if (state.fuel < route.fuel) {
    return log(state, `Not enough fuel — need ${route.fuel}, have ${Math.floor(state.fuel)}.`, "bad");
  }
  const { mods } = deriveStats(state.variantId, state.upgrades);
  const fromName = PORT_BY_ID[state.locationPortId].name;
  const toName = PORT_BY_ID[toPortId].name;

  state = {
    ...state,
    fuel: state.fuel - route.fuel,
    day: state.day + route.days,
    locationPortId: toPortId,
    stats_meta: { ...state.stats_meta, trips: state.stats_meta.trips + 1 },
  };
  state = ensureMarket(state, toPortId);
  const market = simulateMarket(state, toPortId);
  state = { ...state, markets: { ...state.markets, [toPortId]: market } };
  state = log(state, `Jumped from ${fromName} to ${toName} (${route.days}d, ${route.fuel} fuel).`, "info");

  // Roll for a threat encounter.
  const chance = clamp(route.danger * (1 - mods.scanner), 0, 0.9);
  if (Math.random() < chance) {
    const isPirate = Math.random() < clamp(0.35 + route.danger, 0, 0.85);
    const kind: PendingEventKind = isPirate ? "pirate" : "meteor";
    const strength = Math.round((10 + route.danger * 70) * (0.7 + Math.random() * 0.6));
    state = {
      ...state,
      pending: { kind, strength, destination: toPortId },
    };
    const desc =
      kind === "pirate"
        ? `Pirates intercept you near ${toName}!`
        : `A meteor storm engulfs your approach to ${toName}!`;
    state = log(state, desc, "bad");
  }
  return state;
}

function mitigation(shield: number) {
  return shield / (shield + 25);
}

/** Strip a fraction of the hold; salvage recovers part of it. */
function loseCargo(state: GameState, fraction: number, salvage: number): { state: GameState; lost: number } {
  const cargo = { ...state.cargo };
  let lost = 0;
  for (const id of Object.keys(cargo)) {
    const take = Math.floor(cargo[id] * fraction * (1 - salvage));
    if (take > 0) {
      cargo[id] -= take;
      lost += take;
      if (cargo[id] <= 0) delete cargo[id];
    }
  }
  return { state: { ...state, cargo }, lost };
}

/** Apply hull damage; if crippled, perform an emergency tow back home. */
function applyDamage(state: GameState, dmg: number): GameState {
  const hull = state.hull - dmg;
  if (hull > 0) return { ...state, hull };
  // Crippled — towed home, lose cargo and a chunk of Units.
  state = {
    ...state,
    hull: Math.round(state.stats.hull * 0.35),
    fuel: Math.round(state.stats.fuelCap * 0.5),
    units: Math.round(state.units * 0.7),
    cargo: {},
    day: state.day + 3,
    locationPortId: HOME_PORT_ID,
  };
  state = ensureMarket(state, HOME_PORT_ID);
  return log(state, "Your ship was crippled! An emergency tow hauled you back to Terra Central — cargo lost.", "bad");
}

export type EventChoice = "evade" | "brace" | "fight" | "flee" | "bribe";

export function resolveEvent(state: GameState, choice: EventChoice): GameState {
  const ev = state.pending;
  if (!ev) return state;
  const { stats, mods } = deriveStats(state.variantId, state.upgrades);
  const mit = mitigation(stats.shield);
  let next: GameState = { ...state, pending: null };
  next = { ...next, stats_meta: { ...next.stats_meta, eventsSurvived: next.stats_meta.eventsSurvived + 1 } };

  if (ev.kind === "meteor") {
    if (choice === "evade") {
      const p = clamp(0.45 + stats.speed * 0.018 + mods.evade, 0.1, 0.95);
      if (Math.random() < p) {
        return log(next, "You weaved through the meteor storm without a scratch.", "good");
      }
      const dmg = Math.round(ev.strength * (1 - mit));
      return log(applyDamage(next, dmg), `Evasion failed — meteors battered the hull for ${dmg} damage.`, "bad");
    }
    // brace
    const dmg = Math.round(ev.strength * 0.55 * (1 - mit));
    const res = loseCargo(next, 0.05, mods.salvage);
    next = res.state;
    next = applyDamage(next, dmg);
    return log(next, `You braced and took ${dmg} hull damage${res.lost ? ` and lost ${res.lost} cargo` : ""}.`, "bad");
  }

  // pirate
  if (choice === "fight") {
    const p = clamp(stats.weapon / (stats.weapon + ev.strength) + 0.05, 0.05, 0.95);
    if (Math.random() < p) {
      const loot = Math.round(ev.strength * 4 + Math.random() * ev.strength * 5);
      next = { ...next, units: next.units + loot };
      const dmg = Math.round(ev.strength * 0.2 * (1 - mit));
      next = applyDamage(next, dmg);
      return log(next, `You blasted the raiders apart and salvaged ${loot} Units (took ${dmg} damage).`, "good");
    }
    const dmg = Math.round(ev.strength * 0.7 * (1 - mit));
    const res = loseCargo(next, 0.35, mods.salvage);
    next = applyDamage(res.state, dmg);
    return log(next, `The pirates won the firefight — ${dmg} hull damage and ${res.lost} cargo plundered.`, "bad");
  }
  if (choice === "flee") {
    const p = clamp(0.4 + stats.speed * 0.022 + mods.evade, 0.1, 0.95);
    if (Math.random() < p) {
      return log(next, "You burned hard and escaped the pirates clean.", "good");
    }
    const res = loseCargo(next, 0.25, mods.salvage);
    const fine = Math.round(ev.strength * 3);
    next = { ...res.state, units: Math.max(0, res.state.units - fine) };
    return log(next, `They caught you fleeing — lost ${res.lost} cargo and ${fine} Units.`, "bad");
  }
  // bribe
  const cost = Math.round(ev.strength * 9);
  if (next.units < cost) {
    return log(next, "You couldn't pay the bribe — they robbed you anyway.", "bad");
  }
  next = { ...next, units: next.units - cost };
  return log(next, `You paid the pirates ${cost} Units and they let you pass.`, "info");
}
