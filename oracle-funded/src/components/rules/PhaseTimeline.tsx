"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ViewfinderCircleIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

// Blueberry phase timeline (DESIGN.md):
// - Stages connected by a 1px border-white/10 line.
// - Completed: #12DFBA dot + 1px border-[#12DFBA]/40.
// - Current: #7F24FF dot + pulsing 2s box-shadow ring (motion-safe).
// - Upcoming: bg-white/10 dot, no border.
// - Each stage sits on a surface card; hover ascends to surface-2.

type StageState = "completed" | "current" | "upcoming";

interface PhaseData {
  title: string;
  description: string;
  items: string[];
  state: StageState;
  icon: React.ElementType;
}

const phases: PhaseData[] = [
  {
    title: "Phase 1: Evaluation",
    description: "Demonstrate your trading skills",
    icon: ViewfinderCircleIcon,
    state: "current",
    items: [
      "Profit Target: 8% of account size",
      "Daily Loss Limit: 5% of account size",
      "Max Drawdown: 10% of account size",
      "Minimum Trading Days: 10 days",
      "Maximum 25% of account on single market",
    ],
  },
  {
    title: "Phase 2: Verification",
    description: "Prove consistency in your approach",
    icon: ShieldCheckIcon,
    state: "upcoming",
    items: [
      "Same rules as Phase 1",
      "Prove consistency in trading approach",
      "Complete at least 10 trading days",
      "Maintain risk management discipline",
    ],
  },
  {
    title: "Funded Trader",
    description: "Start earning real profits",
    icon: ArrowTrendingUpIcon,
    state: "upcoming",
    items: [
      "80/20 profit split (you keep 80%)",
      "Bi-weekly payouts",
      "Minimum withdrawal: $100",
      "Same risk rules apply",
      "Scale up to larger accounts",
    ],
  },
];

function stageDot(state: StageState): string {
  if (state === "completed") return "bg-[#12DFBA] border border-[#12DFBA]/40";
  if (state === "current") return "bg-[#7F24FF]";
  return "bg-white/10";
}

function stageBadge(state: StageState): { bg: string; text: string } {
  if (state === "completed")
    return { bg: "bg-[#12DFBA]/15", text: "text-[#12DFBA]" };
  if (state === "current")
    return { bg: "bg-[#7F24FF]/15", text: "text-[#A769FF]" };
  return { bg: "bg-white/[0.06]", text: "text-white/55" };
}

export const PhaseTimeline = () => {
  return (
    <div className="relative">
      {/* Desktop horizontal connector — 1px line-white/10 per DESIGN.md. */}
      <div className="hidden lg:block absolute top-[34px] left-0 right-0 px-[16.66%] z-0">
        <div className="h-px bg-white/10" />
      </div>

      {/* Mobile vertical connector */}
      <div className="lg:hidden absolute top-0 bottom-0 left-[14px] w-px bg-white/10 z-0" />

      {/* Phase cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative z-10">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const badge = stageBadge(phase.state);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.4,
                delay: Math.min(index, 8) * 0.03,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="relative"
            >
              {/* Stage marker — top on desktop, left on mobile. */}
              <div className="absolute lg:top-0 lg:left-1/2 lg:-translate-x-1/2 top-4 left-0 lg:translate-y-0 flex items-center justify-center">
                <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                  {phase.state === "current" && (
                    // 2s pulsing ring around the active stage. motion-safe so
                    // reduced-motion users see a static dot.
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full motion-safe:animate-[bb-stage-pulse_2000ms_ease-in-out_infinite]"
                      style={{
                        boxShadow: "0 0 0 0 rgba(127,36,255,0.55)",
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full ring-4 ring-[#0C0319]",
                      stageDot(phase.state),
                    )}
                  />
                </div>
              </div>

              {/* Card body */}
              <div className="pl-10 lg:pl-0 lg:pt-10">
                <motion.div
                  whileHover={{ y: -1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="h-full p-6 rounded-xl border border-white/10 bg-[#180630] hover:bg-[#1f0a3d] hover:border-white/[0.18] transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  <div className="space-y-4">
                    {/* Phase tag */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-full",
                          badge.bg,
                          badge.text,
                        )}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {index === 2 ? "FINAL" : `PHASE ${index + 1}`}
                      </span>
                    </div>

                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className={cn("inline-flex p-2 rounded-lg", badge.bg)}>
                        <Icon className={cn("w-5 h-5", badge.text)} />
                      </div>
                      <div className="flex-1">
                        <h3
                          className="text-lg font-semibold text-white tracking-[-0.01em]"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {phase.title}
                        </h3>
                        <p className="text-sm text-white/65 mt-1">
                          {phase.description}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <ul className="space-y-2">
                      {phase.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-3">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full mt-[7px] shrink-0",
                              phase.state === "completed"
                                ? "bg-[#12DFBA]"
                                : phase.state === "current"
                                  ? "bg-[#A769FF]"
                                  : "bg-white/30",
                            )}
                          />
                          <span className="text-sm text-white/85 leading-relaxed">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
