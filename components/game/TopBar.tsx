"use client";

import { PORT_BY_ID, SYSTEM_BY_ID, VARIANT_BY_ID } from "@/lib/game/content";
import { cargoUsed } from "@/lib/game/engine";
import { fmt } from "@/lib/game/format";
import type { GameState } from "@/lib/game/types";
import { Coins, Fuel, Heart, Package, RotateCcw } from "lucide-react";

function Meter({
  icon,
  value,
  max,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex flex-1 items-center gap-1.5">
      <span className="text-zinc-400">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between text-[10px] text-zinc-400">
          <span>
            {fmt(value)}
            <span className="text-zinc-600">/{fmt(max)}</span>
          </span>
        </div>
        <div className="mt-0.5 h-1 overflow-hidden rounded bg-zinc-800">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function TopBar({
  state,
  onNewGame,
}: {
  state: GameState;
  onNewGame: () => void;
}) {
  const port = PORT_BY_ID[state.locationPortId];
  const system = SYSTEM_BY_ID[port.systemId];
  const variant = VARIANT_BY_ID[state.variantId];
  const used = cargoUsed(state);

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
            <span
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: system.color }}
            />
            <span className="truncate">{port.name}</span>
          </div>
          <p className="truncate text-[11px] text-zinc-500">
            {system.name} · {variant.name} · Day {state.day}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-1 text-sm font-bold text-amber-300">
            <Coins className="size-4" />
            {fmt(state.units)}
          </div>
          <button
            onClick={onNewGame}
            title="New game"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Meter icon={<Fuel className="size-3.5" />} value={state.fuel} max={state.stats.fuelCap} color="bg-sky-500" />
        <Meter icon={<Heart className="size-3.5" />} value={state.hull} max={state.stats.hull} color="bg-rose-500" />
        <Meter icon={<Package className="size-3.5" />} value={used} max={state.stats.cargo} color="bg-emerald-500" />
      </div>
    </header>
  );
}
