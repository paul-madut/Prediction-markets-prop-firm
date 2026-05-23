"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Blueberry section header (DESIGN.md):
// - Display headlines use Plus Jakarta Sans, weight 700, tight tracking.
// - No gradient text (DESIGN.md keeps text in the three white tiers).
// - Optional small overline + dot in the accent colour to give the section
//   a visual anchor without inventing a new palette.

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: "blue" | "purple" | "green";
  id?: string;
  centered?: boolean;
}

const ACCENT: Record<
  NonNullable<SectionHeaderProps["accentColor"]>,
  { dot: string; text: string }
> = {
  blue: { dot: "bg-[#7F24FF]", text: "text-[#A769FF]" },
  purple: { dot: "bg-[#A769FF]", text: "text-[#A769FF]" },
  green: { dot: "bg-[#12DFBA]", text: "text-[#12DFBA]" },
};

export const SectionHeader = ({
  title,
  subtitle,
  accentColor = "blue",
  id,
  centered = true,
}: SectionHeaderProps) => {
  const colors = ACCENT[accentColor];

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn("scroll-mt-24", centered && "text-center")}
    >
      <div
        className={cn(
          "inline-flex items-center gap-2 mb-3",
          centered && "justify-center",
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
        <span
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.08em]",
            colors.text,
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Section
        </span>
      </div>
      <h2
        className="text-[24px] leading-[30px] md:text-[32px] md:leading-[38px] font-bold text-white tracking-[-0.02em]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm md:text-base text-white/65 leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};
