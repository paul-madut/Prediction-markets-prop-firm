"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BoltIcon,
  CheckIcon,
  ShieldCheckIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/16/solid";
import { ChallengeType, ChallengePlan } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Blueberry ChallengeTypeCard (DESIGN.md):
// - Cards live on `surface` and ascend to `surface-2` on hover (translateY -1).
// - The selected card carries the single primary glow for this viewport
//   plus the inset-1px primary edge — the "recommended" treatment.
// - Pricing block, icon, and badges all draw from the brand palette only.
//   The `accentColor` prop on ChallengeType is honoured *only* by mapping
//   to existing primary / mint / warning tones (no new hues).

const RESPONSIVE = { type: "spring" as const, stiffness: 300, damping: 30 };
const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

interface ChallengeTypeCardProps {
  challengeType: ChallengeType;
  availablePlans: ChallengePlan[];
  selectedPlan: ChallengePlan | null;
  onSelectPlan: (plan: ChallengePlan) => void;
  isSelected: boolean;
  selectedAccountSize: number;
}

// Map the `accentColor` enum to the actual Blueberry palette.
function paletteFor(accent: ChallengeType["accentColor"]) {
  if (accent === "orange") {
    // warning tone — reserved for "fast / lower commitment" challenge
    return {
      badgeBg: "bg-[#FFB539]/14",
      badgeText: "text-[#FFB539]",
      iconBg: "bg-[#FFB539]/14",
    };
  }
  if (accent === "purple") {
    return {
      badgeBg: "bg-[#A769FF]/18",
      badgeText: "text-[#A769FF]",
      iconBg: "bg-[#A769FF]/18",
    };
  }
  // default — primary purple
  return {
    badgeBg: "bg-[#7F24FF]/18",
    badgeText: "text-[#A769FF]",
    iconBg: "bg-[#7F24FF]/18",
  };
}

export const ChallengeTypeCard = ({
  challengeType,
  availablePlans,
  selectedPlan: _selectedPlan,
  onSelectPlan,
  isSelected,
  selectedAccountSize,
}: ChallengeTypeCardProps) => {
  // Find current plan based on selected account size (passed from parent)
  const currentPlan = availablePlans.find(
    (p) => p.accountSize === selectedAccountSize,
  );

  const palette = paletteFor(challengeType.accentColor);

  const PhaseIcon =
    challengeType.phases === 1
      ? BoltIcon
      : challengeType.phases === 2
        ? ViewfinderCircleIcon
        : ShieldCheckIcon;

  // Selected = recommended in this viewport → owns the single primary glow
  // + inset edge per DESIGN.md elevation rules.
  const recommendedStyle: React.CSSProperties = isSelected
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
        isSelected
          ? "bg-[#1f0a3d] border-transparent"
          : "bg-[#180630] border-white/10 hover:bg-[#1f0a3d] hover:border-white/[0.18]",
      )}
      style={recommendedStyle}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em]",
              palette.badgeBg,
              palette.badgeText,
            )}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            <PhaseIcon className="w-3.5 h-3.5" />
            <span>
              {challengeType.phases} {challengeType.phases === 1 ? "Phase" : "Phases"}
            </span>
          </div>

          <h3
            className="text-[20px] leading-7 font-semibold text-white tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {challengeType.name}
          </h3>
          <p className="text-sm text-white/65 leading-relaxed">
            {challengeType.description}
          </p>
        </div>

        {/* Pricing display */}
        {currentPlan ? (
          <div
            className={cn(
              "text-center py-5 rounded-lg border transition-colors duration-150",
              isSelected
                ? "bg-[#0C0319]/40 border-white/[0.18]"
                : "bg-[#0C0319]/40 border-white/10",
            )}
          >
            <div
              className="text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {formatCurrency(currentPlan.monthlyPrice)}
            </div>
            <div
              className="mt-1 text-[11px] uppercase tracking-[0.08em] text-white/55"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              one-time fee
            </div>
            <div className="mt-2 text-sm text-white/85 font-medium">
              Profit Target: {formatCurrency(currentPlan.profitTarget)}
            </div>
          </div>
        ) : (
          <div className="text-center py-5 rounded-lg bg-[#0C0319]/40 border border-white/10">
            <div className="text-sm text-white/55">
              Not available at this size
            </div>
          </div>
        )}

        {/* Features list — first row is the dynamic profit-target %. */}
        <div className="space-y-2.5">
          {currentPlan &&
            (() => {
              const pct =
                currentPlan.accountSize > 0
                  ? Math.round(
                      (currentPlan.profitTarget / currentPlan.accountSize) * 100,
                    )
                  : null;
              const label =
                pct !== null
                  ? `${pct}% profit target${challengeType.phases > 1 ? " per phase" : ""}`
                  : null;
              return label ? (
                <div className="flex items-start gap-2.5">
                  <div className={cn("inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0 mt-0.5", palette.iconBg)}>
                    <CheckIcon className={cn("w-3 h-3", palette.badgeText)} />
                  </div>
                  <span className="text-sm text-white/85">{label}</span>
                </div>
              ) : null;
            })()}
          {challengeType.features.slice(0, 3).map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="inline-flex w-5 h-5 rounded-full items-center justify-center shrink-0 mt-0.5 bg-white/[0.06]">
                <CheckIcon className="w-3 h-3 text-white/55" />
              </div>
              <span className="text-sm text-white/85">{feature}</span>
            </div>
          ))}
        </div>

        {/* Select button — primary on the recommended (selected) tier;
            secondary on the others. */}
        {isSelected ? (
          <motion.button
            onClick={() => currentPlan && onSelectPlan(currentPlan)}
            disabled={!currentPlan}
            whileTap={currentPlan ? { scale: 0.97 } : undefined}
            transition={SNAPPY}
            className={cn(
              "w-full h-11 rounded-lg text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              currentPlan
                ? "bg-[#7F24FF] hover:bg-[#A769FF] text-white"
                : "bg-white/[0.06] text-white/40 cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45",
            )}
          >
            Selected
          </motion.button>
        ) : (
          <motion.button
            onClick={() => currentPlan && onSelectPlan(currentPlan)}
            disabled={!currentPlan}
            whileTap={currentPlan ? { scale: 0.97 } : undefined}
            transition={SNAPPY}
            className={cn(
              "w-full h-11 rounded-lg text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              currentPlan
                ? "bg-white/[0.06] hover:bg-white/[0.08] text-white"
                : "bg-white/[0.06] text-white/40 cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45",
            )}
          >
            {currentPlan ? "Select plan" : "Unavailable"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
