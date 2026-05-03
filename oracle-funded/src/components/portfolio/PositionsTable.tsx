"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { calculateUnrealizedPnL } from "@/lib/calculations";
import { StatefulButton } from "@/components/ui/stateful-button";

export const PositionsTable = () => {
  const { positions, markets, closePosition } = useApp();

  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No open positions. Visit the Markets page to start trading!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Open Positions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Market
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Side
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Shares
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Entry Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                P&L
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {positions.map((position) => {
              const market = markets.find((m) => m.ticker === position.ticker);
              const currentPrice = market
                ? position.side === "yes"
                  ? market.yes_ask
                  : market.no_ask
                : 0;
              const unrealizedPnL = calculateUnrealizedPnL(position, currentPrice);
              const pnlPercent =
                position.market_exposure > 0
                  ? (unrealizedPnL / position.market_exposure) * 100
                  : 0;

              return (
                <tr key={`${position.ticker}-${position.side}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                    {position.market_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        position.side === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {position.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {position.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(position.avg_entry_price || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`text-sm font-semibold ${
                        unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {unrealizedPnL >= 0 ? "+" : ""}
                      {formatCurrency(unrealizedPnL)}
                      <span className="text-xs ml-1">
                        ({pnlPercent >= 0 ? "+" : ""}
                        {pnlPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatefulButton
                      onClick={async () => {
                        if (
                          confirm("Are you sure you want to close this position?")
                        ) {
                          // Simulate async close operation
                          await new Promise((resolve) => setTimeout(resolve, 500));
                          closePosition(position.ticker, position.side, currentPrice);
                        } else {
                          throw new Error("Cancelled");
                        }
                      }}
                      className="!px-4 !py-2 !text-sm"
                      successDuration={1000}
                    >
                      Close
                    </StatefulButton>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
