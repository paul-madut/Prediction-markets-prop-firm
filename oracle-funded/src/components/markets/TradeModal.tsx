"use client";

import React, { useState } from "react";
import { Market } from "@/types";
import { useApp } from "@/context/AppContext";
import { formatCurrency } from "@/lib/formatters";
import { calculateShares, calculateTotalCost } from "@/lib/calculations";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TradeModalProps {
  market: Market;
  isOpen: boolean;
  onClose: () => void;
}

export const TradeModal = ({ market, isOpen, onClose }: TradeModalProps) => {
  const { executeTrade, user } = useApp();
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [stakeAmount, setStakeAmount] = useState<string>("100");

  if (!isOpen) return null;

  const price = side === "yes" ? market.yes_ask : market.no_ask;
  const stakeCents = parseFloat(stakeAmount || "0") * 100;
  const shares = calculateShares(stakeCents, price);
  const totalCost = calculateTotalCost(shares, price);

  // Potential payout if correct (100 cents per share minus cost)
  const potentialProfit = shares * (100 - price) - totalCost;
  const potentialLoss = -totalCost;

  const handleTrade = () => {
    const success = executeTrade(market.ticker, side, shares);
    if (success) {
      alert("Trade executed successfully!");
      onClose();
      setStakeAmount("100");
      setSide("yes");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{market.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Prices */}
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

          {/* Side Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Side
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSide("yes")}
                className={`p-4 rounded-lg font-semibold transition-colors ${
                  side === "yes"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                BUY YES
              </button>
              <button
                onClick={() => setSide("no")}
                className={`p-4 rounded-lg font-semibold transition-colors ${
                  side === "no"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                BUY NO
              </button>
            </div>
          </div>

          {/* Stake Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stake Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 rounded transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Summary */}
          <div className="bg-gray-50 dark:bg-slate-950 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Shares</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{shares}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Price per share</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">Total cost (incl. fees)</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(totalCost)}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-800 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Potential profit</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(potentialProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Potential loss</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(potentialLoss)}
                </span>
              </div>
            </div>
          </div>

          {/* Place Trade Button */}
          <button
            onClick={handleTrade}
            disabled={shares === 0 || totalCost > user.accountBalance}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors"
          >
            {totalCost > user.accountBalance
              ? "Insufficient Balance"
              : `Place Trade - ${formatCurrency(totalCost)}`}
          </button>

          {/* Market Details */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Market Details</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{market.subtitle || market.title}</p>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Category:</span>
                <span className="ml-2 font-semibold">{market.category}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="ml-2 font-semibold capitalize">{market.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
