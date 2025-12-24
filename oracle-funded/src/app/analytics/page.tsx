"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { calculateWinRate } from "@/lib/calculations";
import { EquityChart } from "@/components/dashboard/EquityChart";

export default function AnalyticsPage() {
  const { user, trades } = useApp();

  // Calculate stats
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
    closedTrades.length > 0
      ? Math.max(...closedTrades.map((t) => t.pnl))
      : 0;
  const worstTrade =
    closedTrades.length > 0
      ? Math.min(...closedTrades.map((t) => t.pnl))
      : 0;

  const roi = ((user.accountBalance - user.startingBalance) / user.startingBalance) * 100;

  const stats = [
    { label: "Total P&L", value: formatCurrency(totalPnL), color: totalPnL >= 0 ? "green" : "red" },
    { label: "ROI", value: `${roi.toFixed(2)}%`, color: roi >= 0 ? "green" : "red" },
    { label: "Win Rate", value: formatPercent(winRate), color: "blue" },
    { label: "Total Trades", value: closedTrades.length.toString(), color: "gray" },
    { label: "Avg Win", value: formatCurrency(avgWin), color: "green" },
    { label: "Avg Loss", value: formatCurrency(avgLoss), color: "red" },
    { label: "Best Trade", value: formatCurrency(bestTrade), color: "green" },
    { label: "Worst Trade", value: formatCurrency(worstTrade), color: "red" },
  ];

  const getTextColor = (color: string) => {
    switch (color) {
      case "green":
        return "text-green-600";
      case "red":
        return "text-red-600";
      case "blue":
        return "text-blue-600";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Detailed performance metrics and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
            <div className={`text-2xl font-bold ${getTextColor(stat.color)}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <EquityChart />

      {/* Performance by Category */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance by Category
        </h3>
        <div className="space-y-3">
          {["Crypto", "Politics", "Sports", "Economics", "Tech", "Culture"].map(
            (category) => {
              const categoryTrades = closedTrades.filter((t) =>
                t.market_title.toLowerCase().includes(category.toLowerCase())
              );
              const categoryPnL = categoryTrades.reduce((sum, t) => sum + t.pnl, 0);
              const categoryWinRate = calculateWinRate(categoryTrades);

              return (
                <div
                  key={category}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium text-gray-900">{category}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {categoryTrades.length} trades
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatPercent(categoryWinRate)} win rate
                    </span>
                    <span
                      className={`font-semibold ${
                        categoryPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {categoryPnL >= 0 ? "+" : ""}
                      {formatCurrency(categoryPnL)}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
