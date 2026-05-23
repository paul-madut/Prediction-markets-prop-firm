"use client";

// 56px data-row activity feed for the dashboard hub.
// Hover paints bg-white/[0.03]. First 8 items stagger in at delay i*0.03.
//
// Empty / zero-state is centered text with a soft icon. Numbers in mono +
// tabular-nums; semantic color only when non-zero.

import { motion, useReducedMotion } from "framer-motion";
import { ArrowTrendingUpIcon, ClockIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  /** ISO timestamp. */
  timestamp?: string;
  /** Realised P&L in cents. Pass undefined to render no value column. */
  pnlCents?: number | null;
  /** Optional side ("yes" / "no") shown as a brand chip. */
  side?: string;
}

interface RecentActivityProps {
  items: ActivityItem[];
  className?: string;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function RecentActivity({ items, className }: RecentActivityProps) {
  const reduce = useReducedMotion();

  if (items.length === 0) {
    return (
      <div className={cn("py-10 text-center", className)}>
        <ArrowTrendingUpIcon className="mx-auto mb-3 h-6 w-6 text-[#5A6476]" />
        <p className="text-sm text-[#ADADAD]">
          Your trade activity will land here.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-white/10", className)}>
      {items.map((item, i) => {
        const delay = reduce ? 0 : Math.min(i, 7) * 0.03;
        const pnl = item.pnlCents ?? null;
        const pnlClass =
          pnl === null || pnl === 0
            ? "text-white"
            : pnl > 0
              ? "text-[#12DFBA]"
              : "text-[#FF1C1C]";
        return (
          <motion.li
            key={item.id}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay, ease: [0, 0, 0.2, 1] }}
            className="flex h-14 items-center gap-4 px-2 transition-colors hover:bg-white/[0.03]"
          >
            {item.side && (
              <span
                className={cn(
                  "inline-flex h-[22px] items-center rounded-full px-2.5 text-[12px] font-semibold uppercase tracking-wide",
                  item.side.toLowerCase() === "yes"
                    ? "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]"
                    : "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]",
                )}
              >
                {item.side}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white">{item.title}</div>
              {item.subtitle && (
                <div className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-[#5A6476]">
                  {item.subtitle}
                </div>
              )}
            </div>
            {pnl !== null && (
              <div
                className={cn(
                  "font-mono text-sm font-medium tabular-nums",
                  pnlClass,
                )}
              >
                {pnl >= 0 ? "+" : ""}
                {formatCurrency(pnl)}
              </div>
            )}
            {item.timestamp && (
              <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#5A6476]">
                <ClockIcon className="h-3 w-3" />
                {relativeTime(item.timestamp)}
              </div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
