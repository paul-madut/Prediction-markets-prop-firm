"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type HeroIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// Blueberry RuleCard (DESIGN.md):
// - `surface` background, `rounded-xl`, 24px padding, 1px line border.
// - Hover ascends to `surface-2` with `line-strong` border + translateY(-1px)
//   under a `responsive` spring. No drop shadows on cards.
// - Accent stripe + icon use the same palette as the rest of the system:
//   purple primary / mint success. No introduced hues.

const RESPONSIVE_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

interface RuleCardProps {
  title: string;
  description?: string;
  items: string[];
  icon?: HeroIcon;
  accentColor?: "blue" | "green" | "purple";
  className?: string;
  index?: number;
}

const ACCENT: Record<
  NonNullable<RuleCardProps["accentColor"]>,
  { bg: string; text: string; border: string; dot: string }
> = {
  blue: {
    bg: "bg-[#7F24FF]/15",
    text: "text-[#A769FF]",
    border: "border-[#7F24FF]/30",
    dot: "bg-[#A769FF]",
  },
  purple: {
    bg: "bg-[#7F24FF]/15",
    text: "text-[#A769FF]",
    border: "border-[#7F24FF]/30",
    dot: "bg-[#7F24FF]",
  },
  green: {
    bg: "bg-[#12DFBA]/15",
    text: "text-[#12DFBA]",
    border: "border-[#12DFBA]/30",
    dot: "bg-[#12DFBA]",
  },
};

export const RuleCard = ({
  title,
  description,
  items,
  icon: Icon,
  accentColor = "blue",
  className,
  index = 0,
}: RuleCardProps) => {
  const colors = ACCENT[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.4,
        delay: Math.min(index, 8) * 0.03,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -1 }}
      // Spring drives the hover; CSS transition handles colour paint.
      style={{ willChange: "transform" }}
      className="h-full"
    >
      <div
        className={cn(
          "h-full p-6 rounded-xl border border-white/10 bg-[#180630]",
          "hover:bg-[#1f0a3d] hover:border-white/[0.18]",
          "transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
          className,
        )}
      >
        <div className="space-y-4">
          {/* Header with optional icon */}
          <div className="flex items-start gap-4">
            {Icon && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  ...RESPONSIVE_SPRING,
                  delay: Math.min(index, 8) * 0.03 + 0.1,
                }}
                className={cn(
                  "inline-flex p-2.5 rounded-lg border",
                  colors.bg,
                  colors.border,
                )}
              >
                <Icon className={cn("w-5 h-5", colors.text)} />
              </motion.div>
            )}
            <div className="flex-1">
              <h3
                className="text-lg font-semibold text-white tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {title}
              </h3>
              {description && (
                <p className="text-sm text-white/65 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Bulleted list */}
          <ul className="space-y-2">
            {items.map((item, itemIndex) => (
              <motion.li
                key={itemIndex}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.25,
                  delay:
                    Math.min(index, 8) * 0.03 + Math.min(itemIndex, 8) * 0.024 + 0.15,
                }}
                className="flex items-start gap-3"
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-[7px] shrink-0",
                    colors.dot,
                  )}
                />
                <span className="text-sm text-white/85 leading-relaxed">
                  {item}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};
