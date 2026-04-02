"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { ChallengePlan } from "@/types";
import { ChallengeTypeCard } from "@/components/challenge/ChallengeTypeCard";
import { StatefulButton } from "@/components/ui/stateful-button";
import { NoiseBackground } from "@/components/ui/noise-background";
import { formatCurrency } from "@/lib/formatters";
import { ChevronDown } from "lucide-react";

export default function NewChallengePage() {
  const { plans, challengeTypes, selectPlan } = useApp();
  const router = useRouter();
  const [localSelectedPlan, setLocalSelectedPlan] = useState<ChallengePlan | null>(
    null
  );
  // Global account size state - synced across all cards
  const [selectedAccountSize, setSelectedAccountSize] = useState(5000000);

  // Get unique account sizes from all plans
  const accountSizes = [...new Set(plans.map((p) => p.accountSize))].sort(
    (a, b) => a - b
  );

  const handleProceed = async () => {
    if (localSelectedPlan) {
      // Simulate async checkout operation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      selectPlan(localSelectedPlan.planId);
      router.push("/");
    }
  };

  // Group plans by challenge type
  const getPlansByType = (typeId: 'blitz' | '2step' | '3step') =>
    plans.filter((p) => p.challengeTypeId === typeId);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Subtitle */}
      <p className="text-center text-gray-600 max-w-2xl mx-auto">
        Select the evaluation style that matches your trading approach. Each challenge type offers different requirements and pricing structures.
      </p>

      {/* Account Size Selector - Synced across all cards */}
      <div className="flex justify-center">
        <div className="inline-flex flex-col items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Select Account Size</label>
          <div className="relative">
            <select
              value={selectedAccountSize}
              onChange={(e) => setSelectedAccountSize(Number(e.target.value))}
              className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-6 py-3 pr-12 text-lg font-semibold text-gray-900 cursor-pointer hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
            >
              {accountSizes.map((size) => (
                <option key={size} value={size}>
                  {formatCurrency(size)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Challenge Type Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {challengeTypes.map((challengeType) => {
          const typePlans = getPlansByType(challengeType.id);
          const isSelected =
            localSelectedPlan?.challengeTypeId === challengeType.id;

          return (
            <ChallengeTypeCard
              key={challengeType.id}
              challengeType={challengeType}
              availablePlans={typePlans}
              selectedPlan={localSelectedPlan}
              onSelectPlan={setLocalSelectedPlan}
              isSelected={isSelected}
              selectedAccountSize={selectedAccountSize}
            />
          );
        })}
      </div>

      {/* Proceed Button */}
      {localSelectedPlan && (
        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <NoiseBackground
            containerClassName="rounded-lg"
            gradientColors={["rgb(37, 99, 235)", "rgb(59, 130, 246)"]}
            noiseIntensity={0.12}
            speed={0.04}
          >
            <div className="p-1">
              <StatefulButton
                onClick={handleProceed}
                className="w-full py-4 text-lg font-semibold"
              >
                Proceed to Checkout - {formatCurrency(localSelectedPlan.monthlyPrice)}
              </StatefulButton>
            </div>
          </NoiseBackground>
        </div>
      )}

      {/* Challenge Comparison Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          Challenge Comparison
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Feature
                </th>
                {challengeTypes.map((type) => (
                  <th
                    key={type.id}
                    className="text-center py-3 px-4 font-semibold text-gray-700"
                  >
                    {type.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 text-gray-600">Evaluation Phases</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.phases}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Profit Target</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.profitTargetPercent}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Daily Loss Limit</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.dailyLossLimitPercent}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Max Drawdown</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.maxDrawdownPercent}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Min Trading Days</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.minTradingDays}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-600">Price Multiplier</td>
                {challengeTypes.map((type) => (
                  <td key={type.id} className="text-center py-3 px-4 font-semibold">
                    {type.pricingMultiplier}x
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* What's Included Section */}
      <div className="bg-gray-50 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-900 text-center">
          What's Included in All Challenges
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Access to all prediction markets",
            "Real-time market data",
            "80/20 profit split when funded",
            "Bi-weekly payouts",
            "No time limit on phases",
            "Scale up to larger accounts",
            "Trade on weekends",
            "Professional trader dashboard",
            "24/7 support",
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-gray-700"
            >
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
