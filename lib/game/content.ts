import type {
  PortProfile,
  Recipe,
  Resource,
  ResourceCategory,
  ShipVariant,
  StarSystem,
  Upgrade,
} from "./types";

// ---------------------------------------------------------------------------
// Deterministic PRNG so generated content is identical on every load/render.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORY_BASE: Record<ResourceCategory, number> = {
  Gas: 8,
  Ore: 12,
  Crystal: 24,
  Organic: 14,
  Alloy: 40,
  Tech: 70,
  Exotic: 120,
  Artifact: 260,
};

// ---------------------------------------------------------------------------
// Raw resources (tier 1) — found and traded directly at ports.
// ---------------------------------------------------------------------------
const RAW: [string, ResourceCategory][] = [
  ["Hydrogen", "Gas"],
  ["Helium-3", "Gas"],
  ["Methane Ice", "Gas"],
  ["Argon", "Gas"],
  ["Xenon", "Gas"],
  ["Neon Plasma", "Gas"],
  ["Ammonia", "Gas"],
  ["Iron Ore", "Ore"],
  ["Copper Ore", "Ore"],
  ["Nickel Ore", "Ore"],
  ["Bauxite", "Ore"],
  ["Cobalt Ore", "Ore"],
  ["Lithium Ore", "Ore"],
  ["Uranium Ore", "Ore"],
  ["Platinum Ore", "Ore"],
  ["Quartz Crystal", "Crystal"],
  ["Sapphire", "Crystal"],
  ["Diamond", "Crystal"],
  ["Emerald", "Crystal"],
  ["Opal", "Crystal"],
  ["Topaz", "Crystal"],
  ["Garnet", "Crystal"],
  ["Algae Paste", "Organic"],
  ["Protein Yeast", "Organic"],
  ["Spice Pods", "Organic"],
  ["Medicinal Fungi", "Organic"],
  ["Silk Fiber", "Organic"],
  ["Hardwood", "Organic"],
  ["Bio-Resin", "Organic"],
  ["Tritium", "Gas"],
  ["Titanium Ore", "Ore"],
  ["Tungsten Ore", "Ore"],
  ["Silicon Wafer", "Tech"],
  ["Capacitor Cell", "Tech"],
  ["Microchip", "Tech"],
  ["Sensor Array", "Tech"],
  ["Power Coil", "Tech"],
  ["Servo Motor", "Tech"],
  ["Steel Beam", "Alloy"],
  ["Brass Ingot", "Alloy"],
  ["Bronze Plate", "Alloy"],
  ["Aluminum Sheet", "Alloy"],
  ["Antimatter Trace", "Exotic"],
  ["Dark Matter Dust", "Exotic"],
  ["Quantum Foam", "Exotic"],
  ["Void Crystal", "Exotic"],
  ["Plasma Core", "Exotic"],
  ["Glow Moss", "Organic"],
  ["Rare Earths", "Ore"],
  ["Deuterium", "Gas"],
  ["Obsidian Shard", "Crystal"],
  ["Graphene Flake", "Tech"],
  ["Magnesium Ore", "Ore"],
  ["Sulfur", "Gas"],
  ["Iridium Ore", "Ore"],
  ["Beryl Crystal", "Crystal"],
];

