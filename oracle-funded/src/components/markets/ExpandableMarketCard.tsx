"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Market } from "@/types";
import { useApp } from "@/context/AppContext";
import { formatVolume, formatDate, formatCurrency } from "@/lib/formatters";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import { TrendingUp, BarChart3 } from "lucide-react";
import { StatefulButton } from "@/components/ui/stateful-button";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  market: Market;
  layoutId: string;
  onClick: () => void;
}

export const MarketCard = ({ market, layoutId, onClick }: MarketCardProps) => {
  const yesPercentage = market.yes_ask;

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex flex-col gap-4">
        {/* Image and Category Row */}
        <div className="flex items-start gap-3">
          {/* Market Image */}
          <motion.div
            layoutId={`image-${market.ticker}-${layoutId}`}
            className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
          >
            {market.image ? (
              <Image
                src={market.image}
                alt={market.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            )}
          </motion.div>

          <div className="flex-1 flex items-center justify-between">
            <motion.span
              layoutId={`category-${market.ticker}-${layoutId}`}
              className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800"
            >
              {market.category}
            </motion.span>
            {market.featured && (
              <motion.span
                layoutId={`featured-${market.ticker}-${layoutId}`}
                className="flex items-center gap-1 text-xs text-orange-600"
              >
                <TrendingUp size={14} />
                Featured
              </motion.span>
            )}
          </div>
        </div>

        {/* Market Title */}
        <motion.h3
          layoutId={`title-${market.ticker}-${layoutId}`}
          className="text-lg font-semibold text-gray-900 line-clamp-2"
        >
          {market.title}
        </motion.h3>

        {/* YES Probability */}
        <div>
          <motion.div
            layoutId={`probability-${market.ticker}-${layoutId}`}
            className="text-3xl font-bold text-blue-600 mb-2"
          >
            YES: {yesPercentage}%
          </motion.div>
          <div className="w-full bg-gray-200 rounded-full h-2">
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
      </div>
    </motion.div>
  );
};

interface MarketModalProps {
  market: Market;
  layoutId: string;
  onClose: () => void;
}

export const MarketModal = ({ market, layoutId, onClose }: MarketModalProps) => {
  const { executeTrade, user } = useApp();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [stakeAmount, setStakeAmount] = useState<string>("100");

  const price = side === "yes" ? market.yes_ask : market.no_ask;
  const stakeCents = parseFloat(stakeAmount || "0") * 100;
  const shares = calculateShares(stakeCents, price);
  const totalCost = calculateTotalCost(shares, price);

  const potentialProfit = shares * (100 - price) - totalCost;
  const potentialLoss = -totalCost;

  const handleTrade = async () => {
    const success = executeTrade(market.ticker, side, shares);
    if (success) {
      setStakeAmount("100");
      setSide("yes");
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      throw new Error("Insufficient balance");
    }
  };

  return (
    <motion.div
      layoutId={layoutId}
      className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl overflow-y-auto shadow-2xl"
    >
      {/* Header with Image, Category and Featured */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start gap-4 mb-4">
          {/* Market Image */}
          <motion.div
            layoutId={`image-${market.ticker}-${layoutId}`}
            className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
          >
            {market.image ? (
              <Image
                src={market.image}
                alt={market.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            )}
          </motion.div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <motion.span
                layoutId={`category-${market.ticker}-${layoutId}`}
                className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800"
              >
                {market.category}
              </motion.span>
              {market.featured && (
                <motion.span
                  layoutId={`featured-${market.ticker}-${layoutId}`}
                  className="flex items-center gap-1 text-xs text-orange-600"
                >
                  <TrendingUp size={14} />
                  Featured
                </motion.span>
              )}
            </div>

            <motion.h2
              layoutId={`title-${market.ticker}-${layoutId}`}
              className="text-2xl font-bold text-gray-900"
            >
              {market.title}
            </motion.h2>
          </div>
        </div>

        <motion.div
          layoutId={`probability-${market.ticker}-${layoutId}`}
          className="text-4xl font-bold text-blue-600 mt-4"
        >
          YES: {market.yes_ask}%
        </motion.div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Current Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">YES</div>
            <div className="text-2xl font-bold text-green-900">
              {market.yes_ask}%
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-sm text-red-700 mb-1">NO</div>
            <div className="text-2xl font-bold text-red-900">
              {market.no_ask}%
            </div>
          </div>
        </div>

        {/* Side Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Side
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSide("yes")}
              className={cn(
                "p-4 rounded-lg font-semibold transition-colors",
                side === "yes"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              BUY YES
            </button>
            <button
              onClick={() => setSide("no")}
              className={cn(
                "p-4 rounded-lg font-semibold transition-colors",
                side === "no"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              BUY NO
            </button>
          </div>
        </div>

        {/* Stake Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stake Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              $
            </span>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
              min="1"
              max={user.accountBalance / 100}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[50, 100, 250, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => setStakeAmount(amount.toString())}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shares</span>
            <span className="font-semibold text-gray-900">{shares}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Price per share</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(price)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total cost (incl. fees)</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Potential profit</span>
              <span className="font-semibold text-green-600">
                +{formatCurrency(potentialProfit)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Potential loss</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(potentialLoss)}
              </span>
            </div>
          </div>
        </div>

        {/* Place Trade Button */}
        <StatefulButton
          onClick={handleTrade}
          disabled={shares === 0 || totalCost > user.accountBalance}
          className="w-full py-4"
        >
          {totalCost > user.accountBalance
            ? "Insufficient Balance"
            : `Place Trade - ${formatCurrency(totalCost)}`}
        </StatefulButton>

        {/* Market Details */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Market Details</h3>
          <p className="text-sm text-gray-600">
            {market.subtitle || market.title}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Volume:</span>
              <span className="ml-2 font-semibold">{formatVolume(market.volume)}</span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className="ml-2 font-semibold capitalize">
                {market.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
