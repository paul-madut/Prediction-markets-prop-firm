"use client";

import React from "react";
import { motion } from "framer-motion";
import { Market } from "@/types";
import { formatVolume, formatDate } from "@/lib/formatters";
import { ArrowTrendingUpIcon } from "@heroicons/react/24/outline";
import { springs } from "./motion";

interface MarketCardProps {
  market: Market;
  onClick: () => void;
}

export const MarketCard = ({ market, onClick }: MarketCardProps) => {
  const yesPercentage = market.yes_ask;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      transition={springs.responsive}
      className="group w-full text-left bg-[#180630] hover:bg-[#1f0a3d] border border-white/10 hover:border-white/[0.18] rounded-xl p-6 transition-colors"
    >
      {/* Header: ticker + featured flag */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/85">
          {market.ticker}
        </span>
        {market.featured && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-[#FFB539]">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            Featured
          </span>
        )}
      </div>

      {/* Category pill */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[12px] font-semibold tracking-wide bg-white/[0.06] text-white/85">
          {market.category}
        </span>
      </div>

      {/* Market title */}
      <h3 className="text-[14px] leading-5 font-medium text-white/85 mb-4 line-clamp-2 min-h-[2.5rem]">
        {market.title}
      </h3>

      {/* YES probability */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">
            Yes
          </span>
          <span className="text-2xl font-mono font-semibold text-white tabular-nums">
            {yesPercentage}%
          </span>
        </div>
        <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-[#7F24FF] h-1.5 rounded-full transition-[width] duration-200"
            style={{ width: `${yesPercentage}%` }}
          />
        </div>
      </div>

      {/* Market info */}
      <div className="space-y-1.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-white/55">Volume</span>
          <span className="font-mono tabular-nums text-white/85">
            {formatVolume(market.volume)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/55">Closes</span>
          <span className="font-mono tabular-nums text-white/85">
            {formatDate(market.close_time)}
          </span>
        </div>
      </div>
    </motion.button>
  );
};
