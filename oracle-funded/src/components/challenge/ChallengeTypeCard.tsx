"use client";

import React, { useState } from "react";
import { ChallengeType, ChallengePlan } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { NoiseBackground } from "@/components/ui/noise-background";
import { Check, Zap, Target, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeTypeCardProps {
  challengeType: ChallengeType;
  availablePlans: ChallengePlan[];
  selectedPlan: ChallengePlan | null;
  onSelectPlan: (plan: ChallengePlan) => void;
  isSelected: boolean;
}

export const ChallengeTypeCard = ({
  challengeType,
  availablePlans,
  selectedPlan,
  onSelectPlan,
  isSelected,
}: ChallengeTypeCardProps) => {
  // Default to 50k account size
  const [selectedAccountSize, setSelectedAccountSize] = useState(5000000);

  // Get account sizes available for this challenge type
  const accountSizes = [...new Set(availablePlans.map((p) => p.accountSize))].sort(
    (a, b) => a - b
  );

  // Find current plan based on selected account size
  const currentPlan = availablePlans.find(
    (p) => p.accountSize === selectedAccountSize
  );

  // Color mapping
  const colorConfig = {
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-300",
      text: "text-orange-600",
      accent: "bg-orange-600",
      accentHover: "hover:bg-orange-700",
      glowColor: "rgba(249, 115, 22, 0.4)",
      gradientFrom: "rgb(249, 115, 22)",
      gradientTo: "rgb(251, 146, 60)",
    },
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-300",
      text: "text-blue-600",
      accent: "bg-blue-600",
      accentHover: "hover:bg-blue-700",
      glowColor: "rgba(37, 99, 235, 0.4)",
      gradientFrom: "rgb(37, 99, 235)",
      gradientTo: "rgb(59, 130, 246)",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-300",
      text: "text-purple-600",
      accent: "bg-purple-600",
      accentHover: "hover:bg-purple-700",
      glowColor: "rgba(168, 85, 247, 0.4)",
      gradientFrom: "rgb(168, 85, 247)",
      gradientTo: "rgb(192, 132, 252)",
    },
  };

  const colors = colorConfig[challengeType.accentColor];

  const PhaseIcon =
    challengeType.phases === 1
      ? Zap
      : challengeType.phases === 2
      ? Target
      : Shield;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border-2 transition-all duration-300",
        isSelected
          ? `${colors.border} shadow-xl scale-[1.02]`
          : "border-gray-200 shadow-md hover:shadow-lg"
      )}
    >
      {/* Dotted Glow Background */}
      <DottedGlowBackground
        className="absolute inset-0 pointer-events-none"
        color={colors.glowColor}
        glowColor={colors.glowColor}
        gap={20}
        radius={2}
        speedMin={0.2}
        speedMax={0.8}
      />

      {/* Noise Background for selected card */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          <NoiseBackground
            containerClassName="w-full h-full"
            gradientColors={[colors.gradientFrom, colors.gradientTo]}
            noiseIntensity={0.08}
            speed={0.03}
          />
        </div>
      )}

      <div className="relative z-10 bg-white bg-opacity-95 p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold",
              colors.bg,
              colors.text
            )}
          >
            <PhaseIcon size={16} />
            <span>
              {challengeType.phases} {challengeType.phases === 1 ? "Phase" : "Phases"}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-gray-900">
            {challengeType.name}
          </h3>
          <p className="text-gray-600 text-sm">{challengeType.description}</p>
        </div>

        {/* Account Size Selector */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Account Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            {accountSizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedAccountSize(size)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  selectedAccountSize === size
                    ? `${colors.accent} text-white shadow-sm`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {formatCurrency(size)}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Display */}
        {currentPlan && (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(currentPlan.monthlyPrice)}
              <span className="text-lg text-gray-500 font-normal">/month</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Target: {formatCurrency(currentPlan.profitTarget)}
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="space-y-2">
          {challengeType.features.slice(0, 4).map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Check size={18} className={cn(colors.text, "shrink-0 mt-0.5")} />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Select Button */}
        <button
          onClick={() => currentPlan && onSelectPlan(currentPlan)}
          disabled={!currentPlan}
          className={cn(
            "w-full py-3 px-4 rounded-lg font-semibold transition-all",
            isSelected
              ? `${colors.accent} text-white shadow-md hover:shadow-lg ${colors.accentHover}`
              : "bg-gray-900 text-white hover:bg-gray-800",
            !currentPlan && "bg-gray-300 cursor-not-allowed"
          )}
        >
          {isSelected ? "Selected" : "Select Plan"}
        </button>
      </div>
    </div>
  );
};
