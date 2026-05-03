"use client";

import React, { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  ClockIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { useApp } from "@/context/AppContext";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { AccountSwitcher } from "@/components/account/AccountSwitcher";

const PHASE_LABEL: Record<string, string> = {
  evaluation_1: "Phase 1 — Evaluation",
  evaluation_2: "Phase 2 — Verification",
  funded: "Funded — Live",
};

export default function ChallengePage() {
  const { user, equityHistory } = useApp();
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const profitProgress = user.profitTarget > 0 ? user.currentProfit / user.profitTarget : 0;
  const drawdownProgress =
    user.maxDrawdownLimit > 0
      ? Math.abs(user.currentMaxDrawdown) / user.maxDrawdownLimit
      : 0;

  // Pass requirements
  const meetProfitTarget = user.currentProfit >= user.profitTarget;
  const meetMinTrades = equityHistory.length >= 5;
  const withinMaxDrawdown = Math.abs(user.currentMaxDrawdown) < user.maxDrawdownLimit;
  const withinDailyDrawdown = Math.abs(user.currentDailyDrawdown) < user.dailyDrawdownLimit;

  const remainingProfit = Math.max(0, user.profitTarget - user.currentProfit);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Challenge Progress</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Track requirements to pass and advance.
          </p>
        </div>
        <div className="min-w-[260px]">
          <AccountSwitcher />
        </div>
      </div>

      {/* Big challenge card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phase</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{PHASE_LABEL[user.accountPhase]}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account size</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{formatCurrency(user.accountSize)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Started</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{formatDate(user.challengeStartDate)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current equity</div>
            <div className="font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{formatCurrency(user.accountBalance)}</div>
          </div>
        </div>
      </div>

      {/* Guidance */}
      {user.accountPhase !== "funded" && remainingProfit > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6">
          <div className="flex items-start gap-4">
            <TrophyIcon className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">
                Hit your target to advance to {user.accountPhase === "evaluation_1" ? "Phase 2" : "Funded"}
              </h3>
              <p className="text-sm text-blue-100 mt-1">
                You need {(remainingProfit * 100).toFixed(2)}% more profit on a{" "}
                {formatCurrency(user.accountSize)} account.
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">
                {(user.currentProfit * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-blue-100">of {(user.profitTarget * 100).toFixed(0)}% target</div>
            </div>
          </div>
        </div>
      )}

      {/* Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Profit target</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Goal: {(user.profitTarget * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums mb-2">
            {(user.currentProfit * 100).toFixed(2)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all",
                profitProgress >= 1 ? "bg-green-500" : "bg-blue-500",
              )}
              style={{ width: `${Math.min(100, profitProgress * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {Math.round(profitProgress * 100)}% of target reached
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Max drawdown</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Limit: {(user.maxDrawdownLimit * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums mb-2">
            {(Math.abs(user.currentMaxDrawdown) * 100).toFixed(2)}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={cn(
                "h-3 rounded-full transition-all",
                drawdownProgress >= 0.8 ? "bg-red-500" : drawdownProgress >= 0.5 ? "bg-amber-500" : "bg-green-500",
              )}
              style={{ width: `${Math.min(100, drawdownProgress * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {Math.round(drawdownProgress * 100)}% of limit
            {drawdownProgress >= 1 && <span className="text-red-600 font-semibold"> — BREACHED</span>}
          </div>
        </div>
      </div>

      {/* Daily DD with countdown */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Daily drawdown</h3>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-3.5 h-3.5" />
            Resets in {dailyResetCountdown()}
          </div>
        </div>
        <div className="flex items-baseline gap-3 mb-2">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {(Math.abs(user.currentDailyDrawdown) * 100).toFixed(2)}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            of {(user.dailyDrawdownLimit * 100).toFixed(0)}% daily limit
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit >= 0.8 ? "bg-red-500" : "bg-blue-500",
            )}
            style={{
              width: `${Math.min(
                100,
                (Math.abs(user.currentDailyDrawdown) / user.dailyDrawdownLimit) * 100,
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Requirements to pass</h3>
        <div className="space-y-3">
          <Requirement
            met={meetProfitTarget}
            label="Profit target"
            detail={`${(user.currentProfit * 100).toFixed(2)}% of ${(user.profitTarget * 100).toFixed(0)}%`}
          />
          <Requirement
            met={meetMinTrades}
            label={`Minimum ${user.tradingDaysRequired} trading days`}
            detail={`${user.tradingDaysCompleted} / ${user.tradingDaysRequired} completed`}
          />
          <Requirement
            met={withinMaxDrawdown}
            label="Stay within max drawdown"
            detail={`${(Math.abs(user.currentMaxDrawdown) * 100).toFixed(2)}% of ${(user.maxDrawdownLimit * 100).toFixed(0)}% limit`}
          />
          <Requirement
            met={withinDailyDrawdown}
            label="Stay within daily drawdown"
            detail={`${(Math.abs(user.currentDailyDrawdown) * 100).toFixed(2)}% of ${(user.dailyDrawdownLimit * 100).toFixed(0)}% limit`}
          />
        </div>
      </div>

      {/* Collapsible rules */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
        <button
          onClick={() => setRulesExpanded((v) => !v)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Challenge rules</h3>
          <ChevronDownIcon
            className={cn("w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform", rulesExpanded && "rotate-180")}
          />
        </button>
        {rulesExpanded && (
          <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 space-y-2 border-t border-gray-100 dark:border-slate-800 pt-4">
            <p><strong>Profit target:</strong> Reach {(user.profitTarget * 100).toFixed(0)}% on the starting balance to advance.</p>
            <p><strong>Daily drawdown:</strong> No single calendar day can lose more than {(user.dailyDrawdownLimit * 100).toFixed(0)}% of starting balance. Resets at 00:00 UTC.</p>
            <p><strong>Max drawdown:</strong> Total drawdown from peak balance cannot exceed {(user.maxDrawdownLimit * 100).toFixed(0)}%. Trailing.</p>
            <p><strong>Min trading days:</strong> Place at least one trade on {user.tradingDaysRequired} distinct calendar days.</p>
            <p><strong>Holding requirements:</strong> No restrictions on hold time, news trading, or weekend exposure for prediction markets.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-end">
        <a
          href="/dashboard/markets"
          className="inline-flex items-center gap-2 text-blue-600 font-semibold text-sm hover:text-blue-700"
        >
          Browse markets <ArrowRightIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

function Requirement({ met, label, detail }: { met: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      {met ? (
        <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      )}
      <div className="flex-1">
        <div className={cn("font-medium", met ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300")}>{label}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{detail}</div>
      </div>
    </div>
  );
}

function dailyResetCountdown(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = next.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
}
