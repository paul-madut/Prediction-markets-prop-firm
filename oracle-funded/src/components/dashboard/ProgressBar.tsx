"use client";

// Linear progress bar for challenge objectives.
//
// Animates `width: 0 -> targetPct` on mount over 700ms easeOut. Width is
// the one layout property DESIGN.md explicitly allows here because a real
// progress fill cannot be done with transforms alone.
//
// Honors prefers-reduced-motion via Framer's MotionConfig at MainLayout.

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "brand" | "good" | "warn" | "bad";

const TRACK_TONE: Record<Tone, string> = {
  brand: "bg-[#7F24FF]",
  good: "bg-[#12DFBA]",
  warn: "bg-[#FFB539]",
  bad: "bg-[#FF1C1C]",
};

interface ProgressBarProps {
  /** 0..100 (will be clamped). */
  value: number;
  tone?: Tone;
  height?: number;
  className?: string;
}

export function ProgressBar({
  value,
  tone = "brand",
  height = 6,
  className,
}: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-white/[0.06]",
        className,
      )}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={reduce ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{
          duration: reduce ? 0 : 0.7,
          ease: [0, 0, 0.2, 1],
        }}
        className={cn("h-full rounded-full", TRACK_TONE[tone])}
      />
    </div>
  );
}