// ---------------------------------------------------------------------------
// Crafted / unlockable resources (tier 2..5). Recipes are derived below.
// ---------------------------------------------------------------------------
const CRAFTED: [string, ResourceCategory, number][] = [
  // tier 2
  ["Refined Fuel", "Gas", 2],
  ["Steel Alloy", "Alloy", 2],
  ["Copper Wire", "Alloy", 2],
  ["Glass Pane", "Crystal", 2],
  ["Nutrient Block", "Organic", 2],
  ["Circuit Board", "Tech", 2],
  ["Battery Pack", "Tech", 2],
  ["Titanium Plate", "Alloy", 2],
  ["Polymer Resin", "Organic", 2],
  ["Coolant Fluid", "Gas", 2],
  ["Reinforced Glass", "Crystal", 2],
  ["Ceramic Composite", "Alloy", 2],
  ["Fertilizer", "Organic", 2],
  ["Optic Fiber", "Tech", 2],
  ["Solar Panel", "Tech", 2],
  ["Hydraulic Fluid", "Gas", 2],
  ["Gemstone Lens", "Crystal", 2],
  ["Medical Salve", "Organic", 2],
  // tier 3
  ["Fusion Cell", "Tech", 3],
  ["Hull Plating", "Alloy", 3],
  ["Nano-Fabric", "Tech", 3],
  ["Plasma Conduit", "Tech", 3],
  ["Cryo-Capsule", "Tech", 3],
  ["Composite Armor", "Alloy", 3],
  ["Bio-Stimulant", "Organic", 3],
  ["Quantum Chip", "Tech", 3],
  ["Shield Emitter", "Tech", 3],
  ["Laser Diode", "Tech", 3],
  ["Gravity Plate", "Tech", 3],
  ["Photonic Crystal", "Crystal", 3],
  // tier 4
  ["Warp Coil", "Exotic", 4],
  ["AI Core", "Tech", 4],
  ["Antimatter Cell", "Exotic", 4],
  ["Adaptive Armor", "Alloy", 4],
  ["Terraform Kit", "Organic", 4],
  ["Cloaking Module", "Exotic", 4],
  ["Singularity Drive", "Exotic", 4],
  ["Neural Lattice", "Tech", 4],
  // tier 5
  ["Stellar Forge Core", "Artifact", 5],
  ["Dyson Fragment", "Artifact", 5],
  ["Ascension Engine", "Artifact", 5],
  ["Genesis Device", "Artifact", 5],
  ["Eternity Crystal", "Artifact", 5],
];

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const RESOURCES: Resource[] = [];
const RECIPES: Recipe[] = [];

// Build raw resources.
RAW.forEach(([name, category], i) => {
  const variance = 1 + ((i * 7) % 5) * 0.11;
  RESOURCES.push({
    id: `r-${slug(name)}`,
    name,
    category,
    tier: 1,
    basePrice: Math.round(CATEGORY_BASE[category] * variance),
    unit: 1,
    craftable: false,
    description: `Raw ${category.toLowerCase()} traded across the sector.`,
  });
});

// Build crafted resources + their recipes.
const rng = mulberry32(987654321);
CRAFTED.forEach(([name, category, tier]) => {
  const id = `r-${slug(name)}`;
  // Candidate inputs: any already-built resource of strictly lower tier.
  const candidates = RESOURCES.filter((r) => r.tier < tier);
  const inputCount = tier >= 4 ? 3 : 2;
  const inputs: { resource: string; qty: number }[] = [];
  const used = new Set<string>();
  for (let k = 0; k < inputCount; k++) {
    let pick: Resource;
    let guard = 0;
    do {
      pick = candidates[Math.floor(rng() * candidates.length)];
      guard++;
    } while (used.has(pick.id) && guard < 50);
    used.add(pick.id);
    inputs.push({ resource: pick.id, qty: 1 + Math.floor(rng() * 3) });
  }
  const inputValue = inputs.reduce((sum, inp) => {
    const r = RESOURCES.find((x) => x.id === inp.resource)!;
    return sum + r.basePrice * inp.qty;
  }, 0);
  const basePrice = Math.round(inputValue * 1.55 + tier * 18);
  RESOURCES.push({
    id,
    name,
    category,
    tier,
    basePrice,
    unit: 1,
    craftable: true,
    description: `Tier ${tier} fabricated ${category.toLowerCase()}.`,
  });
  RECIPES.push({
    id: `recipe-${id}`,
    output: id,
    outputQty: 1,
    inputs,
    fee: Math.round(inputValue * 0.12 + tier * 6),
  });
});

