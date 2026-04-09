"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { HistorySkeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const { trades } = useApp();
  const [filter, setFilter] = useState<"all" | "won" | "lost" | "sold">("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <HistorySkeleton />;

  const filteredTrades = trades.filter((trade) => {
    if (filter === "all") return true;
    return trade.result === filter;
  });

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All Trades" },
          { key: "won", label: "Wins" },
          { key: "lost", label: "Losses" },
          { key: "sold", label: "Open/Sold" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors text-sm sm:text-base ${
              filter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-3">
        {filteredTrades.map((trade) => (
          <div
            key={trade.tradeId}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {trade.market_title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      trade.side === "yes"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {trade.side.toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                      trade.result === "won"
                        ? "bg-green-100 text-green-800"
                        : trade.result === "lost"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {trade.result}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span
                  className={`text-sm font-bold ${
                    trade.pnl > 0
                      ? "text-green-600"
                      : trade.pnl < 0
                      ? "text-red-600"
                      : "text-gray-400"
                  }`}
                >
                  {trade.pnl > 0 ? "+" : ""}
                  {trade.pnl !== 0 ? formatCurrency(trade.pnl) : "Open"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Entry: {formatCurrency(trade.entryPrice)}</span>
              <span>Exit: {trade.exitPrice ? formatCurrency(trade.exitPrice) : "-"}</span>
              <span>{formatDate(trade.entryDate)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Side
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTrades.map((trade) => (
                <tr key={trade.tradeId} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.ticket}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {trade.market_title}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        trade.side === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {trade.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(trade.entryPrice)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.exitPrice ? formatCurrency(trade.exitPrice) : "-"}
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-semibold ${
                        trade.pnl > 0
                          ? "text-green-600"
                          : trade.pnl < 0
                          ? "text-red-600"
                          : "text-gray-400"
                      }`}
                    >
                      {trade.pnl > 0 ? "+" : ""}
                      {trade.pnl !== 0 ? formatCurrency(trade.pnl) : "Open"}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded capitalize ${
                        trade.result === "won"
                          ? "bg-green-100 text-green-800"
                          : trade.result === "lost"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {trade.result}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.entryDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
