"use client";

import EventModal from "@/components/game/EventModal";
import FabricateView from "@/components/game/FabricateView";
import LogView from "@/components/game/LogView";
import MapView from "@/components/game/MapView";
import MarketView from "@/components/game/MarketView";
import ShipView from "@/components/game/ShipView";
import StartScreen from "@/components/game/StartScreen";
import TopBar from "@/components/game/TopBar";
import {
  buy,
  buyUpgrade,
  craft,
  refuel,
  repair,
  resolveEvent,
  sell,
  travel,
  type EventChoice,
} from "@/lib/game/actions";
import { emptyState, loadState, saveState, startGame } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import {
  Hammer,
  Map as MapIcon,
  Rocket,
  ScrollText,
  Store,
} from "lucide-react";
import { useEffect, useReducer, useState } from "react";

export type Action =
  | { type: "start"; variantId: string }
  | { type: "buy"; resourceId: string; qty: number }
  | { type: "sell"; resourceId: string; qty: number }
  | { type: "refuel" }
  | { type: "repair" }
  | { type: "craft"; outputId: string }
  | { type: "upgrade"; upgradeId: string }
  | { type: "travel"; toPortId: string }
  | { type: "resolve"; choice: EventChoice }
  | { type: "load"; state: GameState }
  | { type: "restart" };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return startGame(action.variantId);
    case "buy":
      return buy(state, action.resourceId, action.qty);
    case "sell":
      return sell(state, action.resourceId, action.qty);
    case "refuel":
      return refuel(state);
    case "repair":
      return repair(state);
    case "craft":
      return craft(state, action.outputId);
    case "upgrade":
      return buyUpgrade(state, action.upgradeId);
    case "travel":
      return travel(state, action.toPortId);
    case "resolve":
      return resolveEvent(state, action.choice);
    case "load":
      return action.state;
    case "restart":
      return emptyState();
    default:
      return state;
  }
}

type Tab = "map" | "market" | "fabricate" | "ship" | "log";

const TABS: { id: Tab; label: string; Icon: typeof MapIcon }[] = [
  { id: "map", label: "Map", Icon: MapIcon },
  { id: "market", label: "Market", Icon: Store },
  { id: "fabricate", label: "Fabricate", Icon: Hammer },
  { id: "ship", label: "Ship", Icon: Rocket },
  { id: "log", label: "Log", Icon: ScrollText },
];

export default function GamePage() {
  const [state, dispatch] = useReducer(reducer, undefined, emptyState);
  const [tab, setTab] = useState<Tab>("map");
  const [hydrated, setHydrated] = useState(false);

  // Load any saved game once on mount.
  useEffect(() => {
    const saved = loadState();
    if (saved) dispatch({ type: "load", state: saved });
    setHydrated(true);
  }, []);

  // Persist after hydration whenever the game is in progress.
  useEffect(() => {
    if (hydrated && state.started) saveState(state);
  }, [state, hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-500">
        Loading star charts…
      </div>
    );
  }

  if (!state.started) {
    return (
      <StartScreen
        hasSave={!!loadState()}
        onStart={(variantId) => {
          dispatch({ type: "start", variantId });
          setTab("market");
        }}
        onContinue={() => {
          const saved = loadState();
          if (saved) dispatch({ type: "load", state: saved });
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <TopBar
        state={state}
        onNewGame={() => {
          if (confirm("Abandon this voyage and start a new game?")) {
            dispatch({ type: "restart" });
            setTab("map");
          }
        }}
      />

      <main className="flex-1 overflow-y-auto px-3 pb-28 pt-3">
        {tab === "map" && (
          <MapView state={state} onTravel={(id) => dispatch({ type: "travel", toPortId: id })} />
        )}
        {tab === "market" && (
          <MarketView
            state={state}
            onBuy={(resourceId, qty) => dispatch({ type: "buy", resourceId, qty })}
            onSell={(resourceId, qty) => dispatch({ type: "sell", resourceId, qty })}
          />
        )}
        {tab === "fabricate" && (
          <FabricateView state={state} onCraft={(id) => dispatch({ type: "craft", outputId: id })} />
        )}
        {tab === "ship" && (
          <ShipView
            state={state}
            onUpgrade={(id) => dispatch({ type: "upgrade", upgradeId: id })}
            onRefuel={() => dispatch({ type: "refuel" })}
            onRepair={() => dispatch({ type: "repair" })}
          />
        )}
        {tab === "log" && <LogView state={state} />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors ${
                tab === id ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {state.pending && (
        <EventModal
          state={state}
          onResolve={(choice) => dispatch({ type: "resolve", choice })}
        />
      )}
    </div>
  );
}
