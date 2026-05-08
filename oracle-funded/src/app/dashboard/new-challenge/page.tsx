"use client";

// Buy Challenge — visual structure mirrors the original mock design
// (account-size selector + 3 ChallengeTypeCards + comparison table) but
// data is sourced from the live /api/configs endpoint, and "Proceed"
// posts to /api/checkout to create a Stripe Checkout Session.

import { useState, useEffect, useMemo } from "react";
import { NewChallengeSkeleton } from "@/components/ui/skeleton";
import { ChallengePlan } from "@/types";
import { ChallengeTypeCard } from "@/components/challenge/ChallengeTypeCard";
import { StatefulButton } from "@/components/ui/stateful-button";
import { NoiseBackground } from "@/components/ui/noise-background";
import { challengeTypes } from "@/data/challengeTypes";
import { formatCurrency } from "@/lib/formatters";
import { api, ApiError } from "@/lib/api-client";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

interface Phase {
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: number;
}

interface Config {
  id: string;
  name: string;
  accountSizeCents: string;
  challengeFeeCents: number;
  drawdownType: string;
  trailingReference: string;
  totalDrawdownPct: string;
  dailyDrawdownPct: string | null;
  profitSplitPct: string;
  phases: Phase[];
}

// Map an API config to a ChallengePlan the UI expects. The static
// challengeTypes metadata supplies cosmetic copy (description, features,
// accent colour); financial figures come from the live config.
function configToPlan(c: Config): ChallengePlan | null {
  const phaseCount = c.phases.length;
  const challengeTypeId =
    phaseCount === 1 ? "blitz" : phaseCount === 2 ? "2step" : phaseCount === 3 ? "3step" : null;
  if (!challengeTypeId) return null;

  const accountSize = Number(c.accountSizeCents);
  const profitTargetPct = Number(c.phases[0]?.profitTargetPct ?? 0);
  const totalDrawdownPct = Number(c.totalDrawdownPct);
  const dailyDrawdownPct = c.dailyDrawdownPct ? Number(c.dailyDrawdownPct) : 0;

  return {
    planId: c.id,
    challengeTypeId,
    accountSize,
    monthlyPrice: c.challengeFeeCents,
    profitTarget: Math.round((accountSize * profitTargetPct) / 100),
    maxPositions: 5,
    dailyLossLimit: Math.round((accountSize * dailyDrawdownPct) / 100),
    maxDrawdown: Math.round((accountSize * totalDrawdownPct) / 100),
    drawdownMode: c.drawdownType === "trailing_eod" ? "EOD" : "realtime",
    resetFee: 0,
    activationFee: false,
  };
}

export default function NewChallengePage() {
  const [configs, setConfigs] = useState<Config[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [localSelectedPlan, setLocalSelectedPlan] = useState<ChallengePlan | null>(null);
  const [selectedAccountSize, setSelectedAccountSize] = useState<number>(0);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Config[]>("/api/configs")
      .then(setConfigs)
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : String(err));
        setConfigs([]);
      });
  }, []);

  // Materialise plans from configs (only those that map to a known type).
  const plans = useMemo<ChallengePlan[]>(
    () => (configs ?? []).map(configToPlan).filter((p): p is ChallengePlan => p !== null),
    [configs],
  );

  const accountSizes = useMemo(
    () => [...new Set(plans.map((p) => p.accountSize))].sort((a, b) => a - b),
    [plans],
  );

  // Default to the smallest account size once plans load.
  useEffect(() => {
    if (accountSizes.length > 0 && selectedAccountSize === 0) {
      setSelectedAccountSize(accountSizes[0]);
    }
  }, [accountSizes, selectedAccountSize]);

  if (configs === null && !loadError) return <NewChallengeSkeleton />;

  const handleProceed = async (): Promise<void> => {
    if (!localSelectedPlan) return;
    setPurchaseError(null);
    try {
      const { url } = await api.post<{ url: string | null }>("/api/checkout", {
        configId: localSelectedPlan.planId,
      });
      if (!url) throw new Error("Checkout session created but URL missing");
      window.location.href = url;
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const getPlansByType = (typeId: "blitz" | "2step" | "3step") =>
    plans.filter((p) => p.challengeTypeId === typeId);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Choose Your Trading Challenge
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Select the evaluation style that matches your trading approach. Each challenge type offers different requirements and pricing structures.
        </p>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Failed to load configs: {loadError}
        </div>
      )}
      {purchaseError && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {purchaseError}
        </div>
      )}

      {/* Empty state */}
      {plans.length === 0 && !loadError && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-16">
          No active challenges available right now.
        </div>
      )}

      {plans.length > 0 && (
        <>
          {/* Account Size Selector — synced across all cards */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-2">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Select Account Size
              </label>
              <div className="relative">
                <select
                  value={selectedAccountSize}
                  onChange={(e) => setSelectedAccountSize(Number(e.target.value))}
                  className="appearance-none bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-800 rounded-xl px-6 py-3 pr-12 text-lg font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                >
                  {accountSizes.map((size) => (
                    <option key={size} value={size}>
                      {formatCurrency(size)}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              Challenge Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Feature
                    </th>
                    {challengeTypes.map((type) => (
                      <th
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {type.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Evaluation Phases</td>
                    {challengeTypes.map((type) => (
                      <td key={type.id} className="text-center py-3 px-4 font-semibold">
                        {type.phases}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Profit Target</td>
                    {challengeTypes.map((type) => (
                      <td key={type.id} className="text-center py-3 px-4 font-semibold">
                        {type.profitTargetPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Daily Loss Limit</td>
                    {challengeTypes.map((type) => (
                      <td key={type.id} className="text-center py-3 px-4 font-semibold">
                        {type.dailyLossLimitPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Max Drawdown</td>
                    {challengeTypes.map((type) => (
                      <td key={type.id} className="text-center py-3 px-4 font-semibold">
                        {type.maxDrawdownPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Min Trading Days</td>
                    {challengeTypes.map((type) => (
                      <td key={type.id} className="text-center py-3 px-4 font-semibold">
                        {type.minTradingDays}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">Price Multiplier</td>
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
          <div className="bg-gray-50 dark:bg-slate-950 rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center">
              What&apos;s Included in All Challenges
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
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
