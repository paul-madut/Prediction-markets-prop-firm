"use client";

import React from "react";
import { ChallengeType, ChallengePlan } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { CometCard } from "@/components/ui/comet-card";
import { CheckIcon, BoltIcon, ViewfinderCircleIcon, ShieldCheckIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

interface ChallengeTypeCardProps {
 challengeType: ChallengeType;
 availablePlans: ChallengePlan[];
 selectedPlan: ChallengePlan | null;
 onSelectPlan: (plan: ChallengePlan) => void;
 isSelected: boolean;
 selectedAccountSize: number;
}

export const ChallengeTypeCard = ({
 challengeType,
 availablePlans,
 selectedPlan,
 onSelectPlan,
 isSelected,
 selectedAccountSize,
}: ChallengeTypeCardProps) => {
 // Find current plan based on selected account size (passed from parent)
 const currentPlan = availablePlans.find(
 (p) => p.accountSize === selectedAccountSize
 );

 // Color mapping
 const colorConfig = {
 orange: {
 bg: "bg-[#FFB539]/10",
 border: "border-orange-300",
 text: "text-[#FFB539]",
 accent: "bg-orange-600",
 accentHover: "hover:bg-orange-700",
 glowColor: "rgba(249, 115, 22, 0.4)",
 gradientFrom: "rgb(249, 115, 22)",
 gradientTo: "rgb(251, 146, 60)",
 },
 blue: {
 bg: "bg-[#7F24FF]/10",
 border: "border-blue-300",
 text: "text-[#A769FF]",
 accent: "bg-[#7F24FF]",
 accentHover: "hover:bg-[#6c14ee]",
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
 ? BoltIcon
 : challengeType.phases === 2
 ? ViewfinderCircleIcon
 : ShieldCheckIcon;

 return (
 <CometCard
 rotateDepth={8}
 translateDepth={10}
 className={cn(
 "rounded-2xl overflow-hidden border-2 transition-all duration-300 bg-[#180630]",
 isSelected
 ? `${colors.border} shadow-xl`
 : "border-gray-200 dark:border-white/10 shadow-md hover:border-white/15"
 )}
 >
 <div className="p-6 space-y-5">
 {/* Header */}
 <div className="text-center space-y-3">
 <div
 className={cn(
 "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold",
 colors.bg,
 colors.text
 )}
 >
 <PhaseIcon className="w-4 h-4" />
 <span>
 {challengeType.phases} {challengeType.phases === 1 ? "Phase" : "Phases"}
 </span>
 </div>

 <h3 className="text-2xl font-bold text-white">
 {challengeType.name}
 </h3>
 <p className="text-white/75 text-sm leading-relaxed">{challengeType.description}</p>
 </div>

 {/* Pricing Display */}
 {currentPlan ? (
 <div className={cn(
 "text-center py-5 rounded-xl border transition-colors",
 isSelected
 ? `${colors.bg} ${colors.border}`
 : "bg-[#0C0319] dark:bg-[#0C0319] border-gray-200 dark:border-white/10"
 )}>
 <div className="text-4xl font-bold text-white">
 {formatCurrency(currentPlan.monthlyPrice)}
 </div>
 <div className="text-sm text-white/55 mt-1">one-time fee</div>
 <div className={cn(
 "text-sm font-medium mt-2",
 isSelected ? colors.text : "text-white/75"
 )}>
 Profit Target: {formatCurrency(currentPlan.profitTarget)}
 </div>
 </div>
 ) : (
 <div className="text-center py-5 rounded-xl bg-gray-100 dark:bg-[#1f0a3d] border border-gray-200 dark:border-white/10">
 <div className="text-lg font-medium text-white/45">
 Not available at this size
 </div>
 </div>
 )}

 {/* Features List — first bullet is the dynamic profit-target %
 derived from the currently selected plan so trader copy never
 disagrees with the dollar figure shown above. Static bullets
 for the rest. */}
 <div className="space-y-2.5">
 {currentPlan && (() => {
 const pct = currentPlan.accountSize > 0
 ? Math.round((currentPlan.profitTarget / currentPlan.accountSize) * 100)
 : null;
 const label =
 pct !== null
 ? `${pct}% profit target${challengeType.phases > 1 ? " per phase" : ""}`
 : null;
 return label ? (
 <div className="flex items-start gap-2.5">
 <div className={cn(
 "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
 isSelected ? colors.bg : "bg-gray-100 dark:bg-[#1f0a3d]"
 )}>
 <CheckIcon className={cn(isSelected ? colors.text : "text-white/55")} />
 </div>
 <span className="text-sm text-white/85">{label}</span>
 </div>
 ) : null;
 })()}
 {challengeType.features.slice(0, 3).map((feature, idx) => (
 <div key={idx} className="flex items-start gap-2.5">
 <div className={cn(
 "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
 isSelected ? colors.bg : "bg-gray-100 dark:bg-[#1f0a3d]"
 )}>
 <CheckIcon className={cn(isSelected ? colors.text : "text-white/55")} />
 </div>
 <span className="text-sm text-white/85">{feature}</span>
 </div>
 ))}
 </div>

 {/* Select Button */}
 <button
 onClick={() => currentPlan && onSelectPlan(currentPlan)}
 disabled={!currentPlan}
 className={cn(
 "w-full py-3.5 px-4 rounded-xl font-semibold transition-all duration-200",
 isSelected
 ? `${colors.accent} text-white shadow-lg hover:shadow-xl ${colors.accentHover}`
 : currentPlan
 ? "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md"
 : "bg-white/10 text-white/45 cursor-not-allowed"
 )}
 >
 {isSelected ? "Selected" : currentPlan ? "Select Plan" : "Unavailable"}
 </button>
 </div>
 </CometCard>
 );
};
