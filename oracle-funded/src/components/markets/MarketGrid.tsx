"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Market } from "@/types";
import { MarketCard } from "./MarketCard";
import { springs } from "./motion";

interface MarketGridProps {
  markets: Market[];
  onMarketClick: (market: Market) => void;
}

export const MarketGrid = ({ markets, onMarketClick }: MarketGridProps) => {
  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/55 text-[14px]">No markets found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {markets.map((market, i) => (
          <motion.div
            key={market.ticker}
            layout
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              ...springs.responsive,
              // Cap stagger at 8 cards per DESIGN.md › List stagger.
              delay: Math.min(i * 0.03, 0.24),
            }}
          >
            <MarketCard market={market} onClick={() => onMarketClick(market)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