export const ALL_RESOURCES: Resource[] = RESOURCES;
export const ALL_RECIPES: Recipe[] = RECIPES;
export const RESOURCE_BY_ID: Record<string, Resource> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r]),
);
export const RECIPE_BY_OUTPUT: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.output, r]),
);

// ---------------------------------------------------------------------------
// Star systems (12).
// ---------------------------------------------------------------------------
export const SYSTEMS: StarSystem[] = [
  { id: "sol", name: "Sol Prime", x: 50, y: 50, color: "#ffd27d", danger: 0.05, description: "The bustling cradle of trade and home port." },
  { id: "vega", name: "Vega Reach", x: 24, y: 30, color: "#9ad0ff", danger: 0.12, description: "Cool blue giant ringed by mining stations." },
  { id: "rigel", name: "Rigel Gate", x: 74, y: 26, color: "#bcd4ff", danger: 0.18, description: "A luminous hub for high-tech commerce." },
  { id: "cygni", name: "Cygni Belt", x: 18, y: 62, color: "#ffae6b", danger: 0.22, description: "An asteroid belt rich in ore and danger." },
  { id: "lyra", name: "Lyra Bloom", x: 40, y: 18, color: "#c9ff9a", danger: 0.1, description: "Verdant agriworlds feeding the sector." },
  { id: "draco", name: "Draco Void", x: 82, y: 58, color: "#c89bff", danger: 0.4, description: "A lawless rift haunted by pirates." },
  { id: "orion", name: "Orion Spur", x: 60, y: 76, color: "#ff9ab0", danger: 0.2, description: "Frontier shipyards and refit docks." },
  { id: "tau", name: "Tau Ceti", x: 34, y: 80, color: "#8affd6", danger: 0.15, description: "Quiet research colonies and crystal mines." },
  { id: "nova", name: "Nova Spire", x: 88, y: 38, color: "#fff09a", danger: 0.28, description: "A trade spire orbiting a young hot star." },
  { id: "kuiper", name: "Kuiper Edge", x: 12, y: 44, color: "#9affe0", danger: 0.3, description: "Icy outer reaches mined for volatiles." },
  { id: "pulsar", name: "Pulsar Verge", x: 66, y: 8, color: "#ff7d7d", danger: 0.45, description: "Radiation-soaked but exotic-matter rich." },
  { id: "abyss", name: "Abyssal Maw", x: 94, y: 80, color: "#b07dff", danger: 0.6, description: "Deepest, deadliest, most lucrative frontier." },
];

export const SYSTEM_BY_ID: Record<string, StarSystem> = Object.fromEntries(
  SYSTEMS.map((s) => [s.id, s]),
);

