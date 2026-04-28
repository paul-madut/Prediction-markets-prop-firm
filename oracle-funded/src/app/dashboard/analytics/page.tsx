"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { AnalyticsSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import { calculateWinRate } from "@/lib/calculations";
import {
  calculateSharpe,
  calculateAvgHoldingTime,
  calculateLongShortRatio,
} from "@/lib/analytics";
import { RecentTradesTable } from "@/components/analytics/RecentTradesTable";
import {
  TextureCard,
  TextureCardContent,
} from "@/components/ui/texture-card";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ViewfinderCircleIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  SignalIcon,
  BoltIcon,
  ChevronRightIcon,
  FireIcon,
} from "@heroicons/react/16/solid";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Custom dark tooltip                                                */
/* ------------------------------------------------------------------ */
const CustomTooltip = ({
  active,
  payload,
  label,
  valuePrefix = "$",
  valueSuffix = "",
  labelPrefix = "",
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  labelPrefix?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-xs border border-gray-700/60 backdrop-blur-sm">
      <p className="text-gray-400 mb-1 text-[11px]">
        {labelPrefix}
        {label}
      </p>
      <p className="font-semibold text-sm tracking-tight">
        {valuePrefix}
        {payload[0].value.toFixed(2)}
        {valueSuffix}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const { user, trades, equityHistory } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <AnalyticsSkeleton />;

  /* ── Calculations ─────────────────────────────────────────────── */
  const closedTrades = trades.filter((t) => t.pnl !== 0);
  const winningTrades = closedTrades.filter((t) => t.pnl > 0);
  const losingTrades = closedTrades.filter((t) => t.pnl < 0);

  const winRate = calculateWinRate(closedTrades);
  const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
      : 0;
  const bestTrade =
    closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl)) : 0;
  const worstTrade =
    closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl)) : 0;
  const roi =
    ((user.accountBalance - user.startingBalance) / user.startingBalance) * 100;
  const profitFactor =
    losingTrades.length > 0
      ? Math.abs(
          winningTrades.reduce((sum, t) => sum + t.pnl, 0) /
            losingTrades.reduce((sum, t) => sum + t.pnl, 0)
        )
      : winningTrades.length > 0
        ? Infinity
        : 0;
  const expectancy =
    closedTrades.length > 0 ? totalPnL / closedTrades.length : 0;
  const riskRewardRatio = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
  const sharpe = calculateSharpe(closedTrades);
  const holding = calculateAvgHoldingTime(closedTrades);
  const longShort = calculateLongShortRatio(trades);

  /* Streaks */
  let currentStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWin = 0;
  let tempLoss = 0;
  closedTrades.forEach((t) => {
    if (t.pnl > 0) {
      tempWin++;
      tempLoss = 0;
      if (tempWin > maxWinStreak) maxWinStreak = tempWin;
    } else {
      tempLoss++;
      tempWin = 0;
      if (tempLoss > maxLossStreak) maxLossStreak = tempLoss;
    }
  });
  for (let i = closedTrades.length - 1; i >= 0; i--) {
    const isWin = closedTrades[i].pnl > 0;
    if (currentStreakType === null) {
      currentStreakType = isWin ? "win" : "loss";
      currentStreak = 1;
    } else if (
      (isWin && currentStreakType === "win") ||
      (!isWin && currentStreakType === "loss")
    ) {
      currentStreak++;
    } else {
      break;
    }
  }

  /* Drawdown */
  let peak = 0;
  const drawdownData = equityHistory.map((point) => {
    const eq = point.equity / 100;
    if (eq > peak) peak = eq;
    return {
      date: formatDate(point.date, "d"),
      drawdown: peak > 0 ? ((eq - peak) / peak) * 100 : 0,
    };
  });
  const maxDrawdown = Math.min(...drawdownData.map((d) => d.drawdown));

  /* Chart data */
  const chartData = equityHistory.map((point) => ({
    date: formatDate(point.date, "d"),
    equity: point.equity / 100,
  }));

  const tradeDistribution = closedTrades.map((t, i) => ({
    index: i + 1,
    pnl: t.pnl / 100,
    positive: t.pnl > 0,
  }));

  /* Category data */
  const categories = [
    "Crypto",
    "Politics",
    "Sports",
    "Economics",
    "Tech",
    "Culture",
  ];
  const categoryData = categories
    .map((category) => {
      const ct = closedTrades.filter((t) =>
        t.market_title.toLowerCase().includes(category.toLowerCase())
      );
      const pnl = ct.reduce((sum, t) => sum + t.pnl, 0);
      return {
        name: category,
        trades: ct.length,
        pnl: pnl / 100,
        winRate: calculateWinRate(ct),
      };
    })
    .filter((c) => c.trades > 0)
    .sort((a, b) => b.pnl - a.pnl);

  const maxCategoryPnl = Math.max(
    ...categoryData.map((c) => Math.abs(c.pnl)),
    1
  );

  const winPercent = Math.round(winRate * 100);
  const circumference = 2 * Math.PI * 65; // r = 65

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── 1. Hero Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total P&L */}
        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalPnL >= 0 ? "bg-green-50" : "bg-red-50"}`}
              >
                {totalPnL >= 0 ? (
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                ) : (
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
                )}
              </div>
              <span className="text-sm text-gray-500">Total P&L</span>
            </div>
            <div
              className={`text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatCurrency(totalPnL)}
            </div>
            <div
              className={`flex items-center gap-1 text-xs mt-1.5 ${roi >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {roi >= 0 ? (
                <ArrowUpRightIcon className="w-3 h-3" />
              ) : (
                <ArrowDownRightIcon className="w-3 h-3" />
              )}
              {roi >= 0 ? "+" : ""}
              {roi.toFixed(2)}% ROI
            </div>
          </TextureCardContent>
        </TextureCard>

        {/* Win Rate */}
        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ViewfinderCircleIcon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatPercent(winRate)}
            </div>
            <div className="text-xs text-gray-400 mt-1.5">
              {winningTrades.length}W / {losingTrades.length}L
            </div>
          </TextureCardContent>
        </TextureCard>

        {/* Profit Factor */}
        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <SignalIcon className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Profit Factor</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {profitFactor === Infinity ? "\u221E" : profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1.5">
              {profitFactor >= 1.5
                ? "Strong edge"
                : profitFactor >= 1
                  ? "Profitable"
                  : "Needs improvement"}
            </div>
          </TextureCardContent>
        </TextureCard>

        {/* Expectancy */}
        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <BoltIcon className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">Expectancy</span>
            </div>
            <div
              className={`text-2xl font-bold ${expectancy >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {expectancy >= 0 ? "+" : ""}
              {formatCurrency(expectancy)}
            </div>
            <div className="text-xs text-gray-400 mt-1.5">
              Per trade average
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* ── New metrics row: Sharpe / Holding / Long-Short ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sharpe ratio</div>
            <div className={`text-2xl font-bold ${sharpe >= 0 ? "text-green-600" : "text-red-600"}`}>
              {sharpe.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1.5">Risk-adjusted return per trade</div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Avg holding time</div>
            <div className="text-2xl font-bold text-gray-900">{holding.label}</div>
            <div className="text-xs text-gray-400 mt-1.5">Across closed positions</div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Long / Short</div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{longShort.label}</div>
            <div className="text-xs text-gray-400 mt-1.5">
              {longShort.long} yes · {longShort.short} no
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Recent trades */}
      <RecentTradesTable trades={trades} limit={20} />

      {/* ── 2. Equity Curve -- Hero Chart ─────────────────────── */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Account Performance
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Equity curve over time
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                <span className="text-gray-500">Max DD</span>
                <span className="font-semibold text-red-600">
                  {maxDrawdown.toFixed(2)}%
                </span>
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${roi >= 0 ? "bg-green-50" : "bg-red-50"}`}
              >
                <span className="text-gray-500">ROI</span>
                <span
                  className={`font-semibold ${roi >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#f1f5f9"
                  strokeDasharray="none"
                  vertical={false}
                  horizontal={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    `$${(v / 1000).toFixed(0)}k`
                  }
                  domain={["auto", "auto"]}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#eqGrad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#6366f1",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TextureCardContent>
      </TextureCard>

      {/* ── 3. Trading Breakdown (3 cols) + Win/Loss Donut (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Trading Breakdown */}
        <div className="lg:col-span-3">
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">
                Trading Breakdown
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Total Trades
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {closedTrades.length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Avg Win
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    +{formatCurrency(avgWin)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Avg Loss
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(avgLoss)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Risk / Reward
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {riskRewardRatio.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Best Trade
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    +{formatCurrency(bestTrade)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                    Worst Trade
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(worstTrade)}
                  </div>
                </div>
              </div>

              {/* Streak pills */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <FireIcon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Streaks
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentStreakType === "win" ? "bg-green-50" : "bg-red-50"}`}
                  >
                    <span className="text-xs text-gray-500">Current</span>
                    <span
                      className={`text-sm font-bold ${currentStreakType === "win" ? "text-green-600" : "text-red-600"}`}
                    >
                      {currentStreak}{" "}
                      {currentStreakType === "win" ? "W" : "L"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50">
                    <span className="text-xs text-gray-500">Best</span>
                    <span className="text-sm font-bold text-green-600">
                      {maxWinStreak}W
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50">
                    <span className="text-xs text-gray-500">Worst</span>
                    <span className="text-sm font-bold text-red-600">
                      {maxLossStreak}L
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
                    <span className="text-xs text-gray-500">Max DD</span>
                    <span className="text-sm font-bold text-red-600">
                      {maxDrawdown.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </TextureCardContent>
          </TextureCard>
        </div>

        {/* Right: Win/Loss Donut */}
        <div className="lg:col-span-2">
          <TextureCard interactive={false}>
            <TextureCardContent className="p-6 h-full flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">
                Win / Loss
              </h3>

              <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {/* SVG ring chart */}
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Background track */}
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="16"
                    />
                    {/* Win arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="16"
                      strokeDasharray={`${(winPercent / 100) * circumference} ${((100 - winPercent) / 100) * circumference}`}
                      strokeLinecap="round"
                      transform="rotate(-90 80 80)"
                      className="transition-all duration-700"
                    />
                    {/* Loss arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r="65"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="16"
                      strokeDasharray={`${((100 - winPercent) / 100) * circumference} ${(winPercent / 100) * circumference}`}
                      strokeDashoffset={`${-((winPercent / 100) * circumference)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 80 80)"
                      className="transition-all duration-700"
                    />
                  </svg>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">
                      {winPercent}%
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                      Win Rate
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span className="text-xs text-gray-500">Wins</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {winningTrades.length}
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      +
                      {formatCurrency(
                        winningTrades.reduce((s, t) => s + t.pnl, 0)
                      )}
                    </div>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-xs text-gray-500">Losses</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {losingTrades.length}
                    </div>
                    <div className="text-xs text-red-600 font-medium">
                      {formatCurrency(
                        losingTrades.reduce((s, t) => s + t.pnl, 0)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TextureCardContent>
          </TextureCard>
        </div>
      </div>

      {/* ── 4. Trade P&L Distribution ─────────────────────────── */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Trade Distribution
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">P&L per trade</p>
            </div>
            <Link
              href="/dashboard/history"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View All Trades
              <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tradeDistribution}
                margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="#f1f5f9"
                  strokeDasharray="none"
                  vertical={false}
                  horizontal={false}
                />
                <XAxis
                  dataKey="index"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v}`}
                  width={50}
                />
                <ReferenceLine y={0} stroke="#e2e8f0" />
                <Tooltip
                  content={<CustomTooltip labelPrefix="Trade #" />}
                />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {tradeDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.positive ? "#22c55e" : "#ef4444"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TextureCardContent>
      </TextureCard>

      {/* ── 5. Performance by Category ────────────────────────── */}
      {categoryData.length > 0 && (
        <TextureCard interactive={false}>
          <TextureCardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">
              Performance by Category
            </h3>

            <div className="space-y-4">
              {categoryData.map((cat) => {
                const barWidth = Math.min(
                  (Math.abs(cat.pnl) / maxCategoryPnl) * 100,
                  100
                );
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900 min-w-[80px]">
                          {cat.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {cat.trades} trades
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatPercent(cat.winRate)} win
                        </span>
                      </div>
                      <span
                        className={`font-semibold tabular-nums ${cat.pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {cat.pnl >= 0 ? "+" : ""}${cat.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${cat.pnl >= 0 ? "bg-green-500" : "bg-red-400"}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TextureCardContent>
        </TextureCard>
      )}
    </div>
  );
}
