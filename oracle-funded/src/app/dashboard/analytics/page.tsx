"use client";

// /dashboard/analytics — trader performance analytics.
//
// Sources: GET /api/trades?accountId=<id> + GET /api/accounts/[id]
//
// Aggregates the realised-PnL trade ledger into:
//   - win rate (closes only, ignoring null PnL on opens)
//   - avg win / avg loss / profit factor
//   - largest winner / loser
//   - cumulative realised P&L curve (sparkline)
//
// All math is integer-cents; no floats touch money values.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowPathIcon } from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

interface TradeRow {
  id: string;
  side: string;
  sizeContracts: number;
  priceCents: number;
  feesCents: number;
  realizedPnlCents: string | null;
  isOpening: boolean;
  externalMarketId: string;
  executedAt: string;
}

interface AccountSummary {
  id: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  drawdownFloorCents: string;
}

function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const valueCls =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-red-700"
        : "text-gray-900 dark:text-gray-100";
  return (
    <TextureCard interactive={false}>
      <TextureCardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
          {label}
        </div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>
        )}
      </TextureCardContent>
    </TextureCard>
  );
}

// Tiny inline sparkline using SVG. No deps. Plots an array of cumulative P&L
// values; baseline is zero, line tinted green/red based on final sign.
function PnlSparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        Need ≥2 closing fills to draw a curve.
      </div>
    );
  }
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const w = 600;
  const h = 120;
  const pad = 4;
  const stepX = (w - pad * 2) / (values.length - 1);
  const yFor = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const points = values.map((v, i) => `${pad + i * stepX},${yFor(v)}`).join(" ");
  const finalPositive = values[values.length - 1] >= 0;
  const lineColor = finalPositive ? "#059669" : "#dc2626";
  const fillColor = finalPositive ? "rgba(5,150,105,0.10)" : "rgba(220,38,38,0.10)";
  const zeroY = yFor(0);

  // Build a closed area under the curve to the zero baseline.
  const areaPoints =
    `${pad},${zeroY} ` +
    points +
    ` ${pad + (values.length - 1) * stepX},${zeroY}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
      <polygon points={areaPoints} fill={fillColor} />
      <line
        x1={pad}
        y1={zeroY}
        x2={w - pad}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.15"
        strokeDasharray="4 3"
      />
      <polyline
        points={points}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AnalyticsPage() {
  const { activeAccount, signedIn } = useApp();
  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(): Promise<void> {
    if (!activeAccount) return;
    setLoading(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([
        api.get<TradeRow[]>(`/api/trades?accountId=${activeAccount.id}`),
        api.get<AccountSummary>(`/api/accounts/${activeAccount.id}`),
      ]);
      setTrades(t);
      setAccount(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id]);

  // Aggregate stats. Only closing fills carry realised P&L; opens have null.
  const stats = useMemo(() => {
    if (!trades) return null;
    const closes = trades
      .filter((t) => t.realizedPnlCents !== null)
      .map((t) => ({ ...t, pnl: Number(t.realizedPnlCents) }));

    if (closes.length === 0) {
      return {
        totalCloses: 0,
        wins: 0,
        losses: 0,
        scratches: 0,
        winRatePct: 0,
        totalPnl: 0,
        grossWins: 0,
        grossLosses: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: null as number | null,
        largestWin: 0,
        largestLoss: 0,
        feesPaid: trades.reduce((s, t) => s + t.feesCents, 0),
        cumulative: [] as number[],
      };
    }

    let wins = 0;
    let losses = 0;
    let scratches = 0;
    let grossWins = 0;
    let grossLosses = 0;
    let largestWin = 0;
    let largestLoss = 0;

    for (const c of closes) {
      if (c.pnl > 0) {
        wins++;
        grossWins += c.pnl;
        if (c.pnl > largestWin) largestWin = c.pnl;
      } else if (c.pnl < 0) {
        losses++;
        grossLosses += -c.pnl;
        if (c.pnl < largestLoss) largestLoss = c.pnl;
      } else {
        scratches++;
      }
    }

    const totalPnl = grossWins - grossLosses;
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : null;
    const avgWin = wins > 0 ? grossWins / wins : 0;
    const avgLoss = losses > 0 ? grossLosses / losses : 0;

    // Build cumulative curve in execution order (oldest → newest).
    const ordered = [...closes].sort(
      (a, b) =>
        new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
    );
    const cumulative: number[] = [];
    let running = 0;
    for (const c of ordered) {
      running += c.pnl;
      cumulative.push(running);
    }

    return {
      totalCloses: closes.length,
      wins,
      losses,
      scratches,
      winRatePct: ((wins / closes.length) * 100),
      totalPnl,
      grossWins,
      grossLosses,
      avgWin,
      avgLoss,
      profitFactor,
      largestWin,
      largestLoss,
      feesPaid: trades.reduce((s, t) => s + t.feesCents, 0),
      cumulative,
    };
  }, [trades]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        Sign in to view analytics.
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Analytics
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have an active challenge account yet.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
        >
          Buy a challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Realised P&amp;L distribution and win-rate stats for the active account.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:border-blue-300 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load analytics: {error}
        </div>
      )}

      {!trades || !stats ? (
        <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading…
        </div>
      ) : stats.totalCloses === 0 ? (
        <TextureCard interactive={false}>
          <TextureCardContent className="p-12 text-center space-y-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              No closed trades yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Open and close at least one position to see your analytics. Opens
              are recorded but only carry realised P&amp;L when closed.
            </p>
            <Link
              href="/dashboard/markets"
              className="inline-block mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
            >
              Browse markets
            </Link>
          </TextureCardContent>
        </TextureCard>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Total realised"
              value={`${stats.totalPnl >= 0 ? "+" : ""}${formatCurrency(stats.totalPnl)}`}
              hint={`${stats.totalCloses} closes`}
              tone={stats.totalPnl >= 0 ? "good" : "bad"}
            />
            <StatTile
              label="Win rate"
              value={`${stats.winRatePct.toFixed(1)}%`}
              hint={`${stats.wins} W · ${stats.losses} L · ${stats.scratches} BE`}
            />
            <StatTile
              label="Profit factor"
              value={
                stats.profitFactor === null
                  ? "∞"
                  : stats.profitFactor.toFixed(2)
              }
              hint="gross wins ÷ gross losses"
              tone={
                stats.profitFactor === null
                  ? "good"
                  : stats.profitFactor >= 1
                    ? "good"
                    : "bad"
              }
            />
            <StatTile
              label="Fees paid"
              value={formatCurrency(stats.feesPaid)}
              hint={`across ${trades.length} fills`}
            />
          </div>

          {/* Cumulative curve */}
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Cumulative realised P&amp;L
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  oldest → newest close
                </span>
              </div>
              <PnlSparkline values={stats.cumulative} />
            </TextureCardContent>
          </TextureCard>

          {/* Win / loss decomposition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextureCard interactive={false}>
              <TextureCardContent className="p-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                  Wins ({stats.wins})
                </h3>
                <Row label="Gross winnings" value={formatCurrency(stats.grossWins)} />
                <Row
                  label="Average win"
                  value={formatCurrency(Math.round(stats.avgWin))}
                />
                <Row label="Largest win" value={formatCurrency(stats.largestWin)} />
              </TextureCardContent>
            </TextureCard>
            <TextureCard interactive={false}>
              <TextureCardContent className="p-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-red-700">
                  Losses ({stats.losses})
                </h3>
                <Row
                  label="Gross losses"
                  value={`-${formatCurrency(stats.grossLosses)}`}
                />
                <Row
                  label="Average loss"
                  value={`-${formatCurrency(Math.round(stats.avgLoss))}`}
                />
                <Row
                  label="Largest loss"
                  value={formatCurrency(stats.largestLoss)}
                />
              </TextureCardContent>
            </TextureCard>
          </div>

          {/* Footnote */}
          {account && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Analytics are based on the most recent 100 fills returned by{" "}
              <code className="font-mono">/api/trades</code>. Account starting
              balance: {formatCurrency(Number(account.startingBalanceCents))}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
        {value}
      </span>
    </div>
  );
}
