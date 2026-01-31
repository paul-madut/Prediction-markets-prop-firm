"use client";

import React from "react";
import { motion } from "framer-motion";
import { Target, Shield, TrendingUp, ChevronRight } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { cn } from "@/lib/utils";

interface PhaseData {
  title: string;
  description: string;
  items: string[];
  accentColor: "blue" | "purple" | "green";
  icon: React.ElementType;
}

const phases: PhaseData[] = [
  {
    title: "Phase 1: Evaluation",
    description: "Demonstrate your trading skills",
    icon: Target,
    accentColor: "blue",
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
    icon: Shield,
    accentColor: "purple",
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
    icon: TrendingUp,
    accentColor: "green",
    items: [
      "80/20 profit split (you keep 80%)",
      "Bi-weekly payouts",
      "Minimum withdrawal: $100",
      "Same risk rules apply",
      "Scale up to larger accounts",
    ],
  },
];

const accentColors = {
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    border: "border-blue-200",
    spotlight: "rgba(59, 130, 246, 0.15)",
    spotlightBorder: "rgba(96, 165, 250, 0.4)",
    dot: "bg-blue-500",
    line: "from-blue-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    border: "border-purple-200",
    spotlight: "rgba(168, 85, 247, 0.15)",
    spotlightBorder: "rgba(192, 132, 252, 0.4)",
    dot: "bg-purple-500",
    line: "from-purple-500",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    border: "border-green-200",
    spotlight: "rgba(34, 197, 94, 0.15)",
    spotlightBorder: "rgba(74, 222, 128, 0.4)",
    dot: "bg-green-500",
    line: "from-green-500",
  },
};

export const PhaseTimeline = () => {
  return (
    <div className="relative">
      {/* Desktop Timeline Connector - Horizontal */}
      <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 px-[10%] z-0">
        <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"
          />
        </div>
      </div>

      {/* Mobile Timeline Connector - Vertical */}
      <div className="lg:hidden absolute top-0 bottom-0 left-6 md:left-1/2 md:-translate-x-1/2 w-1 z-0">
        <div className="relative h-full bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ height: "0%" }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500"
          />
        </div>
      </div>

      {/* Phase Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative z-10">
        {phases.map((phase, index) => {
          const colors = accentColors[phase.accentColor];
          const Icon = phase.icon;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
                ease: [0.21, 0.47, 0.32, 0.98],
              }}
              className="relative"
            >
              {/* Timeline Node - Desktop */}
              <div className="hidden lg:flex absolute -top-6 left-1/2 -translate-x-1/2 flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.15 + 0.3 }}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 border-white",
                    colors.dot
                  )}
                />
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: "1.5rem" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.15 + 0.4 }}
                  className={cn("w-0.5", colors.dot)}
                />
              </div>

              {/* Timeline Node - Mobile */}
              <div className="lg:hidden absolute top-6 left-6 md:left-1/2 -translate-x-1/2 flex items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.15 + 0.3 }}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 border-white z-10",
                    colors.dot
                  )}
                />
              </div>

              {/* Card */}
              <div className="pl-14 lg:pl-0 lg:pt-6">
                <CardSpotlight
                  className="h-full"
                  color={colors.spotlight}
                  borderColor={colors.spotlightBorder}
                  variant="light"
                >
                  <div className="space-y-4">
                    {/* Phase Number Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-1 rounded-full",
                          colors.bg,
                          colors.text
                        )}
                      >
                        {index === 2 ? "FINAL" : `PHASE ${index + 1}`}
                      </span>
                    </div>

                    {/* Header with icon */}
                    <div className="flex items-start gap-4">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.15 + 0.2 }}
                        className={cn(
                          "p-3 rounded-lg border",
                          colors.bg,
                          colors.border
                        )}
                      >
                        <Icon className={cn("w-6 h-6", colors.text)} />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {phase.title}
                        </h3>
                        <p className="text-gray-600 text-sm">{phase.description}</p>
                      </div>
                    </div>

                    {/* Items list */}
                    <ul className="space-y-2">
                      {phase.items.map((item, itemIndex) => (
                        <motion.li
                          key={itemIndex}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.3,
                            delay: index * 0.15 + itemIndex * 0.05 + 0.3,
                          }}
                          className="flex items-start gap-3"
                        >
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                              colors.text.replace("text-", "bg-")
                            )}
                          />
                          <span className="text-gray-700 text-sm leading-relaxed">
                            {item}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </CardSpotlight>
              </div>

              {/* Arrow connector between cards - Desktop only */}
              {index < phases.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.5 }}
                    className="bg-white border border-gray-200 rounded-full p-1 shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
