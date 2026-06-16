"use client";

import { fuelPrice, repairPrice } from "@/lib/game/actions";
import { PORT_BY_ID, UPGRADES, VARIANT_BY_ID } from "@/lib/game/content";
import { deriveStats } from "@/lib/game/engine";
import { fmt } from "@/lib/game/format";
import type { GameState, UpgradeKind } from "@/lib/game/types";
import { Check, Fuel, Lock, Wrench } from "lucide-react";

const KIND_LABEL: Record<UpgradeKind, string> = {
  cargo: "Cargo Holds",
  fuel: "Fuel Tanks",
  engine: "Engines",
  weapon: "Weapons",
  shield: "Shields & Armor",
  special: "Special Modules",
};

const KINDS: UpgradeKind[] = ["cargo", "fuel", "engine", "weapon", "shield", "special"];

export default function ShipView({
  state,
  onUpgrade,
  onRefuel,
  onRepair,
}: {
  state: GameState;
  onUpgrade: (id: string) => void;
  onRefuel: () => void;
  onRepair: () => void;
}) {
  const port = PORT_BY_ID[state.locationPortId];
  const variant = VARIANT_BY_ID[state.variantId];
  const { stats, mods } = deriveStats(state.variantId, state.upgrades);
  const owned = new Set(state.upgrades);

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {variant.name}
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <StatBox label="Cargo" value={stats.cargo} />
        <StatBox label="Fuel" value={stats.fuelCap} />
        <StatBox label="Speed" value={stats.speed} />
        <StatBox label="Weapon" value={stats.weapon} />
        <StatBox label="Shield" value={stats.shield} />
        <StatBox label="Hull" value={stats.hull} />
      </div>
      {(mods.scanner || mods.evade || mods.fuelEfficiency || mods.salvage) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-cyan-300">
          {mods.scanner > 0 && <Chip>-{Math.round(mods.scanner * 100)}% threats</Chip>}
          {mods.evade > 0 && <Chip>+{Math.round(mods.evade * 100)}% evade</Chip>}
          {mods.fuelEfficiency > 0 && <Chip>-{Math.round(mods.fuelEfficiency * 100)}% fuel</Chip>}
          {mods.salvage > 0 && <Chip>+{Math.round(mods.salvage * 100)}% salvage</Chip>}
        </div>
      )}

      {/* Services */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={onRefuel}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-600/50 bg-sky-500/10 py-2 text-sm font-semibold text-sky-300 hover:bg-sky-500/20"
        >
          <Fuel className="size-4" /> Refuel ({fuelPrice(state)}/u)
        </button>
        <button
          onClick={onRepair}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-600/50 bg-rose-500/10 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20"
        >
          <Wrench className="size-4" /> Repair ({repairPrice(state)}/u)
        </button>
      </div>

      {/* Shipyard */}
      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Shipyard</h3>
        <span className="text-[11px] text-zinc-500">
          {state.upgrades.length}/{UPGRADES.length} modules
        </span>
      </div>
      {!port.hasShipyard && (
        <p className="mt-1 rounded bg-zinc-900/60 p-2 text-xs text-amber-300/80">
          No shipyard at this port — dock at a port with a yard to install upgrades.
        </p>
      )}

      <div className="mt-2 flex flex-col gap-4">
        {KINDS.map((kind) => {
          const ups = UPGRADES.filter((u) => u.kind === kind);
          return (
            <div key={kind}>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {KIND_LABEL[kind]}
              </h4>
              <div className="flex flex-col gap-1.5">
                {ups.map((u) => {
                  const isOwned = owned.has(u.id);
                  const locked = u.requires ? !owned.has(u.requires) : false;
                  const afford = state.units >= u.cost;
                  const canBuy = !isOwned && !locked && afford && port.hasShipyard;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                        isOwned ? "border-emerald-700/50 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/40"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-100">{u.name}</p>
                        <p className="truncate text-[11px] text-zinc-500">{u.description}</p>
                      </div>
                      {isOwned ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <Check className="size-4" /> Owned
                        </span>
                      ) : (
                        <button
                          onClick={() => onUpgrade(u.id)}
                          disabled={!canBuy}
                          className="flex shrink-0 items-center gap-1 rounded bg-cyan-500 px-2.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {locked ? <Lock className="size-3" /> : null}
                          {fmt(u.cost)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-2">
      <p className="text-zinc-500">{label}</p>
      <p className="text-base font-bold text-zinc-100">{fmt(value)}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-cyan-500/10 px-1.5 py-0.5">{children}</span>;
}