// ---------------------------------------------------------------------------
// Trading ports (20). Each has a unique production / demand profile.
// ---------------------------------------------------------------------------
export const PORTS: PortProfile[] = [
  { id: "p-terra", name: "Terra Central", systemId: "sol", x: 50, y: 40, produces: ["Organic", "Tech"], demands: ["Exotic", "Artifact", "Ore"], wealth: 1.15, hasFabricator: true, hasShipyard: true, description: "Capital exchange. Pays top Units for rare goods." },
  { id: "p-luna", name: "Luna Docks", systemId: "sol", x: 64, y: 58, produces: ["Alloy", "Tech"], demands: ["Gas", "Crystal"], wealth: 1.05, hasFabricator: true, hasShipyard: true, description: "Orbital shipyard and fabrication ring." },
  { id: "p-vega1", name: "Vega Helium Wells", systemId: "vega", x: 40, y: 55, produces: ["Gas"], demands: ["Tech", "Organic", "Alloy"], wealth: 0.95, hasFabricator: false, hasShipyard: false, description: "Gas harvesters skimming a blue giant." },
  { id: "p-vega2", name: "Vega Forge", systemId: "vega", x: 60, y: 35, produces: ["Alloy"], demands: ["Ore", "Gas"], wealth: 1.0, hasFabricator: true, hasShipyard: true, description: "Heavy alloy smelters; hungry for ore." },
  { id: "p-rigel1", name: "Rigel Tech Bazaar", systemId: "rigel", x: 45, y: 45, produces: ["Tech"], demands: ["Crystal", "Alloy", "Exotic"], wealth: 1.2, hasFabricator: true, hasShipyard: true, description: "Premier market for circuitry and chips." },
  { id: "p-rigel2", name: "Rigel Crystal Cuts", systemId: "rigel", x: 62, y: 62, produces: ["Crystal"], demands: ["Tech", "Organic"], wealth: 1.1, hasFabricator: false, hasShipyard: false, description: "Gem cutters trading flawless crystal." },
  { id: "p-cygni1", name: "Cygni Ore Rigs", systemId: "cygni", x: 48, y: 50, produces: ["Ore"], demands: ["Gas", "Organic", "Tech"], wealth: 0.9, hasFabricator: false, hasShipyard: true, description: "Sprawling asteroid mining platforms." },
  { id: "p-cygni2", name: "Cygni Black Market", systemId: "cygni", x: 30, y: 70, produces: ["Exotic"], demands: ["Alloy", "Tech"], wealth: 1.25, hasFabricator: false, hasShipyard: false, description: "No questions asked; high prices paid." },
  { id: "p-lyra1", name: "Lyra Greenhouses", systemId: "lyra", x: 50, y: 52, produces: ["Organic"], demands: ["Tech", "Crystal", "Alloy"], wealth: 0.95, hasFabricator: true, hasShipyard: false, description: "Agriworld feeding a dozen colonies." },
  { id: "p-draco1", name: "Draco Freeport", systemId: "draco", x: 44, y: 48, produces: ["Exotic", "Ore"], demands: ["Organic", "Tech", "Alloy"], wealth: 1.3, hasFabricator: true, hasShipyard: true, description: "Pirate-run hub; lucrative but perilous." },
  { id: "p-orion1", name: "Orion Drydock", systemId: "orion", x: 52, y: 44, produces: ["Alloy", "Tech"], demands: ["Crystal", "Exotic"], wealth: 1.1, hasFabricator: true, hasShipyard: true, description: "Frontier refit yards for serious captains." },
  { id: "p-orion2", name: "Orion Supply Cache", systemId: "orion", x: 68, y: 64, produces: ["Gas", "Organic"], demands: ["Ore", "Alloy"], wealth: 0.92, hasFabricator: false, hasShipyard: false, description: "Stockpile depot on the frontier edge." },
  { id: "p-tau1", name: "Tau Research Spire", systemId: "tau", x: 46, y: 46, produces: ["Tech", "Crystal"], demands: ["Exotic", "Organic"], wealth: 1.15, hasFabricator: true, hasShipyard: false, description: "Labs trading prototype technology." },
  { id: "p-tau2", name: "Tau Crystal Mine", systemId: "tau", x: 60, y: 60, produces: ["Crystal"], demands: ["Tech", "Gas"], wealth: 1.0, hasFabricator: false, hasShipyard: false, description: "Deep crystal seams under ice." },
  { id: "p-nova1", name: "Nova Trade Spire", systemId: "nova", x: 50, y: 48, produces: ["Tech", "Alloy"], demands: ["Gas", "Organic", "Crystal"], wealth: 1.18, hasFabricator: true, hasShipyard: true, description: "Glittering commercial tower." },
  { id: "p-kuiper1", name: "Kuiper Ice Wells", systemId: "kuiper", x: 50, y: 50, produces: ["Gas"], demands: ["Tech", "Alloy", "Organic"], wealth: 0.88, hasFabricator: false, hasShipyard: false, description: "Volatiles mined from icy bodies." },
  { id: "p-pulsar1", name: "Pulsar Exotics", systemId: "pulsar", x: 48, y: 52, produces: ["Exotic"], demands: ["Tech", "Alloy", "Organic"], wealth: 1.35, hasFabricator: false, hasShipyard: false, description: "Harvests exotic matter from a pulsar." },
  { id: "p-pulsar2", name: "Pulsar Refinery", systemId: "pulsar", x: 60, y: 40, produces: ["Gas", "Ore"], demands: ["Tech", "Exotic"], wealth: 1.0, hasFabricator: true, hasShipyard: false, description: "Refines volatile pulsar-zone ores." },
  { id: "p-abyss1", name: "Abyss Outpost", systemId: "abyss", x: 46, y: 50, produces: ["Artifact", "Exotic"], demands: ["Organic", "Tech", "Alloy"], wealth: 1.5, hasFabricator: true, hasShipyard: true, description: "Last station before the unknown. Riches and ruin." },
  { id: "p-abyss2", name: "Abyss Salvage Yard", systemId: "abyss", x: 64, y: 58, produces: ["Alloy", "Exotic"], demands: ["Gas", "Crystal", "Artifact"], wealth: 1.4, hasFabricator: false, hasShipyard: true, description: "Picks apart derelicts for exotic alloy." },
];

