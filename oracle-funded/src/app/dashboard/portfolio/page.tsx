"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PortfolioSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { calculateUnrealizedPnL } from "@/lib/calculations";
import { StatefulButton } from "@/components/ui/stateful-button";
import {
  TextureCard,
  TextureCardContent,
} from "@/components/ui/texture-card";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, BriefcaseIcon, CurrencyDollarIcon, ChartBarIcon, ChartPieIcon, ArrowUpRightIcon, ArrowDownRightIcon } from "@heroicons/react/16/solid";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2"];

type Tab = "open" | "closed" | "history";

export default function PortfolioPage() {
  const { positions, markets, closePosition, user, trades } = useApp();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("open");

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <PortfolioSkeleton />;

  const closedTrades = trades.filter((t) => t.exitDate && t.exitType === "manual_sell");
  const historyTrades = [...trades]
    .filter((t) => t.exitDate)
    .sort((a, b) => (b.exitDate || "").localeCompare(a.exitDate || ""));

  const positionsWithData = positions.map((pos) => {
    const market = markets.find((m) => m.ticker === pos.ticker);
    const currentPrice = market
      ? pos.side === "yes"
        ? market.yes_ask
        : market.no_ask
      : 0;
    const unrealizedPnL = calculateUnrealizedPnL(pos, currentPrice);
    const pnlPercent =
      pos.market_exposure > 0 ? (unrealizedPnL / pos.market_exposure) * 100 : 0;

    return { ...pos, currentPrice, unrealizedPnL, pnlPercent };
  });

  const totalExposure = positionsWithData.reduce(
    (sum, pos) => sum + pos.market_exposure,
    0
  );
  const totalUnrealizedPnL = positionsWithData.reduce(
    (sum, pos) => sum + pos.unrealizedPnL,
    0
  );
  const totalPnLPercent =
    totalExposure > 0 ? (totalUnrealizedPnL / totalExposure) * 100 : 0;

  const winningPositions = positionsWithData.filter(
    (p) => p.unrealizedPnL > 0
  ).length;
  const losingPositions = positionsWithData.filter(
    (p) => p.unrealizedPnL < 0
  ).length;

  const allocationData = positionsWithData.map((pos, i) => ({
    name:
      pos.market_title.length > 25
        ? pos.market_title.substring(0, 25) + "..."
        : pos.market_title,
    value: pos.market_exposure / 100,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BriefcaseIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Positions</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {positions.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-green-600">{winningPositions} win</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-red-600">{losingPositions} loss</span>
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Exposure</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(totalExposure)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {totalExposure > 0
                ? `${((totalExposure / user.accountBalance) * 100).toFixed(1)}% of balance`
                : "No exposure"}
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${totalUnrealizedPnL >= 0 ? "bg-green-50" : "bg-red-50"} flex items-center justify-center`}
              >
                {totalUnrealizedPnL >= 0 ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                ) : (
                  <ArrowTrendingDownIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                )}
              </div>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Unrealized P&L</span>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold ${totalUnrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {totalUnrealizedPnL >= 0 ? "+" : ""}
              {formatCurrency(totalUnrealizedPnL)}
            </div>
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${totalPnLPercent >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {totalPnLPercent >= 0 ? (
                <ArrowUpRightIcon className="w-3 h-3" />
              ) : (
                <ArrowDownRightIcon className="w-3 h-3" />
              )}
              {totalPnLPercent >= 0 ? "+" : ""}
              {totalPnLPercent.toFixed(2)}%
            </div>
          </TextureCardContent>
        </TextureCard>

        <TextureCard>
          <TextureCardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Balance</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(user.accountBalance)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Start: {formatCurrency(user.startingBalance)}
            </div>
          </TextureCardContent>
        </TextureCard>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-1 inline-flex gap-1">
        <TabButton label={`Open (${positions.length})`} active={tab === "open"} onClick={() => setTab("open")} />
        <TabButton label={`Closed (${closedTrades.length})`} active={tab === "closed"} onClick={() => setTab("closed")} />
        <TabButton label={`History (${historyTrades.length})`} active={tab === "history"} onClick={() => setTab("history")} />
      </div>

      {tab !== "open" && (
        <TexturedTradesTable trades={tab === "closed" ? closedTrades : historyTrades} emptyLabel={tab === "closed" ? "No closed trades yet" : "No trade history yet"} />
      )}

      {/* Main Content */}
      {tab === "open" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className={positions.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          {positions.length === 0 ? (
            <TextureCard interactive={false}>
              <TextureCardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <BriefcaseIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Open Positions
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
                  Start trading on the Markets page to build your portfolio.
                </p>
                <a
                  href="/dashboard/markets"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  <ArrowTrendingUpIcon className="w-4 h-4" />
                  Browse Markets
                </a>
              </TextureCardContent>
            </TextureCard>
          ) : (
            <TextureCard interactive={false}>
              <TextureCardContent className="p-0">
                <div className="p-5 border-b border-gray-100 dark:border-slate-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Open Positions
                  </h3>
                </div>

                {/* Mobile card layout */}
                <div className="block lg:hidden divide-y divide-gray-100 dark:divide-slate-800">
                  {positionsWithData.map((position) => (
                    <div
                      key={`m-${position.ticker}-${position.side}`}
                      className="p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {position.market_title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                position.side === "yes"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {position.side.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {position.position} shares
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div
                            className={`text-sm font-bold ${
                              position.unrealizedPnL >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {position.unrealizedPnL >= 0 ? "+" : ""}
                            {formatCurrency(position.unrealizedPnL)}
                          </div>
                          <div
                            className={`text-xs ${
                              position.pnlPercent >= 0
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {position.pnlPercent >= 0 ? "+" : ""}
                            {position.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          Entry: {formatCurrency(position.avg_entry_price || 0)}
                        </span>
                        <span>
                          Current: {formatCurrency(position.currentPrice)}
                        </span>
                      </div>
                      <StatefulButton
                        onClick={async () => {
                          if (
                            confirm(
                              "Are you sure you want to close this position?"
                            )
                          ) {
                            await new Promise((resolve) =>
                              setTimeout(resolve, 500)
                            );
                            closePosition(
                              position.ticker,
                              position.side,
                              position.currentPrice
                            );
                          } else {
                            throw new Error("Cancelled");
                          }
                        }}
                        className="!w-full !py-2 !text-sm"
                        successDuration={1000}
                      >
                        Close Position
                      </StatefulButton>
                    </div>
                  ))}
                </div>

                {/* Desktop table layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Market
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Side
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Shares
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Entry
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Current
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          P&L
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {positionsWithData.map((position) => (
                        <tr
                          key={`d-${position.ticker}-${position.side}`}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-5 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-[240px] truncate">
                            {position.market_title}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
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
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {position.position}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(position.avg_entry_price || 0)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {formatCurrency(position.currentPrice)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  position.unrealizedPnL >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {position.unrealizedPnL >= 0 ? "+" : ""}
                                {formatCurrency(position.unrealizedPnL)}
                              </span>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  position.pnlPercent >= 0
                                    ? "bg-green-50 text-green-600"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {position.pnlPercent >= 0 ? "+" : ""}
                                {position.pnlPercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <StatefulButton
                              onClick={async () => {
                                if (
                                  confirm(
                                    "Are you sure you want to close this position?"
                                  )
                                ) {
                                  await new Promise((resolve) =>
                                    setTimeout(resolve, 500)
                                  );
                                  closePosition(
                                    position.ticker,
                                    position.side,
                                    position.currentPrice
                                  );
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </TextureCardContent>
            </TextureCard>
          )}
        </div>

        {/* Allocation Sidebar */}
        {positions.length > 0 && (
          <div className="space-y-6">
            <TextureCard interactive={false}>
              <TextureCardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChartPieIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Allocation
                  </h3>
                </div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number | undefined) => [
                          `$${(value ?? 0).toFixed(2)}`,
                          "Exposure",
                        ]}
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {allocationData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-300 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-gray-900 dark:text-gray-100 font-medium flex-shrink-0 ml-2">
                        ${item.value.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </TextureCardContent>
            </TextureCard>

            <TextureCard interactive={false}>
              <TextureCardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Position Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">YES positions</span>
                    <span className="text-sm font-medium text-green-600">
                      {positions.filter((p) => p.side === "yes").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">NO positions</span>
                    <span className="text-sm font-medium text-red-600">
                      {positions.filter((p) => p.side === "no").length}
                    </span>
                  </div>
                  <div className="h-px bg-gray-100 dark:bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Best position</span>
                    <span className="text-sm font-medium text-green-600">
                      {positionsWithData.length > 0
                        ? `+${formatCurrency(Math.max(...positionsWithData.map((p) => p.unrealizedPnL)))}`
                        : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Worst position</span>
                    <span className="text-sm font-medium text-red-600">
                      {positionsWithData.length > 0
                        ? formatCurrency(
                            Math.min(
                              ...positionsWithData.map((p) => p.unrealizedPnL)
                            )
                          )
                        : "--"}
                    </span>
                  </div>
                </div>
              </TextureCardContent>
            </TextureCard>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-4 py-1.5 text-sm font-semibold rounded-md transition-colors " +
        (active ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800")
      }
    >
      {label}
    </button>
  );
}

function TexturedTradesTable({ trades, emptyLabel }: { trades: ReturnType<typeof useApp>["trades"]; emptyLabel: string }) {
  if (trades.length === 0) {
    return (
      <TextureCard interactive={false}>
        <TextureCardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <BriefcaseIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{emptyLabel}</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Trades that resolve or are sold manually will show up here.
          </p>
        </TextureCardContent>
      </TextureCard>
    );
  }
  return (
    <TextureCard interactive={false}>
      <TextureCardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-950 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="text-left p-3 font-medium">Market</th>
              <th className="text-left p-3 font-medium">Side</th>
              <th className="text-right p-3 font-medium">Shares</th>
              <th className="text-right p-3 font-medium">Entry / Exit</th>
              <th className="text-right p-3 font-medium">P&L</th>
              <th className="text-right p-3 font-medium">Closed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {trades.map((t) => (
              <tr key={t.tradeId}>
                <td className="p-3 max-w-xs truncate text-gray-900 dark:text-gray-100 font-medium">{t.market_title}</td>
                <td className="p-3">
                  <span className={
                    "px-2 py-0.5 rounded text-xs font-semibold uppercase " +
                    (t.side === "yes" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")
                  }>
                    {t.side}
                  </span>
                </td>
                <td className="p-3 text-right tabular-nums">{t.shares}</td>
                <td className="p-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {t.entryPrice}¢ → {t.exitPrice ?? "—"}¢
                </td>
                <td className={"p-3 text-right tabular-nums font-semibold " + (t.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                  {t.pnl >= 0 ? "+" : ""}{formatCurrency(t.pnl)}
                </td>
                <td className="p-3 text-right text-gray-500 dark:text-gray-400">{t.exitDate ? new Date(t.exitDate).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TextureCardContent>
    </TextureCard>
  );
}
