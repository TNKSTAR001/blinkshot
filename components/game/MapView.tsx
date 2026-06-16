"use client";

import { PORT_BY_ID, SYSTEMS, SYSTEM_BY_ID, portsInSystem } from "@/lib/game/content";
import { routeBetween } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { AlertTriangle, Fuel, Hammer, MapPin, Timer, Wrench } from "lucide-react";
import { useState } from "react";

function dangerLabel(d: number) {
  if (d < 0.15) return { t: "Safe", c: "text-emerald-400" };
  if (d < 0.3) return { t: "Risky", c: "text-amber-400" };
  if (d < 0.5) return { t: "Dangerous", c: "text-orange-400" };
  return { t: "Deadly", c: "text-rose-400" };
}

export default function MapView({
  state,
  onTravel,
}: {
  state: GameState;
  onTravel: (portId: string) => void;
}) {
  const currentPort = PORT_BY_ID[state.locationPortId];
  const currentSystemId = currentPort.systemId;
  const [selected, setSelected] = useState<string>(currentSystemId);
  const fromSys = SYSTEM_BY_ID[currentSystemId];

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Galaxy Map · Route Planning
      </h2>

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_30%_20%,#0b1020,#05070d)]">
        <svg viewBox="0 0 100 100" className="aspect-square w-full">
          {/* route lines from current system */}
          {SYSTEMS.filter((s) => s.id !== currentSystemId).map((s) => (
            <line
              key={`l-${s.id}`}
              x1={fromSys.x}
              y1={fromSys.y}
              x2={s.x}
              y2={s.y}
              stroke={s.id === selected ? "#22d3ee" : "#1e293b"}
              strokeWidth={s.id === selected ? 0.5 : 0.25}
              strokeDasharray={s.id === selected ? "0" : "1 1.5"}
            />
          ))}
          {SYSTEMS.map((s) => {
            const isCurrent = s.id === currentSystemId;
            const isSelected = s.id === selected;
            return (
              <g
                key={s.id}
                onClick={() => setSelected(s.id)}
                className="cursor-pointer"
              >
                <circle cx={s.x} cy={s.y} r={isSelected ? 6 : 4.5} fill={s.color} opacity={0.18} />
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={isCurrent ? 2.6 : 2}
                  fill={s.color}
                  stroke={isSelected ? "#22d3ee" : isCurrent ? "#fff" : "none"}
                  strokeWidth={0.6}
                />
                <text
                  x={s.x}
                  y={s.y + 8}
                  textAnchor="middle"
                  fontSize={2.6}
                  fill={isSelected ? "#67e8f9" : "#94a3b8"}
                >
                  {s.name}
                </text>
                {isCurrent && (
                  <text x={s.x} y={s.y - 6} textAnchor="middle" fontSize={2.4} fill="#fff">
                    ◆ you
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* selected system details */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: SYSTEM_BY_ID[selected].color }} />
          <h3 className="font-semibold text-zinc-100">{SYSTEM_BY_ID[selected].name}</h3>
          <span className={`ml-auto text-xs ${dangerLabel(SYSTEM_BY_ID[selected].danger).c}`}>
            {dangerLabel(SYSTEM_BY_ID[selected].danger).t}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{SYSTEM_BY_ID[selected].description}</p>

        <div className="mt-3 flex flex-col gap-2">
          {portsInSystem(selected).map((p) => {
            const here = p.id === state.locationPortId;
            const route = routeBetween(state, state.locationPortId, p.id);
            const dl = dangerLabel(route.danger);
            const noFuel = state.fuel < route.fuel;
            return (
              <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-100">
                      <MapPin className="size-3.5 text-cyan-400" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-500">{p.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      {p.produces.map((c) => (
                        <span key={c} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                          sells {c}
                        </span>
                      ))}
                      {p.demands.map((c) => (
                        <span key={c} className="rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300">
                          buys {c}
                        </span>
                      ))}
                      {p.hasShipyard && (
                        <span className="flex items-center gap-0.5 rounded bg-zinc-700/40 px-1.5 py-0.5 text-zinc-300">
                          <Wrench className="size-2.5" /> yard
                        </span>
                      )}
                      {p.hasFabricator && (
                        <span className="flex items-center gap-0.5 rounded bg-zinc-700/40 px-1.5 py-0.5 text-zinc-300">
                          <Hammer className="size-2.5" /> fab
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {here ? (
                  <div className="mt-2 rounded bg-cyan-500/10 py-1.5 text-center text-xs font-semibold text-cyan-300">
                    ◆ Docked here
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Timer className="size-3" />
                        {route.days}d
                      </span>
                      <span className={`flex items-center gap-1 ${noFuel ? "text-rose-400" : ""}`}>
                        <Fuel className="size-3" />
                        {route.fuel}
                      </span>
                      <span className={`flex items-center gap-1 ${dl.c}`}>
                        <AlertTriangle className="size-3" />
                        {dl.t}
                      </span>
                    </div>
                    <button
                      onClick={() => onTravel(p.id)}
                      disabled={noFuel}
                      className="ml-auto rounded bg-cyan-500 px-3 py-1.5 text-xs font-bold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
                    >
                      {noFuel ? "No fuel" : "Travel"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
