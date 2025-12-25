"use client";

import React from "react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RuleCardProps {
  title: string;
  description?: string;
  items: string[];
  icon?: LucideIcon;
  accentColor?: "blue" | "green" | "purple";
  className?: string;
}

export const RuleCard = ({
  title,
  description,
  items,
  icon: Icon,
  accentColor = "blue",
  className,
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
    <CardSpotlight
      className={className}
      color={colors.spotlight}
      borderColor={colors.spotlightBorder}
    >
      <div className="space-y-4">
        {/* Header with optional icon */}
        <div className="flex items-start gap-4">
          {Icon && (
            <div
              className={cn(
                "p-3 rounded-lg border",
                colors.bg,
                colors.border
              )}
            >
              <Icon className={cn("w-6 h-6", colors.text)} />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            {description && (
              <p className="text-gray-400 text-sm">{description}</p>
            )}
          </div>
        </div>

        {/* Bulleted list */}
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                  colors.text.replace("text-", "bg-")
                )}
              />
              <span className="text-gray-300 text-sm leading-relaxed">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CardSpotlight>
  );
};
