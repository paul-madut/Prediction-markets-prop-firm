"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
}

// Page transitions per DESIGN.md Motion section:
//   Enter: fade + 8px Y, 200ms, ease-default
//   Exit:  4px Y + fade,  150ms, ease-default
// Reduced motion is honored by the parent MotionConfig wrapper
// in MainLayout.tsx — no per-component check needed.
const EASE_DEFAULT: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const PageTransition = ({ children }: PageTransitionProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname ?? "page"}
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, ease: EASE_DEFAULT },
        }}
        exit={{
          opacity: 0,
          y: 4,
          transition: { duration: 0.15, ease: EASE_DEFAULT },
        }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
