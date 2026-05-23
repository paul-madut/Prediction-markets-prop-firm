"use client";

// Dashboard / Portfolio / Analytics / Payouts metric tile.
//
// Implements the DESIGN.md metric-card recipe:
//   - 12px Geist Mono overline uppercase label in text-muted (#ADADAD)
//   - 32px Plus Jakarta Sans 700 metric-value below
//   - Optional delta in semantic color, mono
//   - 24px card-padding on a `surface` (#180630) card with 1px line border
//   - Count-up on first paint only (600ms easeOut). Re-renders snap to value.
//   - Honors prefers-reduced-motion (MotionConfig at the MainLayout boundary).
//
// Do NOT use a glow shadow here — only the primary CTA carries that.

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tone = "default" | "good" | "bad" | "warn" | "brand";

const TONE_TO_TEXT: Record<Tone, string> = {
  default: "text-white",
  good: "text-[#12DFBA]",
  bad: "text-[#FF1C1C]",
  warn: "text-[#FFB539]",
  brand: "text-[#A769FF]",
};

interface MetricCardProps {
  label: string;
  value: number | string;
  /** Optional numeric formatter — only used when `value` is a number. */
  format?: (v: number) => string;
  /** Sub-line shown beneath the metric. */
  hint?: string;
  /** Delta string (e.g. "+2.41%"). Pair with `deltaTone`. */
  delta?: string;
  deltaTone?: Tone;
  /** Color of the main value. Reserve semantic tones for actual state. */
  tone?: Tone;
  className?: string;
}

export function MetricCard({
  label,
  value,
  format,
  hint,
  delta,
  deltaTone = "default",
  tone = "default",
  className,
}: MetricCardProps) {
  const isNumeric = typeof value === "number";
  const reduceMotion = useReducedMotion();
  const animatedOnceRef = useRef(false);
  const [display, setDisplay] = useState<string>(() => {
    if (!isNumeric) return String(value);
    // Render the final value on first paint when we won't animate.
    return format ? format(value as number) : (value as number).toLocaleString();
  });

  // Count-up on first mount only. Re-renders snap straight to the new value.
  useEffect(() => {
    if (!isNumeric) {
      setDisplay(String(value));
      return;
    }
    const target = value as number;
    const fmt = format ?? ((v: number) => v.toLocaleString());
    if (animatedOnceRef.current || reduceMotion) {
      setDisplay(fmt(target));
      animatedOnceRef.current = true;
      return;
    }
    animatedOnceRef.current = true;
    const duration = 600;
    const startTs = performance.now();
    const startVal = 0;
    // ease-out cubic
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTs) / duration);
      const eased = ease(t);
      const cur = startVal + (target - startVal) * eased;
      setDisplay(fmt(t === 1 ? target : cur));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // We intentionally only depend on the underlying value identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      className={cn(
        "rounded-xl border border-white/10 bg-[#180630] p-6",
        className,
      )}
    >
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#ADADAD]">
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className={cn(
            "text-[32px] font-bold leading-[38px] tracking-[-0.02em] tabular-nums",
            TONE_TO_TEXT[tone],
          )}
          style={{ fontFamily: "var(--font-heading), 'Plus Jakarta Sans', sans-serif" }}
        >
          {display}
        </span>
        {delta && (
          <span
            className={cn(
              "font-mono text-sm font-medium tabular-nums",
              TONE_TO_TEXT[deltaTone],
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 text-[13px] text-[#ADADAD]">{hint}</div>
      )}
    </motion.div>
  );
}