export const PORT_BY_ID: Record<string, PortProfile> = Object.fromEntries(
  PORTS.map((p) => [p.id, p]),
);

export function portsInSystem(systemId: string): PortProfile[] {
  return PORTS.filter((p) => p.systemId === systemId);
}

// ---------------------------------------------------------------------------
// Ship variants (3). Players pick one to start.
// ---------------------------------------------------------------------------
export const VARIANTS: ShipVariant[] = [
  {
    id: "hauler",
    name: "Mercantile Hauler",
    tagline: "Haul more, risk less.",
    description: "A lumbering freighter with a cavernous hold and huge fuel reserves. Slow and lightly armed — built to carry, not to fight.",
    base: { cargo: 120, fuelCap: 140, speed: 6, weapon: 4, shield: 8, hull: 120 },
  },
  {
    id: "courier",
    name: "Swift Courier",
    tagline: "Outrun every threat.",
    description: "A nimble runner that burns little fuel and slips past danger. Small hold, but fast enough to dodge meteors and pirates alike.",
    base: { cargo: 60, fuelCap: 110, speed: 14, weapon: 6, shield: 6, hull: 90 },
  },
  {
    id: "frigate",
    name: "Vanguard Frigate",
    tagline: "Trade through the front lines.",
    description: "A combat-hardened hull bristling with guns and armor. Balanced cargo and speed, but it answers pirates with broadsides.",
    base: { cargo: 80, fuelCap: 120, speed: 9, weapon: 16, shield: 18, hull: 160 },
  },
];

export const VARIANT_BY_ID: Record<string, ShipVariant> = Object.fromEntries(
  VARIANTS.map((v) => [v.id, v]),
);

