// Core type definitions for the Star Trader intergalactic trading game.

export type ResourceCategory =
  | "Gas"
  | "Ore"
  | "Crystal"
  | "Alloy"
  | "Organic"
  | "Tech"
  | "Exotic"
  | "Artifact";

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  tier: number; // 1 (raw) .. 5 (legendary)
  basePrice: number; // baseline value in Units
  unit: number; // cargo space per unit
  /** Raw resources are unlocked from the start; crafted ones are unlockable. */
  craftable: boolean;
  description: string;
}

export interface Recipe {
  id: string;
  /** Resource id that this recipe produces. */
  output: string;
  outputQty: number;
  /** input resource id -> quantity required. */
  inputs: { resource: string; qty: number }[];
  /** Units charged by the fabricator to run the recipe. */
  fee: number;
}

export interface StarSystem {
  id: string;
  name: string;
  x: number; // galaxy map coordinate 0..100
  y: number;
  /** Visual tint for the star. */
  color: string;
  /** Base danger 0..1 used when travelling near/through this system. */
  danger: number;
  description: string;
}

export interface PortProfile {
  id: string;
  name: string;
  systemId: string;
  /** position within the system view, 0..100 */
  x: number;
  y: number;
  /** Categories produced in abundance (cheap to buy here). */
  produces: ResourceCategory[];
  /** Categories in high demand (sell here for a premium). */
  demands: ResourceCategory[];
  /** Wealth multiplier affecting overall price levels. */
  wealth: number;
  /** Whether the port has a fabricator (crafting) and a shipyard (upgrades). */
  hasFabricator: boolean;
  hasShipyard: boolean;
  description: string;
}

export type UpgradeKind =
  | "cargo"
  | "fuel"
  | "engine"
  | "weapon"
  | "shield"
  | "special";

export interface Upgrade {
  id: string;
  name: string;
  kind: UpgradeKind;
  tier: number;
  cost: number;
  description: string;
  /** Required upgrade id that must be owned first. */
  requires?: string;
  effects: Partial<{
    cargo: number;
    fuelCap: number;
    speed: number;
    weapon: number;
    shield: number;
    hull: number;
    fuelEfficiency: number; // multiplier reduction on fuel use
    evade: number; // bonus to evade/flee rolls
    scanner: number; // reduces threat chance
    salvage: number; // recover cargo after losses
  }>;
}

export interface ShipVariant {
  id: string;
  name: string;
  tagline: string;
  description: string;
  base: {
    cargo: number;
    fuelCap: number;
    speed: number;
    weapon: number;
    shield: number;
    hull: number;
  };
}

/** Live, persisted economic state for a single port. */
export interface PortMarket {
  /** resourceId -> current stock units available. */
  stock: Record<string, number>;
  /** Last game-day this market was simulated. */
  lastDay: number;
  /** Per-port phase used to desync the global trend waves. */
  phase: number;
}

export interface ShipStats {
  cargo: number;
  fuelCap: number;
  speed: number;
  weapon: number;
  shield: number;
  hull: number;
}

export type PendingEventKind = "meteor" | "pirate";

export interface PendingEvent {
  kind: PendingEventKind;
  strength: number; // threat strength
  /** Port the player was travelling to when the threat struck. */
  destination: string;
}

export interface GameState {
  version: number;
  started: boolean;
  variantId: string;
  units: number;
  day: number;
  fuel: number;
  hull: number;
  /** Permanent stats derived from variant + upgrades (cached). */
  stats: ShipStats;
  /** resourceId -> quantity in cargo hold. */
  cargo: Record<string, number>;
  /** owned upgrade ids. */
  upgrades: string[];
  /** crafted/discovered resource ids (unlocked). */
  unlocked: string[];
  locationPortId: string;
  markets: Record<string, PortMarket>;
  pending: PendingEvent | null;
  /** rolling activity log, newest first. */
  log: { day: number; text: string; tone: "info" | "good" | "bad" }[];
  stats_meta: {
    trips: number;
    creditsEarned: number;
    eventsSurvived: number;
  };
}
