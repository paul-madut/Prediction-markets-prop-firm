"use client";

// /dashboard/buy — real-backend Buy-Challenge page.
//
// Pulls the active challenge_configs for the firm from /api/configs, renders
// them with the existing TextureCard / TextureButton design system, and on
// purchase calls /api/checkout to create a Stripe Checkout Session and
// redirects to the returned URL. Stripe handles the rest of the payment;
// the webhook handler provisions the account.
//
// Visual style matches /dashboard/new-challenge (the mock variant) so the
// two routes feel like the same product. Once frontend is fully wired,
// new-challenge can be retired.

import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

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

export default function BuyChallengePage() {
  const [configs, setConfigs] = useState<Config[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
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

  async function purchase(configId: string): Promise<void> {
    setPurchaseError(null);
    setPurchasing(configId);
    try {
      const { url } = await api.post<{ url: string | null }>("/api/checkout", { configId });
      if (!url) throw new Error("Checkout session created but URL missing");
      window.location.href = url;
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : String(err));
      setPurchasing(null);
    }
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Page header — matches new-challenge headline rhythm */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          Buy a Trading Challenge
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Live challenge configurations from your firm. Click Purchase to start
          a Stripe checkout — your account is provisioned automatically when
          payment succeeds.
        </p>
      </div>

      {/* Real-data indicator: tiny pill so demo viewers know this is live */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Live data
          </span>
          <span className="text-xs text-emerald-700">
            from <code className="font-mono">/api/configs</code>
          </span>
        </div>
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

      {/* Loading skeleton */}
      {configs === null && !loadError && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {configs?.length === 0 && !loadError && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-16">
          No active challenges available right now.
        </div>
      )}

      {/* Cards grid */}
      {configs && configs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {configs.map((c) => {
            const accountSize = Number(c.accountSizeCents);
            const isInstant = c.drawdownType === "static" && c.phases[0]?.minTradingDays === 0;
            const profitTarget = c.phases[0]?.profitTargetPct ?? "—";
            const minDays = c.phases[0]?.minTradingDays ?? 0;
            const isPurchasing = purchasing === c.id;

            return (
              <TextureCard key={c.id} interactive={false}>
                <TextureCardContent className="p-0">
                  {/* Header strip — colored badge by drawdown style */}
                  <div
                    className={`px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800 ${
                      isInstant
                        ? "bg-gradient-to-br from-emerald-50 to-teal-50"
                        : c.drawdownType === "trailing_eod"
                          ? "bg-gradient-to-br from-blue-50 to-indigo-50"
                          : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-900 dark:to-slate-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${
                          isInstant
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {isInstant ? "Instant Funded" : "Evaluation"}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {c.drawdownType === "trailing_eod" ? "Trailing-EOD" : "Static"}{" "}
                        drawdown
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {c.name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(accountSize)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">account</span>
                    </div>
                  </div>

                  {/* Stats body */}
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <ChartBarIcon className="w-4 h-4" />
                        Profit target
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {profitTarget}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Total drawdown
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {c.totalDrawdownPct}%
                      </span>
                    </div>
                    {c.dailyDrawdownPct && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <ShieldCheckIcon className="w-4 h-4" />
                          Daily drawdown
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {c.dailyDrawdownPct}%
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <CurrencyDollarIcon className="w-4 h-4" />
                        Profit split
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {c.profitSplitPct}% to trader
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        Min trading days
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {minDays}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                          One-time fee
                        </div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          ${(c.challengeFeeCents / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <TextureButton
                      variant="primary"
                      size="lg"
                      className="w-full"
                      onClick={() => purchase(c.id)}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? (
                        "Redirecting to Stripe…"
                      ) : (
                        <>
                          Purchase
                          <ArrowRightIcon className="w-4 h-4" />
                        </>
                      )}
                    </TextureButton>
                  </div>
                </TextureCardContent>
              </TextureCard>
            );
          })}
        </div>
      )}

      {/* Reassurance footer */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
        Powered by Stripe. Your account is provisioned automatically when
        payment is confirmed by webhook. Refunds disable the account by default
        per challenge config.
      </div>
    </div>
  );
}
