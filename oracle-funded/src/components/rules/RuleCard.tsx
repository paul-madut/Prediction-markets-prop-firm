"use client";

import React from "react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
type HeroIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RuleCardProps {
  title: string;
  description?: string;
  items: string[];
  icon?: HeroIcon;
  accentColor?: "blue" | "green" | "purple";
  className?: string;
  index?: number;
}

export const RuleCard = ({
  title,
  description,
  items,
  icon: Icon,
  accentColor = "blue",
  className,
  index = 0,
}: RuleCardProps) => {
  const accentColors = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      border: "border-blue-200",
      spotlight: "rgba(59, 130, 246, 0.15)",
      spotlightBorder: "rgba(96, 165, 250, 0.4)",
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      border: "border-green-200",
      spotlight: "rgba(34, 197, 94, 0.15)",
      spotlightBorder: "rgba(74, 222, 128, 0.4)",
    },
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-600",
      border: "border-purple-200",
      spotlight: "rgba(168, 85, 247, 0.15)",
      spotlightBorder: "rgba(192, 132, 252, 0.4)",
    },
  };

  const colors = accentColors[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      <CardSpotlight
        className={cn("h-full", className)}
        color={colors.spotlight}
        borderColor={colors.spotlightBorder}
        variant="light"
      >
        <div className="space-y-4">
          {/* Header with optional icon */}
          <div className="flex items-start gap-4">
            {Icon && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
                className={cn(
                  "p-3 rounded-lg border",
                  colors.bg,
                  colors.border
                )}
              >
                <Icon className={cn("w-6 h-6", colors.text)} />
              </motion.div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
              {description && (
                <p className="text-gray-600 dark:text-gray-300 text-sm">{description}</p>
              )}
            </div>
          </div>

          {/* Bulleted list with staggered animation */}
          <ul className="space-y-2">
            {items.map((item, itemIndex) => (
              <motion.li
                key={itemIndex}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.1 + itemIndex * 0.05 + 0.3,
                }}
                className="flex items-start gap-3"
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                    colors.text.replace("text-", "bg-")
                  )}
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {item}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </CardSpotlight>
    </motion.div>
  );
};
