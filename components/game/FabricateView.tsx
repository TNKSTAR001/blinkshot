"use client";

import { ALL_RECIPES, ALL_RESOURCES, PORT_BY_ID, RESOURCE_BY_ID } from "@/lib/game/content";
import { cargoUsed } from "@/lib/game/engine";
import { CATEGORY_COLORS, fmt } from "@/lib/game/format";
import type { GameState } from "@/lib/game/types";
import { Coins, Hammer } from "lucide-react";

export default function FabricateView({
  state,
  onCraft,
}: {
  state: GameState;
  onCraft: (outputId: string) => void;
}) {
  const port = PORT_BY_ID[state.locationPortId];
  const space = state.stats.cargo - cargoUsed(state);
  const recipes = [...ALL_RECIPES].sort(
    (a, b) => RESOURCE_BY_ID[a.output].tier - RESOURCE_BY_ID[b.output].tier,
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Fabricator</h2>
        <span className="text-[11px] text-zinc-500">
          Codex {state.unlocked.length}/{ALL_RESOURCES.length} discovered
        </span>
      </div>

      <p className="mb-3 text-xs text-zinc-500">
        Combine raw and refined goods into rarer, more valuable materials. Carry the ingredients
        and dock at a port with a fabricator.
      </p>

      {!port.hasFabricator && (
        <p className="mb-3 rounded bg-zinc-900/60 p-2 text-xs text-amber-300/80">
          No fabricator at {port.name}. You can browse recipes, but must dock at a port with a
          fabricator to combine goods.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {recipes.map((recipe) => {
          const out = RESOURCE_BY_ID[recipe.output];
          const hasAll = recipe.inputs.every(
            (inp) => (state.cargo[inp.resource] ?? 0) >= inp.qty,
          );
          const spaceDelta =
            out.unit * recipe.outputQty -
            recipe.inputs.reduce((s, i) => s + RESOURCE_BY_ID[i.resource].unit * i.qty, 0);
          const canCraft =
            port.hasFabricator &&
            hasAll &&
            state.units >= recipe.fee &&
            space - spaceDelta >= 0;
          return (
            <div key={recipe.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-100">{out.name}</span>
                  <span className={`rounded border px-1 text-[9px] ${CATEGORY_COLORS[out.category]}`}>
                    {out.category} · T{out.tier}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500">≈ {fmt(out.basePrice)} base</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {recipe.inputs.map((inp) => {
                  const ir = RESOURCE_BY_ID[inp.resource];
                  const have = state.cargo[inp.resource] ?? 0;
                  const ok = have >= inp.qty;
                  return (
                    <span
                      key={inp.resource}
                      className={`rounded px-1.5 py-0.5 ${
                        ok ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {ir.name} {inp.qty}
                      <span className="text-zinc-500"> ({have})</span>
                    </span>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-amber-300/80">
                  <Coins className="size-3" /> fee {fmt(recipe.fee)}
                </span>
                <button
                  onClick={() => onCraft(recipe.output)}
                  disabled={!canCraft}
                  className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  <Hammer className="size-3.5" /> Fabricate
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
