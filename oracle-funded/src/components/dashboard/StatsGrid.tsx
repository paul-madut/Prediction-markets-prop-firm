"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { calculateProfitProgress } from "@/lib/calculations";

export const StatsGrid = () => {
  const { user } = useApp();

  const profitProgress = calculateProfitProgress(
    user.startingBalance,
    user.accountBalance,
    user.profitTarget
  );

  const stats = [
    {
      label: "Profit Target",
      value: `${(user.currentProfit * 100).toFixed(2)}% / ${(user.profitTarget * 100).toFixed(0)}%`,
      progress: profitProgress,
      color: "blue",
    },
    {
      label: "Daily Drawdown",
      value: formatPercent(Math.abs(user.currentDailyDrawdown)),
      limit: formatPercent(user.dailyDrawdownLimit),
      progress: Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit,
      color: Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit > 0.8 ? "red" : "green",
    },
    {
      label: "Max Drawdown",
      value: formatPercent(Math.abs(user.currentMaxDrawdown)),
      limit: formatPercent(user.maxDrawdownLimit),
      progress: Math.abs(user.currentMaxDrawdown) / user.maxDrawdownLimit,
      color: Math.abs(user.currentMaxDrawdown) / user.maxDrawdownLimit > 0.8 ? "red" : "green",
    },
    {
      label: "Trading Days",
      value: `${user.tradingDaysCompleted} / ${user.tradingDaysRequired}`,
      progress: user.tradingDaysCompleted / user.tradingDaysRequired,
      color: "blue",
    },
  ];

  const getProgressBarColor = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-600";
      case "green":
        return "bg-green-600";
      case "red":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <div className="text-sm text-gray-500 mb-2">{stat.label}</div>
          <div className="text-2xl font-bold text-gray-900 mb-3">
            {stat.value}
          </div>
          {stat.limit && (
            <div className="text-xs text-gray-500 mb-2">
              Limit: {stat.limit}
            </div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getProgressBarColor(stat.color)}`}
              style={{ width: `${Math.min(stat.progress * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
