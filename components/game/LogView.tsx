"use client";

import { fmt } from "@/lib/game/format";
import type { GameState } from "@/lib/game/types";

export default function LogView({ state }: { state: GameState }) {
  const meta = state.stats_meta;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Captain&apos;s Log
      </h2>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Box label="Jumps" value={fmt(meta.trips)} />
        <Box label="Earned" value={fmt(meta.creditsEarned)} />
        <Box label="Encounters" value={fmt(meta.eventsSurvived)} />
      </div>

      <div className="flex flex-col gap-1">
        {state.log.map((e, i) => (
          <div
            key={i}
            className={`rounded border-l-2 bg-zinc-900/40 py-1.5 pl-2 pr-2 text-xs ${
              e.tone === "good"
                ? "border-emerald-500 text-emerald-200"
                : e.tone === "bad"
                  ? "border-rose-500 text-rose-200"
                  : "border-zinc-700 text-zinc-300"
            }`}
          >
            <span className="mr-1.5 text-zinc-600">D{e.day}</span>
            {e.text}
          </div>
        ))}
        {state.log.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-600">No entries yet.</p>
        )}
      </div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-2">
      <p className="text-zinc-500">{label}</p>
      <p className="text-base font-bold text-zinc-100">{value}</p>
    </div>
  );
}
