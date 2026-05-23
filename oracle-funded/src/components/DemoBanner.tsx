"use client";

// DemoBanner — top-of-page strip indicating sample data.
// DESIGN.md: bg-[#7F24FF]/14, 1px bottom border-[#7F24FF]/30. Animate in
// on mount with y: -8 -> 0 + fade, 300ms.

import Link from "next/link";
import { motion } from "framer-motion";

export const DemoBanner = () => {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-[#7F24FF]/[0.14] border-b border-[#7F24FF]/30 rounded-lg px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#7F24FF]/18 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A769FF] motion-safe:animate-pulse-soft" />
          <span
            className="text-[11px] font-semibold text-[#A769FF] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Demo
          </span>
        </div>
        <span className="text-xs sm:text-sm text-white/75">
          Sample data. Fully customizable for your brand.
        </span>
      </div>
      <Link
        href="/"
        className="text-xs sm:text-sm font-medium text-[#A769FF] hover:text-[#7F24FF] underline underline-offset-2 flex-shrink-0 transition-colors duration-150"
      >
        Learn more
      </Link>
    </motion.div>
  );
};
