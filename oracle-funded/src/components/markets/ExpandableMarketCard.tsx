"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Event, Market } from "@/types";
// Trade execution from this modal is not yet wired against /api/orders;
// it surfaces a "coming soon" notice instead. Real fills happen via
// POST /api/orders today (Phase 4) — UI hookup is a future turn.
import { formatVolume, formatDate, formatCurrency } from "@/lib/formatters";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import { ArrowTrendingUpIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  event: Event;
  onClick: () => void;
}

export const MarketCard = ({ event, onClick }: MarketCardProps) => {
  const isMulti = event.outcomes.length > 1;
  const primary = event.outcomes[0];
  const topOutcomes = useMemo(
    () => [...event.outcomes].sort((a, b) => b.yes_ask - a.yes_ask).slice(0, 3),
    [event.outcomes],
  );
  const remaining = event.outcomes.length - topOutcomes.length;

  return (
    <div
      onClick={onClick}
      className="bg-[#180630] rounded-lg shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col"
    >
      <div className="flex flex-col gap-3 sm:gap-4 flex-1">
        {/* Header: image + category + featured */}
        <div className="flex items-start gap-3">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#1f0a3d]">
            {event.image ? (
              <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#A769FF] to-[#7F24FF] flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-between">
            <span className="px-2 py-1 text-xs font-semibold rounded bg-[#7F24FF]/15 text-blue-800">
              {event.category}
            </span>
            {event.featured && (
              <span className="flex items-center gap-1 text-xs text-orange-600">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Title — fixed 2-line height so cards align even when titles are short */}
        <h3 className="text-base sm:text-lg font-semibold text-white line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem]">
          {event.title}
        </h3>

        {/* Body: binary YES% or multi-outcome list — fixed slot keeps card heights uniform */}
        <div className="min-h-[7.5rem] flex flex-col justify-center">
          {isMulti ? (
            <div className="space-y-2">
              {topOutcomes.map((o) => (
                <div key={o.ticker} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white truncate pr-2">
                        {o.outcome_label || o.title}
                      </span>
                      <span className="font-bold text-[#A769FF] tabular-nums">{o.yes_ask}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-[#7F24FF] h-1.5 rounded-full transition-all"
                        style={{ width: `${o.yes_ask}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {remaining > 0 && (
                <div className="text-xs text-white/55 pt-1">+ {remaining} more outcomes</div>
              )}
            </div>
          ) : (
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#A769FF] mb-2">
                YES: {primary.yes_ask}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#7F24FF] h-2 rounded-full transition-all"
                  style={{ width: `${primary.yes_ask}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer — pushed to bottom by flex-1 on body wrapper */}
        <div className="mt-auto space-y-1 text-sm text-white/75">
          <div className="flex justify-between">
            <span>Volume:</span>
            <span className="font-semibold">{formatVolume(event.volume_total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Closes:</span>
            <span className="font-semibold">{formatDate(event.close_time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MarketModalProps {
  event: Event;
  onClose: () => void;
}

export const MarketModal = ({ event, onClose }: MarketModalProps) => {
  const [selectedTicker, setSelectedTicker] = useState<string>(event.outcomes[0].ticker);
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [stakeAmount, setStakeAmount] = useState<string>("100");

  const market: Market =
    event.outcomes.find((o) => o.ticker === selectedTicker) || event.outcomes[0];
  const isMulti = event.outcomes.length > 1;

  const price = side === "yes" ? market.yes_ask : market.no_ask;
  const stakeCents = parseFloat(stakeAmount || "0") * 100;
  const shares = calculateShares(stakeCents, price);
  const totalCost = calculateTotalCost(shares, price);

  const potentialProfit = shares * (100 - price) - totalCost;
  const potentialLoss = -totalCost;

  // Placeholder: real fills go through POST /api/orders (Phase 4). Until
  // the modal is wired to that route, surface a coming-soon notice.
  const handleTrade = async () => {
    alert(
      "Trade panel is being wired against /api/orders. For now use the route directly with: { accountId, venue, externalMarketId, side, action, sizeContracts, idempotencyKey }",
    );
  };
  const user = null as unknown as { accountBalance: number } | null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#180630] rounded-2xl sm:rounded-3xl overflow-y-auto shadow-2xl"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#1f0a3d]">
            {event.image ? (
              <Image src={event.image} alt={event.title} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#A769FF] to-[#7F24FF] flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 text-xs font-semibold rounded bg-[#7F24FF]/15 text-blue-800">
                {event.category}
              </span>
              {event.featured && (
                <span className="flex items-center gap-1 text-xs text-orange-600">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  Featured
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white">{event.title}</h2>
            {isMulti && (
              <p className="text-sm text-white/55 mt-1">
                {event.outcomes.length} outcomes · pick one to trade
              </p>
            )}
          </div>
        </div>

        {!isMulti && (
          <div className="text-3xl sm:text-4xl font-bold text-[#A769FF] mt-4">
            YES: {market.yes_ask}%
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
        {isMulti && (
          <div>
            <label className="block text-sm font-medium text-white/85 mb-2">Outcome</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {event.outcomes.map((o) => {
                const active = o.ticker === selectedTicker;
                return (
                  <button
                    key={o.ticker}
                    onClick={() => setSelectedTicker(o.ticker)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      active
                        ? "border-[#7F24FF] bg-[#7F24FF]/10"
                        : "border-gray-200 dark:border-white/10 hover:bg-[#0C0319] dark:hover:bg-[#1f0a3d]/50",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">
                        {o.outcome_label || o.title}
                      </span>
                      <div className="flex items-center gap-3 tabular-nums">
                        <span className="text-xs text-white/55">{o.yes_ask}¢</span>
                        <span className="font-bold text-[#A769FF]">{o.yes_ask}%</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Yes/No prices */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">YES</div>
            <div className="text-2xl font-bold text-green-900">{market.yes_ask}%</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">NO</div>
            <div className="text-2xl font-bold text-red-900">{market.no_ask}%</div>
          </div>
        </div>

        {/* Side */}
        <div>
          <label className="block text-sm font-medium text-white/85 mb-2">Select Side</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSide("yes")}
              className={cn(
                "p-4 rounded-lg font-semibold transition-colors",
                side === "yes" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-[#1f0a3d] text-white/85 hover:bg-gray-200",
              )}
            >
              BUY YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={cn(
                "p-4 rounded-lg font-semibold transition-colors",
                side === "no" ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-[#1f0a3d] text-white/85 hover:bg-gray-200",
              )}
            >
              BUY NO
            </button>
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="block text-sm font-medium text-white/85 mb-2">Stake Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55">$</span>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-white/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7F24FF]"
              placeholder="100"
              min="1"
              max={user?.accountBalance ? (user?.accountBalance ?? 0) / 100 : undefined}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[50, 100, 250, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => setStakeAmount(amount.toString())}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-[#1f0a3d] hover:bg-gray-200 rounded transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#0C0319] dark:bg-[#0C0319] rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/75">Shares</span>
            <span className="font-semibold text-white">{shares}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/75">Price per share</span>
            <span className="font-semibold text-white">{formatCurrency(price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/75">Total cost (incl. fees)</span>
            <span className="font-semibold text-white">{formatCurrency(totalCost)}</span>
          </div>
          <div className="border-t border-gray-200 dark:border-white/10 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Potential profit</span>
              <span className="font-semibold text-green-600">+{formatCurrency(potentialProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/75">Potential loss</span>
              <span className="font-semibold text-red-600">{formatCurrency(potentialLoss)}</span>
            </div>
          </div>
        </div>

        <StatefulButton
          onClick={handleTrade}
          disabled={shares === 0 || totalCost > (user?.accountBalance ?? 0)}
          className="w-full py-4"
        >
          {totalCost > (user?.accountBalance ?? 0)
            ? "Insufficient Balance"
            : `Place Trade - ${formatCurrency(totalCost)}`}
        </StatefulButton>

        <div className="pt-4 border-t border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-white mb-2">Market Details</h3>
          <p className="text-sm text-white/75">
            {event.resolution_criteria || event.subtitle || event.title}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/55">Volume:</span>
              <span className="ml-2 font-semibold">{formatVolume(event.volume_total)}</span>
            </div>
            <div>
              <span className="text-white/55">Status:</span>
              <span className="ml-2 font-semibold capitalize">{market.status}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
