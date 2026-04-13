"use client";

import React from "react";
import { Market } from "@/types";
import { formatVolume, formatDate } from "@/lib/formatters";
import { ArrowTrendingUpIcon } from "@heroicons/react/16/solid";

interface MarketCardProps {
  market: Market;
  onClick: () => void;
}

export const MarketCard = ({ market, onClick }: MarketCardProps) => {
  const yesPercentage = market.yes_ask;
  const noPercentage = 100 - market.yes_ask;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-200 hover:scale-[1.02] transition-all duration-200 text-left"
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
          {market.category}
        </span>
        {market.featured && (
          <span className="flex items-center gap-1 text-xs text-orange-600">
            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            Featured
          </span>
        )}
      </div>

      {/* Market Question */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
        {market.title}
      </h3>

      {/* YES Probability */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-blue-600 mb-2">
          YES: {yesPercentage}%
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${yesPercentage}%` }}
          />
        </div>
      </div>

      {/* Market Info */}
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Volume:</span>
          <span className="font-semibold">{formatVolume(market.volume)}</span>
        </div>
        <div className="flex justify-between">
          <span>Closes:</span>
          <span className="font-semibold">{formatDate(market.close_time)}</span>
        </div>
      </div>
    </button>
  );
};
