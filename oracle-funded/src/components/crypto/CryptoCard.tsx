"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { CryptoSymbol, Expiry } from "@/data/mockCrypto";
import { cn } from "@/lib/utils";

interface CryptoCardProps {
  data: CryptoSymbol;
  livePrice: number;
  upPriceCents: number;        // 1-99 — premium for "Up" bet
  downPriceCents: number;      // 1-99 — premium for "Down" bet
  expiry: Expiry;
  active: boolean;
  onSelect: () => void;
  onUp: () => void;
  onDown: () => void;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 10) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return p.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function CryptoCard({
  data,
  livePrice,
  upPriceCents,
  downPriceCents,
  expiry,
  active,
  onSelect,
  onUp,
  onDown,
}: CryptoCardProps) {
  const positive = data.change24hPct >= 0;
  const pct = (data.change24hPct * 100).toFixed(2);

  return (
    <motion.div
      onClick={onSelect}
      layout
      className={cn(
        "bg-white dark:bg-slate-900 rounded-xl border p-4 cursor-pointer transition-all",
        active ? "border-blue-600 shadow-md" : "border-gray-200 dark:border-slate-800 hover:shadow-sm",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-gray-100">{data.symbol}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{data.activeMarkets} markets</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data.name}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">${formatPrice(livePrice)}</div>
          <div className={cn("text-xs font-semibold tabular-nums", positive ? "text-green-600" : "text-red-600")}>
            {positive ? "+" : ""}{pct}% (24h)
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Will <span className="font-semibold">{data.symbol}</span> be Up or Down in <span className="font-semibold">{expiry}</span>?
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onUp(); }}
          className="flex items-center justify-center gap-1 py-2.5 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors"
        >
          <ArrowUpIcon className="w-4 h-4 text-green-700" />
          <span className="text-sm font-bold text-green-700 tabular-nums">UP {upPriceCents}¢</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDown(); }}
          className="flex items-center justify-center gap-1 py-2.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
        >
          <ArrowDownIcon className="w-4 h-4 text-red-700" />
          <span className="text-sm font-bold text-red-700 tabular-nums">DOWN {downPriceCents}¢</span>
        </button>
      </div>
    </motion.div>
  );
}
