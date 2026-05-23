"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ChallengePlan } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Blueberry pricing card (DESIGN.md):
// - Three-card row. Only the recommended tier emits the brand glow + lives
//   on `surface-2` with the inset 1px [#A769FF]/40 edge (one primary glow
//   per viewport).
// - Other tiers are plain `surface` cards. Hover ascends to `surface-2`
//   via `responsive` spring (translateY only).

const RESPONSIVE = { type: "spring" as const, stiffness: 300, damping: 30 };
const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

interface PricingCardProps {
  plan: ChallengePlan;
  isSelected: boolean;
  onSelect: () => void;
  recommended?: boolean;
}

export const PricingCard = ({
  plan,
  isSelected,
  onSelect,
  recommended = false,
}: PricingCardProps) => {
  // Inset border + brand glow per DESIGN.md elevation rules.
  // Inset 1px primary edge (#A769FF/25) + brand glow on the outside.
  const recommendedStyle: React.CSSProperties = recommended
    ? {
        boxShadow:
          "inset 0 0 0 1px rgba(167,105,255,0.40), 0 8px 24px -6px rgba(127,36,255,0.55)",
      }
    : {};

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={RESPONSIVE}
      className={cn(
        "relative h-full p-6 rounded-xl border transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
        recommended
          ? "bg-[#1f0a3d] border-transparent"
          : "bg-[#180630] border-white/10 hover:bg-[#1f0a3d] hover:border-white/[0.18]",
      )}
      style={recommendedStyle}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#7F24FF]/18 text-[#A769FF] text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Recommended
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3
          className="text-lg font-semibold text-white tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {formatCurrency(plan.accountSize)} Account
        </h3>
        <div
          className="mt-3 text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {formatCurrency(plan.monthlyPrice)}
        </div>
        <div
          className="mt-1 text-xs uppercase tracking-[0.08em] text-white/55"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          one-time fee
        </div>
      </div>

      <ul className="space-y-2.5 mb-6">
        {[
          `Profit Target: ${formatCurrency(plan.profitTarget)}`,
          `Max Positions: ${plan.maxPositions}`,
          `Daily Loss Limit: ${formatCurrency(plan.dailyLossLimit)}`,
          `Max Drawdown: ${formatCurrency(plan.maxDrawdown)}`,
          `Drawdown Mode: ${plan.drawdownMode}`,
          `Reset Fee: ${formatCurrency(plan.resetFee)}`,
          `Activation Fee: ${plan.activationFee ? "Yes" : "No"}`,
        ].map((row) => (
          <li key={row} className="flex items-start gap-2">
            <CheckIcon className="w-4 h-4 text-[#12DFBA] flex-shrink-0 mt-0.5" />
            <span className="text-sm text-white/85">{row}</span>
          </li>
        ))}
      </ul>

      {recommended ? (
        // Primary button — already inside a recommended card that holds the
        // single brand glow for this viewport.
        <motion.button
          type="button"
          onClick={onSelect}
          whileTap={{ scale: 0.97 }}
          transition={SNAPPY}
          className={cn(
            "w-full h-11 rounded-lg text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "bg-[#7F24FF] hover:bg-[#A769FF] text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45",
          )}
        >
          {isSelected ? "Selected" : "Choose plan"}
        </motion.button>
      ) : (
        // Secondary button — no glow.
        <motion.button
          type="button"
          onClick={onSelect}
          whileTap={{ scale: 0.97 }}
          transition={SNAPPY}
          className={cn(
            "w-full h-11 rounded-lg text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
            isSelected
              ? "bg-white/[0.08] text-white border border-white/[0.18]"
              : "bg-white/[0.06] hover:bg-white/[0.08] text-white border border-transparent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45",
          )}
        >
          {isSelected ? "Selected" : "Choose plan"}
        </motion.button>
      )}
    </motion.div>
  );
};
