"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Event, Market } from "@/types";
// Trade execution from this modal is not yet wired against /api/orders;
// it surfaces a "coming soon" notice instead. Real fills happen via
// POST /api/orders today (Phase 4) — UI hookup is a future turn.
import { formatVolume, formatDate, formatCurrency } from "@/lib/formatters";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";
import { springs } from "./motion";

interface MarketCardProps {
  event: Event;
  onClick: () => void;
}

export const MarketCard = ({ event, onClick }: MarketCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isMulti = event.outcomes.length > 1;
  const primary = event.outcomes[0];
  const topOutcomes = useMemo(
    () => [...event.outcomes].sort((a, b) => b.yes_ask - a.yes_ask).slice(0, 3),
    [event.outcomes],
  );
  const remaining = event.outcomes.length - topOutcomes.length;

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ y: -1 }}
      transition={springs.responsive}
      className="group bg-[#180630] hover:bg-[#1f0a3d] border border-white/10 hover:border-white/[0.18] rounded-xl p-6 cursor-pointer h-full flex flex-col transition-colors"
    >
      <motion.div layout="position" className="flex flex-col gap-4 flex-1">
        {/* Header: image + ticker + featured flag */}
        <div className="flex items-start gap-3">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1f0a3d]">
            {event.image ? (
              <Image
                src={event.image}
                alt={event.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#A769FF] to-[#7F24FF] flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/85 truncate">
              {event.eventTicker}
            </span>
            {event.featured && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#FFB539] flex-shrink-0">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Category pill */}
        <div>
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[12px] font-semibold tracking-wide bg-white/[0.06] text-white/85">
            {event.category}
          </span>
        </div>

        {/* Title — fixed 2-line height so cards align even when titles are short */}
        <h3 className="text-[14px] leading-5 font-medium text-white/85 line-clamp-2 min-h-[2.5rem]">
          {event.title}
        </h3>

        {/* Body: binary YES% or multi-outcome list — fixed slot keeps card heights uniform */}
        <div className="min-h-[7.5rem] flex flex-col justify-center">
          {isMulti ? (
            <div className="space-y-2.5">
              {topOutcomes.map((o) => (
                <div key={o.ticker} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[13px] gap-2">
                      <span className="text-white/85 truncate">
                        {o.outcome_label || o.title}
                      </span>
                      <span className="font-mono tabular-nums text-white font-semibold">
                        {o.yes_ask}%
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-1 mt-1.5 overflow-hidden">
                      <div
                        className="bg-[#7F24FF] h-1 rounded-full transition-[width] duration-200"
                        style={{ width: `${o.yes_ask}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {remaining > 0 && (
                <div className="text-[12px] font-mono text-white/55 pt-1 tabular-nums">
                  + {remaining} more outcomes
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">
                  Yes
                </span>
                <span className="text-3xl font-mono font-semibold text-white tabular-nums">
                  {primary.yes_ask}%
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#7F24FF] h-1.5 rounded-full transition-[width] duration-200"
                  style={{ width: `${primary.yes_ask}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer — pushed to bottom by flex-1 on body wrapper */}
        <div className="mt-auto space-y-1.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-white/55">Volume</span>
            <span className="font-mono tabular-nums text-white/85">
              {formatVolume(event.volume_total)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/55">Closes</span>
            <span className="font-mono tabular-nums text-white/85">
              {formatDate(event.close_time)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick-trade expandable panel (binary markets only). For multi-outcome
          events the detail page handles outcome selection — keeping inline
          quick-trade to binary keeps the card readable. */}
      {!isMulti && (
        <>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-white/45">
              {expanded ? "Hide quick-trade" : "Quick trade"}
            </span>
            <motion.button
              type="button"
              onClick={toggleExpand}
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
              aria-label={expanded ? "Collapse quick trade" : "Expand quick trade"}
              className="w-7 h-7 inline-flex items-center justify-center rounded-md text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={springs.snappy}
                className="inline-flex"
              >
                <ChevronDownIcon className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="quick-trade"
                layout
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={springs.gentle}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                  className="grid grid-cols-2 gap-2 pt-3"
                >
                  <QuickTradeButton
                    label="Yes"
                    price={primary.yes_ask}
                    tone="yes"
                  />
                  <QuickTradeButton
                    label="No"
                    price={primary.no_ask}
                    tone="no"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

function QuickTradeButton({
  label,
  price,
  tone,
}: {
  label: string;
  price: number;
  tone: "yes" | "no";
}) {
  const cls =
    tone === "yes"
      ? "bg-[#12DFBA]/[0.14] hover:bg-[#12DFBA]/[0.22] text-[#12DFBA]"
      : "bg-[#FF1C1C]/[0.14] hover:bg-[#FF1C1C]/[0.22] text-[#FF1C1C]";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      className={cn(
        "inline-flex items-center justify-between px-3 h-10 rounded-lg text-[13px] font-semibold transition-colors",
        cls,
      )}
    >
      <span>{label}</span>
      <span className="font-mono tabular-nums">{price}¢</span>
    </motion.button>
  );
}

interface MarketModalProps {
  event: Event;
  onClose: () => void;
}

export const MarketModal = ({ event }: MarketModalProps) => {
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
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 12 }}
      transition={springs.gentle}
      className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#1f0a3d] border border-white/10 rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6)" }}
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1f0a3d]">
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
              <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[12px] font-semibold bg-white/[0.06] text-white/85">
                {event.category}
              </span>
              {event.featured && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#FFB539]">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  Featured
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">{event.title}</h2>
            {isMulti && (
              <p className="text-[13px] text-white/55 mt-1">
                {event.outcomes.length} outcomes · pick one to trade
              </p>
            )}
          </div>
        </div>

        {!isMulti && (
          <div className="text-4xl font-mono font-semibold text-white tabular-nums mt-4">
            {market.yes_ask}%
            <span className="text-[12px] font-mono uppercase tracking-wider text-white/55 ml-3">
              Yes
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isMulti && (
          <div>
            <label className="block text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-2">
              Outcome
            </label>
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
                        ? "border-[#7F24FF] bg-[#7F24FF]/[0.18]"
                        : "border-white/10 hover:border-white/[0.18] hover:bg-white/[0.03]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-[14px]">
                        {o.outcome_label || o.title}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-[12px] text-white/55">
                          {o.yes_ask}¢
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-white">
                          {o.yes_ask}%
                        </span>
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
          <div className="bg-[#12DFBA]/[0.14] p-4 rounded-xl border border-[#12DFBA]/30">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#12DFBA] mb-1">
              Yes
            </div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-[#12DFBA]">
              {market.yes_ask}%
            </div>
          </div>
          <div className="bg-[#FF1C1C]/[0.14] p-4 rounded-xl border border-[#FF1C1C]/30">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#FF1C1C] mb-1">
              No
            </div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-[#FF1C1C]">
              {market.no_ask}%
            </div>
          </div>
        </div>

        {/* Side */}
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-2">
            Select Side
          </label>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
              onClick={() => setSide("yes")}
              className={cn(
                "p-4 rounded-lg text-[14px] font-semibold transition-colors",
                side === "yes"
                  ? "bg-[#12DFBA]/[0.22] text-[#12DFBA]"
                  : "bg-white/[0.06] text-white/85 hover:bg-white/[0.1]",
              )}
            >
              Buy Yes
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={springs.snappy}
              onClick={() => setSide("no")}
              className={cn(
                "p-4 rounded-lg text-[14px] font-semibold transition-colors",
                side === "no"
                  ? "bg-[#FF1C1C]/[0.22] text-[#FF1C1C]"
                  : "bg-white/[0.06] text-white/85 hover:bg-white/[0.1]",
              )}
            >
              Buy No
            </motion.button>
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="block text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-2">
            Stake Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/55 font-mono">
              $
            </span>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full pl-8 pr-4 h-11 bg-white/[0.04] focus:bg-white/[0.06] border border-transparent text-white font-mono tabular-nums rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7F24FF]/45"
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
                className="px-3 h-9 text-[13px] font-mono tabular-nums bg-white/[0.06] hover:bg-white/[0.1] text-white/85 rounded-md transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#0C0319] border border-white/10 rounded-xl p-4 space-y-2">
          <SummaryRow label="Shares" value={String(shares)} />
          <SummaryRow label="Price per share" value={formatCurrency(price)} />
          <SummaryRow label="Total cost (incl. fees)" value={formatCurrency(totalCost)} />
          <div className="border-t border-white/10 pt-2 mt-2 space-y-2">
            <SummaryRow
              label="Potential profit"
              value={`+${formatCurrency(potentialProfit)}`}
              tone="success"
            />
            <SummaryRow
              label="Potential loss"
              value={formatCurrency(potentialLoss)}
              tone="danger"
            />
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

        <div className="pt-4 border-t border-white/10">
          <h3 className="text-[14px] font-semibold text-white mb-2">Market Details</h3>
          <p className="text-[13px] text-white/75 leading-5">
            {event.resolution_criteria || event.subtitle || event.title}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-white/55">Volume</span>
              <span className="font-mono tabular-nums text-white/85">
                {formatVolume(event.volume_total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/55">Status</span>
              <span className="text-white/85 capitalize">{market.status}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-[#12DFBA]"
      : tone === "danger"
        ? "text-[#FF1C1C]"
        : "text-white";
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-white/55">{label}</span>
      <span className={cn("font-mono tabular-nums font-semibold", toneCls)}>
        {value}
      </span>
    </div>
  );
}
