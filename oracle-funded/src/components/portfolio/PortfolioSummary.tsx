"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/formatters";
import { calculateUnrealizedPnL } from "@/lib/calculations";

export const PortfolioSummary = () => {
  const { positions, markets } = useApp();

  // Calculate total unrealized P&L
  const totalUnrealizedPnL = positions.reduce((sum, pos) => {
    const market = markets.find((m) => m.ticker === pos.ticker);
    if (!market) return sum;

    const currentPrice = pos.side === "yes" ? market.yes_ask : market.no_ask;
    const pnl = calculateUnrealizedPnL(pos, currentPrice);
    return sum + pnl;
  }, 0);

  const totalValue = positions.reduce((sum, pos) => sum + pos.market_exposure, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-sm text-gray-500 mb-2">Open Positions</div>
        <div className="text-3xl font-bold text-gray-900">{positions.length}</div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-sm text-gray-500 mb-2">Total Exposure</div>
        <div className="text-3xl font-bold text-gray-900">
          {formatCurrency(totalValue)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-sm text-gray-500 mb-2">Unrealized P&L</div>
        <div
          className={`text-3xl font-bold ${
            totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {totalUnrealizedPnL >= 0 ? "+" : ""}
          {formatCurrency(totalUnrealizedPnL)}
        </div>
      </div>
    </div>
  );
};
