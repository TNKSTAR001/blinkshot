"use client";

import { STARTING_UNITS, VARIANTS } from "@/lib/game/content";
import { Fuel, Gauge, Package, Rocket, Shield, Swords } from "lucide-react";
import { useState } from "react";

export default function StartScreen({
  hasSave,
  onStart,
  onContinue,
}: {
  hasSave: boolean;
  onStart: (variantId: string) => void;
  onContinue: () => void;
}) {
  const [picked, setPicked] = useState<string>(VARIANTS[0].id);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">Intergalactic</p>
        <h1 className="mt-1 text-3xl font-bold text-zinc-100">STAR TRADER</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Haul cargo across 12 star systems and 20 trading ports. Buy low, sell high, fabricate
          rare goods, upgrade your ship, and survive pirates and meteor storms.
        </p>
        <p className="mt-2 text-sm text-amber-300">Starting capital: {STARTING_UNITS} Units</p>
      </header>

      {hasSave && (
        <button
          onClick={onContinue}
          className="mb-6 w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-3 font-bold text-cyan-300 transition-colors hover:bg-cyan-500/20"
        >
          ▶ Continue Voyage
        </button>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Choose your ship
      </h2>
      <div className="flex flex-col gap-3">
        {VARIANTS.map((v) => {
          const active = picked === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setPicked(v.id)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <Rocket className={active ? "size-5 text-cyan-400" : "size-5 text-zinc-500"} />
                <span className="font-bold text-zinc-100">{v.name}</span>
              </div>
              <p className="mt-1 text-xs italic text-cyan-300/80">{v.tagline}</p>
              <p className="mt-2 text-xs text-zinc-400">{v.description}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-300">
                <Stat icon={<Package className="size-3" />} label="Cargo" value={v.base.cargo} />
                <Stat icon={<Fuel className="size-3" />} label="Fuel" value={v.base.fuelCap} />
                <Stat icon={<Gauge className="size-3" />} label="Speed" value={v.base.speed} />
                <Stat icon={<Swords className="size-3" />} label="Weapon" value={v.base.weapon} />
                <Stat icon={<Shield className="size-3" />} label="Shield" value={v.base.shield} />
                <Stat icon={<Rocket className="size-3" />} label="Hull" value={v.base.hull} />
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onStart(picked)}
        className="mt-6 w-full rounded-lg bg-cyan-500 py-3 font-bold text-zinc-950 transition-colors hover:bg-cyan-400"
      >
        Launch Voyage
      </button>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1 rounded bg-zinc-800/60 px-2 py-1">
      <span className="text-zinc-500">{icon}</span>
      <span className="text-zinc-500">{label}</span>
      <span className="ml-auto font-semibold text-zinc-100">{value}</span>
    </div>
  );
}
