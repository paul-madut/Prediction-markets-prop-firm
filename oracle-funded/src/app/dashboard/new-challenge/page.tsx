"use client";

// Buy Challenge — visual structure mirrors the original mock design
// (account-size selector + 3 ChallengeTypeCards + comparison table) but
// data is sourced from the live /api/configs endpoint, and "Proceed"
// posts to /api/checkout, which returns either an Authorize.net hosted-form
// token (cards) or a NOWPayments invoice URL (crypto), then redirects the
// browser accordingly. See src/lib/payments/README.md for the design notes.

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { NewChallengeSkeleton } from "@/components/ui/skeleton";
import { ChallengePlan } from "@/types";
import { ChallengeTypeCard } from "@/components/challenge/ChallengeTypeCard";
import { Loader } from "@/components/ui/loader";
import { challengeTypes } from "@/data/challengeTypes";
import { formatCurrency } from "@/lib/formatters";
import { api, ApiError } from "@/lib/api-client";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import {
  PaymentMethodPicker,
  type PaymentMethod,
} from "@/components/payments/PaymentMethodPicker";
import { submitAuthnetHostedForm } from "@/lib/payments/submit-card-form";

// DESIGN.md spring presets.
const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isCheckoutPending, setIsCheckoutPending] = useState(false);

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
    if (!localSelectedPlan || !selectedMethod) return;
    setPurchaseError(null);
    try {
      const res = await api.post<{
        method: "card" | "crypto";
        url?: string;
        formUrl?: string;
        token?: string;
      }>("/api/checkout", {
        configId: localSelectedPlan.planId,
        method: selectedMethod,
      });

      if (res.method === "crypto") {
        if (!res.url) throw new Error("Invoice created but URL missing");
        window.location.href = res.url;
        return;
      }
      // card path: auto-POST the hosted-form token to authorize.net
      if (!res.formUrl || !res.token) {
        throw new Error("Hosted payment token missing");
      }
      submitAuthnetHostedForm(res.formUrl, res.token);
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  const getPlansByType = (typeId: "blitz" | "2step" | "3step") =>
    plans.filter((p) => p.challengeTypeId === typeId);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="text-center space-y-3">
        <h1
          className="text-[32px] leading-[38px] md:text-[40px] md:leading-[46px] font-bold text-white tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Choose your trading challenge
        </h1>
        <p className="text-base text-white/65 max-w-2xl mx-auto leading-relaxed">
          Select the evaluation style that matches your trading approach. Each challenge type offers different requirements and pricing structures.
        </p>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="max-w-md mx-auto bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF1C1C]">
          Failed to load configs: {loadError}
        </div>
      )}
      {purchaseError && (
        <div className="max-w-md mx-auto bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF1C1C]">
          {purchaseError}
        </div>
      )}

      {/* Empty state */}
      {plans.length === 0 && !loadError && (
        <div className="text-center text-white/55 py-16">
          No active challenges available right now.
        </div>
      )}

      {plans.length > 0 && (
        <>
          {/* Account size selector — synced across all cards. Sits as a
              secondary control: surface fill, line border, primary-ring
              on focus. */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center gap-2">
              <label
                htmlFor="account-size"
                className="text-[12px] leading-4 font-semibold tracking-[0.02em] text-white/70"
              >
                Account size
              </label>
              <div className="relative">
                <select
                  id="account-size"
                  value={selectedAccountSize}
                  onChange={(e) => setSelectedAccountSize(Number(e.target.value))}
                  className="appearance-none bg-[#180630] border border-white/10 rounded-lg pl-4 pr-10 h-11 text-sm font-semibold text-white cursor-pointer
                             transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                             hover:bg-[#1f0a3d] hover:border-white/[0.18]
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:border-white/15"
                >
                  {accountSizes.map((size) => (
                    <option key={size} value={size}>
                      {formatCurrency(size)}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
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

          {/* Payment method — picked after a challenge plan; gates the CTA. */}
          {localSelectedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-2xl mx-auto space-y-3"
            >
              <div className="flex items-baseline justify-between">
                <h2
                  className="text-lg font-semibold text-white tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Payment method
                </h2>
                <span className="text-[11px] uppercase tracking-[0.08em] text-white/45 font-mono">
                  Step 2 of 2
                </span>
              </div>
              <PaymentMethodPicker
                value={selectedMethod}
                onChange={setSelectedMethod}
                disabled={isCheckoutPending}
              />
            </motion.div>
          )}

          {/* Start challenge — primary with brand glow. NB: the selected
              ChallengeTypeCard already carries its own glow; this footer
              CTA is the single primary glow for the bottom of the page. */}
          {localSelectedPlan && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
              className="max-w-md mx-auto"
            >
              <motion.button
                type="button"
                onClick={async () => {
                  setIsCheckoutPending(true);
                  try {
                    await handleProceed();
                  } finally {
                    setIsCheckoutPending(false);
                  }
                }}
                disabled={isCheckoutPending || !selectedMethod}
                whileTap={
                  isCheckoutPending || !selectedMethod ? undefined : { scale: 0.97 }
                }
                transition={SNAPPY}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg
                           bg-[#7F24FF] hover:bg-[#A769FF] text-white text-base font-semibold
                           shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)]
                           transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0319]
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCheckoutPending ? (
                  <Loader size="sm" className="w-5 h-5" />
                ) : !selectedMethod ? (
                  <>Choose a payment method to continue</>
                ) : (
                  <>
                    Pay {formatCurrency(localSelectedPlan.monthlyPrice)} with{" "}
                    {selectedMethod === "card" ? "card" : "crypto"}
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Comparison table */}
          <div className="bg-[#180630] rounded-xl border border-white/10 p-6 space-y-6">
            <h2
              className="text-[24px] leading-[30px] font-semibold text-white text-center tracking-[-0.015em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Challenge comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th
                      className="text-left py-3 px-4 font-semibold text-white/85 text-[11px] uppercase tracking-[0.08em]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      Feature
                    </th>
                    {challengeTypes.map((type) => (
                      <th
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white/85 text-[11px] uppercase tracking-[0.08em]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="py-3 px-4 text-white/75">Evaluation phases</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.phases}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white/75">Profit target</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.profitTargetPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white/75">Daily loss limit</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.dailyLossLimitPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white/75">Max drawdown</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.maxDrawdownPercent}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white/75">Min trading days</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.minTradingDays}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-white/75">Price multiplier</td>
                    {challengeTypes.map((type) => (
                      <td
                        key={type.id}
                        className="text-center py-3 px-4 font-semibold text-white tabular-nums"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {type.pricingMultiplier}x
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* What's included */}
          <div className="bg-[#180630] rounded-xl border border-white/10 p-6 space-y-4">
            <h3
              className="text-lg font-semibold text-white text-center tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              What&apos;s included in all challenges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <div key={idx} className="flex items-center gap-2 text-white/85">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7F24FF]" />
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
