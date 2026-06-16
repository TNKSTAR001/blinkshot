"use client";

import type { EventChoice } from "@/lib/game/actions";
import { deriveStats } from "@/lib/game/engine";
import { fmt } from "@/lib/game/format";
import type { GameState } from "@/lib/game/types";
import { Flame, Skull } from "lucide-react";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export default function EventModal({
  state,
  onResolve,
}: {
  state: GameState;
  onResolve: (choice: EventChoice) => void;
}) {
  const ev = state.pending!;
  const { stats, mods } = deriveStats(state.variantId, state.upgrades);

  const evadeOdds = Math.round(clamp(0.45 + stats.speed * 0.018 + mods.evade, 0.1, 0.95) * 100);
  const fleeOdds = Math.round(clamp(0.4 + stats.speed * 0.022 + mods.evade, 0.1, 0.95) * 100);
  const fightOdds = Math.round(clamp(stats.weapon / (stats.weapon + ev.strength) + 0.05, 0.05, 0.95) * 100);
  const bribeCost = Math.round(ev.strength * 9);

  const isPirate = ev.kind === "pirate";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <div className="flex items-center gap-2">
          {isPirate ? (
            <Skull className="size-6 text-rose-400" />
          ) : (
            <Flame className="size-6 text-amber-400" />
          )}
          <h2 className="text-lg font-bold text-zinc-100">
            {isPirate ? "Pirate Ambush!" : "Meteor Storm!"}
          </h2>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          {isPirate
            ? "A raider gang has locked weapons on your hull. How do you respond?"
            : "A dense field of debris is tearing toward your ship. Brace or weave?"}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Threat level <span className="font-semibold text-rose-300">{ev.strength}</span>
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {isPirate ? (
            <>
              <Choice onClick={() => onResolve("fight")} label="Fight" detail={`${fightOdds}% to win · loot on victory`} tone="rose" />
              <Choice onClick={() => onResolve("flee")} label="Flee" detail={`${fleeOdds}% to escape clean`} tone="cyan" />
              <Choice
                onClick={() => onResolve("bribe")}
                label="Bribe"
                detail={`Pay ${fmt(bribeCost)} Units`}
                tone="amber"
                disabled={state.units < bribeCost}
              />
            </>
          ) : (
            <>
              <Choice onClick={() => onResolve("evade")} label="Evade" detail={`${evadeOdds}% to dodge unharmed`} tone="cyan" />
              <Choice onClick={() => onResolve("brace")} label="Brace" detail="Take reduced, guaranteed damage" tone="amber" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Choice({
  onClick,
  label,
  detail,
  tone,
  disabled,
}: {
  onClick: () => void;
  label: string;
  detail: string;
  tone: "rose" | "cyan" | "amber";
  disabled?: boolean;
}) {
  const tones: Record<string, string> = {
    rose: "border-rose-600/50 hover:bg-rose-500/15",
    cyan: "border-cyan-600/50 hover:bg-cyan-500/15",
    amber: "border-amber-600/50 hover:bg-amber-500/15",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-lg border bg-zinc-800/40 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      <span className="font-bold text-zinc-100">{label}</span>
      <span className="text-xs text-zinc-400">{detail}</span>
    </button>
  );
}
