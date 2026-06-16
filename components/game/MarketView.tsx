"use client";

import { ALL_RESOURCES, PORT_BY_ID, RESOURCE_BY_ID } from "@/lib/game/content";
import { cargoUsed, ensureMarket, quote, simulateMarket } from "@/lib/game/engine";
import { CATEGORY_COLORS, fmt } from "@/lib/game/format";
import type { GameState, ResourceCategory } from "@/lib/game/types";
import { ArrowDownToLine, ArrowUpFromLine, Minus, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

const CATEGORIES: ResourceCategory[] = [
  "Gas",
  "Ore",
  "Crystal",
  "Alloy",
  "Organic",
  "Tech",
  "Exotic",
  "Artifact",
];

export default function MarketView({
  state,
  onBuy,
  onSell,
}: {
  state: GameState;
  onBuy: (resourceId: string, qty: number) => void;
  onSell: (resourceId: string, qty: number) => void;
}) {
  const portId = state.locationPortId;
  const port = PORT_BY_ID[portId];
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ResourceCategory | "All" | "Owned">("All");
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Build an up-to-date market snapshot for display without mutating state.
  const view = useMemo(() => {
    const s = ensureMarket(state, portId);
    const m = simulateMarket(s, portId);
    return { ...s, markets: { ...s.markets, [portId]: m } };
  }, [state, portId]);

  const rows = useMemo(() => {
    return ALL_RESOURCES.filter((r) => {
      if (cat === "Owned") return (state.cargo[r.id] ?? 0) > 0;
      if (cat !== "All" && r.category !== cat) return false;
      if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).map((r) => ({ r, q: quote(view, portId, r.id), owned: state.cargo[r.id] ?? 0 }));
  }, [cat, query, view, portId, state.cargo]);

  const space = state.stats.cargo - cargoUsed(state);
  const sel = selected ? RESOURCE_BY_ID[selected] : null;
  const selQuote = selected ? quote(view, portId, selected) : null;
  const owned = selected ? state.cargo[selected] ?? 0 : 0;
  const maxBuy = selQuote
    ? Math.max(0, Math.min(selQuote.stock, Math.floor(space), Math.floor(state.units / selQuote.buy)))
    : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          {port.name} Market
        </h2>
        <span className="text-[11px] text-zinc-500">
          Space {fmt(space)}/{fmt(state.stats.cargo)}
        </span>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2 top-2.5 size-4 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search goods…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-zinc-100 outline-none focus:border-cyan-600"
        />
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {(["All", "Owned", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] ${
              cat === c
                ? "border-cyan-500 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 text-[10px] uppercase text-zinc-600">
          <span>Good</span>
          <span className="text-right">Buy</span>
          <span className="text-right">Sell</span>
          <span className="text-right">Stock</span>
        </div>
        {rows.map(({ r, q, owned }) => (
          <button
            key={r.id}
            onClick={() => {
              setSelected(r.id);
              setQty(1);
            }}
            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm ${
              selected === r.id ? "border-cyan-600 bg-cyan-500/10" : "border-zinc-800/80 bg-zinc-900/40"
            }`}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-zinc-100">{r.name}</span>
                {owned > 0 && (
                  <span className="rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-300">×{owned}</span>
                )}
              </span>
              <span
                className={`mt-0.5 inline-block rounded border px-1 text-[9px] ${CATEGORY_COLORS[r.category]}`}
              >
                {r.category} · T{r.tier}
              </span>
            </span>
            <span className="text-right text-amber-300">{fmt(q.buy)}</span>
            <span className="text-right text-emerald-300">{fmt(q.sell)}</span>
            <span className="text-right text-zinc-500">{fmt(q.stock)}</span>
          </button>
        ))}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-600">No goods match your filter.</p>
        )}
      </div>

      {/* Trade bar */}
      {sel && selQuote && (
        <div className="fixed inset-x-0 bottom-[57px] z-20 border-t border-zinc-800 bg-zinc-950/97 backdrop-blur">
          <div className="mx-auto max-w-xl px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-zinc-100">{sel.name}</span>
              <button onClick={() => setSelected(null)} className="text-xs text-zinc-500 hover:text-zinc-300">
                close ✕
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="rounded bg-zinc-800 p-2 text-zinc-200"
              >
                <Minus className="size-4" />
              </button>
              <input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-16 rounded bg-zinc-800 py-1.5 text-center text-zinc-100 outline-none"
              />
              <button
                onClick={() => setQty((n) => n + 1)}
                className="rounded bg-zinc-800 p-2 text-zinc-200"
              >
                <Plus className="size-4" />
              </button>
              <button
                onClick={() => setQty(Math.max(1, maxBuy))}
                className="rounded bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300"
              >
                Max
              </button>
              <span className="ml-auto text-[11px] text-zinc-500">
                {fmt(qty * selQuote.buy)} buy · {fmt(qty * selQuote.sell)} sell
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => onBuy(sel.id, qty)}
                disabled={maxBuy <= 0}
                className="flex items-center justify-center gap-1 rounded bg-amber-500 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                <ArrowDownToLine className="size-4" /> Buy
              </button>
              <button
                onClick={() => onSell(sel.id, qty)}
                disabled={owned <= 0}
                className="flex items-center justify-center gap-1 rounded bg-emerald-500 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500"
              >
                <ArrowUpFromLine className="size-4" /> Sell {owned > 0 ? `(${owned})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
