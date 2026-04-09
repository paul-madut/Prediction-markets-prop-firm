"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { AnalyticsSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, formatDate } from "@/lib/formatters";
import { calculateWinRate } from "@/lib/calculations";
import {
  TextureCard,
  TextureCardContent,
} from "@/components/ui/texture-card";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  ChevronRight,
} from "lucide-react";
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
} from "recharts";

export default function AnalyticsPage() {
  const { user, trades, equityHistory } = useApp();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <AnalyticsSkeleton />;

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

  const chartData = equityHistory.map((point) => ({
    date: formatDate(point.date, "d"),
    equity: point.equity / 100,
  }));

  const categories = ["Crypto", "Politics", "Sports", "Economics", "Tech", "Culture"];
  const categoryData = categories
    .map((category) => {
      const categoryTrades = closedTrades.filter((t) =>
        t.market_title.toLowerCase().includes(category.toLowerCase())
      );
      const categoryPnL = categoryTrades.reduce((sum, t) => sum + t.pnl, 0);
      const categoryWinRate = calculateWinRate(categoryTrades);
      return {
        name: category,
        trades: categoryTrades.length,
        pnl: categoryPnL / 100,
        winRate: categoryWinRate,
      };
    })
    .filter((c) => c.trades > 0);

  const tradeDistribution = closedTrades.map((t, i) => ({
    index: i + 1,
    pnl: t.pnl / 100,
    positive: t.pnl > 0,
  }));

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${totalPnL >= 0 ? "bg-green-50" : "bg-red-50"} flex items-center justify-center`}
              >
                {totalPnL >= 0 ? (
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                )}
              </div>
              <span className="text-xs sm:text-sm text-gray-500">Total P&L</span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatCurrency(totalPnL)}
            </div>
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${roi >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {roi >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {roi >= 0 ? "+" : ""}
              {roi.toFixed(2)}% ROI
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500">Win Rate</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatPercent(winRate)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {winningTrades.length}W / {losingTrades.length}L
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500">Profit Factor</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {profitFactor === Infinity ? "---" : profitFactor.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {profitFactor >= 1.5
                ? "Strong edge"
                : profitFactor >= 1
                  ? "Profitable"
                  : "Needs improvement"}
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500">Expectancy</span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold ${expectancy >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {expectancy >= 0 ? "+" : ""}
              {formatCurrency(expectancy)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Per trade avg</div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TextureCard>
          <TextureCardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total Trades</span>
              <BarChart3 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {closedTrades.length}
            </div>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Avg Win</span>
              <Award className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-lg font-bold text-green-600 mt-1">
              +{formatCurrency(avgWin)}
            </div>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Avg Loss</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-lg font-bold text-red-600 mt-1">
              {formatCurrency(avgLoss)}
            </div>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Best / Worst</span>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 mt-1">
              <span className="text-sm font-bold text-green-600">
                +{formatCurrency(bestTrade)}
              </span>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-bold text-red-600">
                {formatCurrency(worstTrade)}
              </span>
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <TextureCard interactive={false}>
          <TextureCardContent className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Equity Curve
            </h3>
            <div className="h-[250px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEqAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    domain={["auto", "auto"]}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number | undefined) => [
                      `$${(value ?? 0).toFixed(2)}`,
                      "Equity",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorEqAnalytics)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TextureCardContent>
        </TextureCard>

        {/* Trade P&L Distribution */}
        <TextureCard interactive={false}>
          <TextureCardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Trade P&L Distribution
              </h3>
              <Link href="/dashboard/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View Trade History
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="h-[250px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="index"
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: "11px" }}
                    tickFormatter={(value) => `$${value}`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number | undefined) => [
                      `$${(value ?? 0).toFixed(2)}`,
                      "P&L",
                    ]}
                  />
                  <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                    {tradeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.positive ? "#22c55e" : "#ef4444"}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Performance by Category */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance by Category
          </h3>

          {categoryData.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">
              No categorized trades yet
            </p>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="block sm:hidden space-y-3">
                {categoryData.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-gray-50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {cat.name}
                      </span>
                      <span
                        className={`font-semibold ${cat.pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {cat.pnl >= 0 ? "+" : ""}${cat.pnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{cat.trades} trades</span>
                      <span>{formatPercent(cat.winRate)} win rate</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${cat.winRate >= 0.5 ? "bg-green-500" : "bg-amber-500"}`}
                        style={{
                          width: `${Math.min(cat.winRate * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop layout */}
              <div className="hidden sm:block space-y-1">
                {categoryData.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900 min-w-[80px]">
                        {cat.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {cat.trades} trades
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${cat.winRate >= 0.5 ? "bg-green-500" : "bg-amber-500"}`}
                            style={{
                              width: `${Math.min(cat.winRate * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 min-w-[40px]">
                          {formatPercent(cat.winRate)}
                        </span>
                      </div>
                      <span
                        className={`font-semibold min-w-[80px] text-right ${
                          cat.pnl >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {cat.pnl >= 0 ? "+" : ""}${cat.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TextureCardContent>
      </TextureCard>
    </div>
  );
}
