import { Trade } from "@/types";

// Sharpe ratio over per-trade returns. Returns are pnl / total entry cost.
export function calculateSharpe(trades: Trade[], riskFreeRate: number = 0): number {
  const completed = trades.filter((t) => t.exitDate);
  if (completed.length < 2) return 0;
  const returns = completed.map((t) => {
    const cost = t.shares * t.entryPrice;
    return cost === 0 ? 0 : t.pnl / cost;
  });
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
  const stdev = Math.sqrt(variance);
  if (stdev === 0) return 0;
  return (mean - riskFreeRate) / stdev;
}

// Average holding time in hours. Returns formatted "Xd Yh" or "Yh Zm".
export function calculateAvgHoldingTime(trades: Trade[]): { hours: number; label: string } {
  const closed = trades.filter((t) => t.exitDate && t.entryDate);
  if (closed.length === 0) return { hours: 0, label: "—" };
  const hoursList = closed.map((t) => {
    const entry = new Date(t.entryDate).getTime();
    const exit = new Date(t.exitDate as string).getTime();
    return (exit - entry) / (1000 * 60 * 60);
  });
  const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length;
  return { hours: avg, label: formatHoursLabel(avg) };
}

function formatHoursLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours - days * 24);
  return remHours === 0 ? `${days}d` : `${days}d ${remHours}h`;
}

// Long/Short ratio: yes = long, no = short.
export function calculateLongShortRatio(trades: Trade[]): { long: number; short: number; label: string } {
  const long = trades.filter((t) => t.side === "yes").length;
  const short = trades.filter((t) => t.side === "no").length;
  return { long, short, label: `${long}/${short}` };
}

// Streak helpers (current and max win/loss streak)
export function calculateStreaks(trades: Trade[]): {
  current: { type: "win" | "loss" | "none"; count: number };
  maxWin: number;
  maxLoss: number;
} {
  const closed = trades.filter((t) => t.result === "won" || t.result === "lost");
  if (closed.length === 0) {
    return { current: { type: "none", count: 0 }, maxWin: 0, maxLoss: 0 };
  }
  // Sort newest first by exitDate.
  const sorted = [...closed].sort((a, b) => (b.exitDate || "").localeCompare(a.exitDate || ""));

  // Current streak: walk from newest while result matches.
  const headType = sorted[0].result === "won" ? "win" : "loss";
  let count = 0;
  for (const t of sorted) {
    const type = t.result === "won" ? "win" : "loss";
    if (type === headType) count++;
    else break;
  }

  // Max streaks across the chronological order.
  const chrono = [...closed].sort((a, b) => (a.exitDate || "").localeCompare(b.exitDate || ""));
  let maxWin = 0;
  let maxLoss = 0;
  let curWin = 0;
  let curLoss = 0;
  for (const t of chrono) {
    if (t.result === "won") {
      curWin++;
      curLoss = 0;
      if (curWin > maxWin) maxWin = curWin;
    } else if (t.result === "lost") {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLoss) maxLoss = curLoss;
    }
  }

  return { current: { type: headType, count }, maxWin, maxLoss };
}