// ---------------------------------------------------------------------------
// Upgrades (50). Generated in escalating tiers across six tech lines.
// ---------------------------------------------------------------------------
function buildUpgrades(): Upgrade[] {
  const out: Upgrade[] = [];

  const cargoNames = ["Expanded Hold", "Cargo Pods", "Modular Bay", "Compression Hold", "Stacked Racks", "Bulk Containers", "Hold Extension", "Cavernous Bay", "Megafreight Hold", "Singularity Hold"];
  const fuelNames = ["Reserve Tank", "Extended Tank", "Auxiliary Cells", "Cryo Tank", "Twin Tanks", "Deep Reserve", "Bunker Tank", "Long-Haul Tank", "Vast Reservoir", "Infinite Sink"];
  const engineNames = ["Tuned Thrusters", "Ion Drive", "Plasma Drive", "Pulse Engine", "Fusion Drive", "Vector Engine", "Overdrive Core", "Warp Assist", "Hyper Drive", "Singularity Drive"];
  const weaponNames = ["Light Laser", "Twin Cannons", "Pulse Turret", "Rail Gun", "Plasma Lance", "Missile Bank", "Beam Array", "Annihilator Cannon"];
  const shieldNames = ["Deflector Plates", "Shield Capacitor", "Ablative Armor", "Reactive Shielding", "Aegis Field", "Bastion Matrix"];

  cargoNames.forEach((name, i) => {
    const tier = i + 1;
    out.push({
      id: `u-cargo-${tier}`,
      name,
      kind: "cargo",
      tier,
      cost: Math.round(180 * Math.pow(1.55, i)),
      requires: i > 0 ? `u-cargo-${tier - 1}` : undefined,
      effects: { cargo: 25 + i * 10 },
      description: `+${25 + i * 10} cargo capacity.`,
    });
  });
  fuelNames.forEach((name, i) => {
    const tier = i + 1;
    out.push({
      id: `u-fuel-${tier}`,
      name,
      kind: "fuel",
      tier,
      cost: Math.round(150 * Math.pow(1.5, i)),
      requires: i > 0 ? `u-fuel-${tier - 1}` : undefined,
      effects: { fuelCap: 20 + i * 8 },
      description: `+${20 + i * 8} fuel capacity.`,
    });
  });
  engineNames.forEach((name, i) => {
    const tier = i + 1;
    out.push({
      id: `u-engine-${tier}`,
      name,
      kind: "engine",
      tier,
      cost: Math.round(220 * Math.pow(1.6, i)),
      requires: i > 0 ? `u-engine-${tier - 1}` : undefined,
      effects: { speed: 2 + i },
      description: `+${2 + i} travel speed.`,
    });
  });
  weaponNames.forEach((name, i) => {
    const tier = i + 1;
    out.push({
      id: `u-weapon-${tier}`,
      name,
      kind: "weapon",
      tier,
      cost: Math.round(200 * Math.pow(1.62, i)),
      requires: i > 0 ? `u-weapon-${tier - 1}` : undefined,
      effects: { weapon: 6 + i * 4 },
      description: `+${6 + i * 4} weapon power.`,
    });
  });
  shieldNames.forEach((name, i) => {
    const tier = i + 1;
    out.push({
      id: `u-shield-${tier}`,
      name,
      kind: "shield",
      tier,
      cost: Math.round(240 * Math.pow(1.6, i)),
      requires: i > 0 ? `u-shield-${tier - 1}` : undefined,
      effects: { shield: 8 + i * 5, hull: 15 + i * 10 },
      description: `+${8 + i * 5} shield, +${15 + i * 10} hull.`,
    });
  });

  // Six unique special modules (10+10+10+8+6 = 44, +6 = 50).
  const specials: Upgrade[] = [
    { id: "u-special-scanner", name: "Long-Range Scanner", kind: "special", tier: 1, cost: 900, effects: { scanner: 0.35 }, description: "-35% chance of encountering threats." },
    { id: "u-special-injector", name: "Fuel Injector", kind: "special", tier: 1, cost: 1100, effects: { fuelEfficiency: 0.25 }, description: "-25% fuel consumed per jump." },
    { id: "u-special-tractor", name: "Salvage Tractor", kind: "special", tier: 1, cost: 1300, effects: { salvage: 0.5 }, description: "Recover 50% of cargo lost to threats." },
    { id: "u-special-thrusters", name: "Evasion Thrusters", kind: "special", tier: 1, cost: 1200, effects: { evade: 0.3 }, description: "+30% to evade and flee rolls." },
    { id: "u-special-drones", name: "Repair Drones", kind: "special", tier: 1, cost: 1500, effects: { hull: 60 }, description: "+60 max hull and faster field repairs." },
    { id: "u-special-navcomp", name: "Quantum Nav-Computer", kind: "special", tier: 1, cost: 2200, effects: { speed: 4, fuelEfficiency: 0.15 }, description: "+4 speed and -15% fuel use." },
  ];
  out.push(...specials);

  return out;
}

export const UPGRADES: Upgrade[] = buildUpgrades();
export const UPGRADE_BY_ID: Record<string, Upgrade> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

export const HOME_PORT_ID = "p-terra";
export const STARTING_UNITS = 500;
