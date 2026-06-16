export function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export const CATEGORY_COLORS: Record<string, string> = {
  Gas: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  Ore: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  Crystal: "text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-500/10",
  Alloy: "text-zinc-300 border-zinc-500/40 bg-zinc-500/10",
  Organic: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  Tech: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10",
  Exotic: "text-violet-300 border-violet-500/40 bg-violet-500/10",
  Artifact: "text-yellow-300 border-yellow-500/40 bg-yellow-500/10",
};
