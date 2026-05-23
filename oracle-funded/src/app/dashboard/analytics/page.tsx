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
import { ArrowPathIcon, ChartBarIcon } from "@heroicons/react/16/solid";
import { motion, useReducedMotion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { cn } from "@/lib/utils";

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

// ────────────────────────────────────────────────────────────────────────────
// Cumulative P&L sparkline.
// Uses chart-1/chart-3/chart-5 from the DESIGN.md palette. Tooltip slides in
// on hover via opacity (no width animation).
// ────────────────────────────────────────────────────────────────────────────

function PnlSparkline({
  values,
  timestamps,
}: {
  values: number[];
  timestamps?: string[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (values.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[#ADADAD]">
        Need at least two closes to draw the curve.
      </div>
    );
  }

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const w = 800;
  const h = 200;
  const pad = 8;
  const stepX = (w - pad * 2) / (values.length - 1);
  const yFor = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);
  const points = values.map((v, i) => `${pad + i * stepX},${yFor(v)}`).join(" ");
  const finalPositive = values[values.length - 1] >= 0;
  const stroke = finalPositive ? "#12DFBA" : "#FF1C1C";
  const fill = finalPositive
    ? "rgba(18, 223, 186, 0.10)"
    : "rgba(255, 28, 28, 0.10)";
  const zeroY = yFor(0);

  const areaPoints =
    `${pad},${zeroY} ` +
    points +
    ` ${pad + (values.length - 1) * stepX},${zeroY}`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-40"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w - pad;
          const idx = Math.round(x / stepX);
          if (idx >= 0 && idx < values.length) setHoverIndex(idx);
        }}
      >
        <polygon points={areaPoints} fill={fill} />
        <line
          x1={pad}
          y1={zeroY}
          x2={w - pad}
          y2={zeroY}
          stroke="rgba(255,255,255,0.10)"
          strokeDasharray="4 3"
        />
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoverIndex !== null && (
          <>
            <line
              x1={pad + hoverIndex * stepX}
              y1={pad}
              x2={pad + hoverIndex * stepX}
              y2={h - pad}
              stroke="rgba(167,105,255,0.55)"
              strokeWidth="1"
            />
            <circle
              cx={pad + hoverIndex * stepX}
              cy={yFor(values[hoverIndex])}
              r="4"
              fill={stroke}
              stroke="#180630"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
      {hoverIndex !== null && (
        <motion.div
          key={hoverIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1 }}
          className="pointer-events-none absolute -top-2 rounded-xl border border-white/[0.18] bg-[#1f0a3d] p-3 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
          style={{
            left: `${((pad + hoverIndex * stepX) / w) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#ADADAD]">
            Cumulative
          </div>
          <div
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              values[hoverIndex] > 0
                ? "text-[#12DFBA]"
                : values[hoverIndex] < 0
                  ? "text-[#FF1C1C]"
                  : "text-white",
            )}
          >
            {values[hoverIndex] >= 0 ? "+" : ""}
            {formatCurrency(values[hoverIndex])}
          </div>
          {timestamps?.[hoverIndex] && (
            <div className="mt-1 font-mono text-[10px] text-[#5A6476]">
              {new Date(timestamps[hoverIndex])
                .toISOString()
                .slice(0, 16)
                .replace("T", " ")}
            </div>
          )}
        </motion.div>
      )}
    </div>
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
        timestamps: [] as string[],
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

    const ordered = [...closes].sort(
      (a, b) =>
        new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime(),
    );
    const cumulative: number[] = [];
    const timestamps: string[] = [];
    let running = 0;
    for (const c of ordered) {
      running += c.pnl;
      cumulative.push(running);
      timestamps.push(c.executedAt);
    }

    return {
      totalCloses: closes.length,
      wins,
      losses,
      scratches,
      winRatePct: (wins / closes.length) * 100,
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
      timestamps,
    };
  }, [trades]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-[#ADADAD]">
        Sign in to view analytics.
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[#ADADAD]">
          You don&apos;t have an active challenge account yet.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-block h-11 px-5 leading-[44px] rounded-lg bg-[#7F24FF] text-white text-sm font-semibold hover:bg-[#A769FF] transition-colors"
        >
          Buy a challenge
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-[#ADADAD] mt-1">
            Realised P&amp;L distribution and win-rate stats for the active
            account.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors disabled:opacity-40"
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-[rgba(255,28,28,0.14)] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF1C1C]">
          Failed to load analytics: {error}
        </div>
      )}

      {!trades || !stats ? (
        <AnalyticsSkeleton />
      ) : stats.totalCloses === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#180630] p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
            <ChartBarIcon className="h-5 w-5 text-[#A769FF]" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            No closed trades yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#ADADAD]">
            Close at least one position to populate your stats. Opens are
            recorded but only carry realised P&amp;L when closed.
          </p>
          <Link
            href="/dashboard/markets"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-[#7F24FF] px-5 text-sm font-semibold text-white hover:bg-[#A769FF] transition-colors"
          >
            Browse markets
          </Link>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total realised"
              value={stats.totalPnl / 100}
              format={(v) =>
                `${v >= 0 ? "+" : ""}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              }
              hint={`${stats.totalCloses} closes`}
              tone={
                stats.totalPnl > 0
                  ? "good"
                  : stats.totalPnl < 0
                    ? "bad"
                    : "default"
              }
            />
            <MetricCard
              label="Win rate"
              value={stats.winRatePct}
              format={(v) => `${v.toFixed(1)}%`}
              hint={`${stats.wins} W · ${stats.losses} L · ${stats.scratches} BE`}
            />
            <MetricCard
              label="Profit factor"
              value={stats.profitFactor === null ? "∞" : stats.profitFactor}
              format={(v) => v.toFixed(2)}
              hint="gross wins ÷ losses"
              tone={
                stats.profitFactor === null || stats.profitFactor >= 1
                  ? "good"
                  : "bad"
              }
            />
            <MetricCard
              label="Fees paid"
              value={stats.feesPaid / 100}
              format={(v) =>
                `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              }
              hint={`across ${trades.length} fills`}
              tone="warn"
            />
          </div>

          {/* Cumulative curve — surface-2 elevated card */}
          <div className="rounded-xl border border-white/[0.18] bg-[#1f0a3d] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Cumulative realised P&amp;L
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#ADADAD]">
                oldest → newest
              </span>
            </div>
            <PnlSparkline
              values={stats.cumulative}
              timestamps={stats.timestamps}
            />
          </div>

          {/* Win / loss decomposition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#180630] p-6 space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] font-medium text-[#12DFBA]">
                Wins ({stats.wins})
              </h3>
              <Row
                label="Gross winnings"
                value={formatCurrency(stats.grossWins)}
              />
              <Row
                label="Average win"
                value={formatCurrency(Math.round(stats.avgWin))}
              />
              <Row
                label="Largest win"
                value={formatCurrency(stats.largestWin)}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#180630] p-6 space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] font-medium text-[#FF1C1C]">
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
            </div>
          </div>

          {/* Footnote */}
          {account && (
            <p className="text-xs text-[#5A6476]">
              Analytics are based on the most recent 100 fills returned by{" "}
              <code className="font-mono">/api/trades</code>. Account starting
              balance:{" "}
              <span className="font-mono tabular-nums">
                {formatCurrency(Number(account.startingBalanceCents))}
              </span>
              .
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
      <span className="text-[#ADADAD]">{label}</span>
      <span className="font-mono text-sm font-semibold text-white tabular-nums">
        {value}
      </span>
    </div>
  );
}

function AnalyticsSkeleton() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] rounded-xl border border-white/10 bg-[#180630] animate-pulse"
          />
        ))}
      </div>
      <div className="h-[260px] rounded-xl border border-white/[0.18] bg-[#1f0a3d] animate-pulse" />
    </motion.div>
  );
}
