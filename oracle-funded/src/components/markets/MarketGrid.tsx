"use client";

import React from "react";
import { Market } from "@/types";
import { MarketCard } from "./MarketCard";

interface MarketGridProps {
  markets: Market[];
  onMarketClick: (market: Market) => void;
}

export const MarketGrid = ({ markets, onMarketClick }: MarketGridProps) => {
  if (markets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No markets found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard
          key={market.ticker}
          market={market}
          onClick={() => onMarketClick(market)}
        />
      ))}
    </div>
  );
};
