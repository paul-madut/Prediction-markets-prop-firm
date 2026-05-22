"use client";

// /dashboard/challenge — phase progress tracker.
//
// Sources: GET /api/accounts/[id] + /api/accounts/[id]/equity.
// Computes profit-to-target %, trading-days-to-min %, and drawdown room
// for the current phase.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

interface Phase {
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: number;
}

interface AccountDetail {
  id: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  drawdownFloorCents: string;
  tradingDaysCount: number;
  firstTradeAt: string | null;
  breachAt: string | null;
  config: {
    name: string;
    accountSizeCents: string;
    profitSplitPct: string;
  };
  currentPhase: Phase;
}

interface EquitySnapshot {
  equityCents: string;
  drawdownFloorCents: string;
  isBreach: boolean;
}

function ProgressBar({
  pct,
  tone = "blue",
}: {
  pct: number;
  tone?: "blue" | "green" | "amber";
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-[#A769FF]";
  return (
    <div className="h-2 w-full bg-gray-100 dark:bg-[#1f0a3d] rounded-full overflow-hidden">
      <div
        className={`h-full ${cls} transition-all duration-500`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function PhaseCard({
  active,
  passed,
  phaseNumber,
  name,
  profitTargetPct,
  minTradingDays,
}: {
  active: boolean;
  passed: boolean;
  phaseNumber: number;
  name: string;
  profitTargetPct: string;
  minTradingDays: number;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        active
          ? "border-[#A769FF] bg-[#7F24FF]/10 bg-[#1f0a3d]/30"
          : passed
            ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
            : "border-gray-200 dark:border-white/10 bg-[#180630]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            active
              ? "text-[#7F24FF] text-[#A769FF]"
              : passed
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-white/55"
          }`}
        >
          Phase {phaseNumber}
        </span>
        {passed && <CheckCircleIcon className="w-4 h-4 text-emerald-600" />}
      </div>
      <div className="text-sm font-bold text-white">
        {name}
      </div>
      <div className="text-xs text-white/55 mt-2">
        Target {profitTargetPct}% · {minTradingDays}-day minimum
      </div>
    </div>
  );
}

export default function ChallengeProgressPage() {
  const { activeAccount, signedIn } = useApp();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [equity, setEquity] = useState<EquitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccount) return;
    Promise.all([
      api.get<AccountDetail>(`/api/accounts/${activeAccount.id}`),
      api.get<EquitySnapshot>(`/api/accounts/${activeAccount.id}/equity`),
    ])
      .then(([a, e]) => {
        setAccount(a);
        setEquity(e);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : String(err)),
      );
  }, [activeAccount?.id]);

  if (!signedIn) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-white/55">
        Sign in to see your challenge progress.
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
        <h1 className="text-2xl font-bold text-white">
          Challenge Progress
        </h1>
        <p className="text-sm text-white/55">
          Buy a challenge to see your progress.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-block px-4 py-2 rounded-lg bg-[#7F24FF] text-white text-sm font-medium"
        >
          Browse challenges
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!account) {
    return <ChallengeSkeleton />;
  }

  const startingBalance = Number(account.startingBalanceCents);
  const equityCents = equity ? Number(equity.equityCents) : Number(account.currentBalanceCents);
  const profitCents = equityCents - startingBalance;
  const profitPct = startingBalance > 0 ? (profitCents / startingBalance) * 100 : 0;

  const phaseTargetPct = Number(account.currentPhase.profitTargetPct);
  const phaseTargetCents = Math.round((startingBalance * phaseTargetPct) / 100);
  const profitProgressPct =
    phaseTargetCents > 0 ? (profitCents / phaseTargetCents) * 100 : 0;

  const tradingDaysProgressPct =
    account.currentPhase.minTradingDays > 0
      ? (account.tradingDaysCount / account.currentPhase.minTradingDays) * 100
      : 100;

  const floor = equity ? Number(equity.drawdownFloorCents) : Number(account.drawdownFloorCents);
  const floorRoom = equityCents - floor;
  const floorRoomPct =
    startingBalance - floor > 0
      ? (floorRoom / (startingBalance - floor)) * 100
      : 0;

  const isFunded = account.status === "funded";
  const isBreached = account.status === "breached";
  const isPassedPhase = account.status === "passed_phase";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Challenge Progress
        </h1>
        <p className="text-sm text-white/55 mt-1">
          {account.config.name} — current status:{" "}
          <span className="capitalize font-medium">
            {account.status.replace("_", " ")}
          </span>
        </p>
      </div>

      {/* Phase strip — synthesised from currentPhase only. We don't have all
          phases on the API; show current + completed via passed_phase status. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((n) => {
          const isCurrent = n === account.currentPhase.phaseNumber && !isFunded;
          const isPast =
            n < account.currentPhase.phaseNumber ||
            (n === account.currentPhase.phaseNumber && (isPassedPhase || isFunded));
          if (n === account.currentPhase.phaseNumber && !isFunded) {
            return (
              <PhaseCard
                key={n}
                active={isCurrent}
                passed={false}
                phaseNumber={n}
                name={account.currentPhase.name}
                profitTargetPct={account.currentPhase.profitTargetPct}
                minTradingDays={account.currentPhase.minTradingDays}
              />
            );
          }
          return (
            <PhaseCard
              key={n}
              active={false}
              passed={isPast || isFunded}
              phaseNumber={n}
              name={isFunded && n === 3 ? "Funded" : `Phase ${n}`}
              profitTargetPct="—"
              minTradingDays={0}
            />
          );
        })}
      </div>

      {/* Funded / breached banners */}
      {isFunded && (
        <TextureCard interactive={false}>
          <TextureCardContent className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold text-emerald-900">
                  You&apos;re funded
                </h2>
                <p className="text-sm text-emerald-800">
                  Profits are split {account.config.profitSplitPct}% to you, the rest to the firm.
                  Request payouts from{" "}
                  <Link
                    href="/dashboard/payouts"
                    className="underline font-medium"
                  >
                    Payouts
                  </Link>
                  .
                </p>
              </div>
            </div>
          </TextureCardContent>
        </TextureCard>
      )}

      {isBreached && (
        <TextureCard interactive={false}>
          <TextureCardContent className="p-6 bg-red-50 border border-red-200 rounded-xl">
            <h2 className="text-lg font-bold text-red-900">Account breached</h2>
            <p className="text-sm text-red-800">
              Open positions were closed automatically. Contact support to discuss
              a reset, or buy a new challenge.
            </p>
          </TextureCardContent>
        </TextureCard>
      )}

      {/* Profit-to-target */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-[#A769FF]" />
            <h2 className="text-lg font-semibold text-white">
              Profit toward {account.currentPhase.name}
            </h2>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tabular-nums text-white">
              {profitCents >= 0 ? "+" : ""}
              {formatCurrency(profitCents)}
            </span>
            <span className="text-sm text-white/55 tabular-nums">
              of {formatCurrency(phaseTargetCents)} target
            </span>
          </div>
          <ProgressBar
            pct={profitProgressPct}
            tone={profitProgressPct >= 100 ? "green" : "blue"}
          />
          <div className="text-xs text-white/55 tabular-nums">
            {profitPct >= 0 ? "+" : ""}
            {profitPct.toFixed(2)}% · {profitProgressPct.toFixed(0)}% to target
          </div>
        </TextureCardContent>
      </TextureCard>

      {/* Trading days progress */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-white">
              Trading days
            </h2>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tabular-nums text-white">
              {account.tradingDaysCount}
            </span>
            <span className="text-sm text-white/55 tabular-nums">
              of {account.currentPhase.minTradingDays} required
            </span>
          </div>
          <ProgressBar
            pct={tradingDaysProgressPct}
            tone={tradingDaysProgressPct >= 100 ? "green" : "blue"}
          />
          <div className="text-xs text-white/55">
            {account.firstTradeAt
              ? `First trade ${new Date(account.firstTradeAt).toLocaleDateString()}`
              : "No trades yet."}
          </div>
        </TextureCardContent>
      </TextureCard>

      {/* Drawdown room */}
      <TextureCard interactive={false}>
        <TextureCardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-white">
              Drawdown room
            </h2>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tabular-nums text-white">
              {formatCurrency(Math.max(0, floorRoom))}
            </span>
            <span className="text-sm text-white/55">
              {floorRoomPct.toFixed(0)}% of starting bank remaining
            </span>
          </div>
          <ProgressBar
            pct={floorRoomPct}
            tone={floorRoomPct < 25 ? "amber" : "green"}
          />
          <div className="text-xs text-white/55 tabular-nums">
            Floor {formatCurrency(floor)} · Equity {formatCurrency(equityCents)}
          </div>
        </TextureCardContent>
      </TextureCard>

      <div className="text-xs text-white/55 text-center pb-4">
        See full rules at{" "}
        <Link href="/dashboard/rules" className="text-[#A769FF] hover:text-[#A769FF]">
          /dashboard/rules
        </Link>
        .
      </div>
    </div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse" aria-hidden>
      {/* Title + subtitle */}
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
        <div className="h-4 w-80 rounded-md bg-gray-100 dark:bg-[#1f0a3d]/60" />
      </div>

      {/* 3-phase strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-gray-100 dark:bg-[#1f0a3d]/60 border border-gray-200 dark:border-white/10"
          />
        ))}
      </div>

      {/* Profit card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-[#180630] p-6 space-y-4">
        <div className="h-5 w-56 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
        <div className="flex items-baseline justify-between">
          <div className="h-9 w-32 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
          <div className="h-4 w-28 rounded-md bg-gray-100 dark:bg-[#1f0a3d]/60" />
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#1f0a3d]" />
      </div>

      {/* Trading days card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-[#180630] p-6 space-y-4">
        <div className="h-5 w-48 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
        <div className="flex items-baseline justify-between">
          <div className="h-7 w-20 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
          <div className="h-4 w-24 rounded-md bg-gray-100 dark:bg-[#1f0a3d]/60" />
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#1f0a3d]" />
      </div>

      {/* Drawdown room card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-[#180630] p-6 space-y-4">
        <div className="h-5 w-44 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
        <div className="flex items-baseline justify-between">
          <div className="h-7 w-32 rounded-md bg-gray-200 dark:bg-[#1f0a3d]" />
          <div className="h-4 w-28 rounded-md bg-gray-100 dark:bg-[#1f0a3d]/60" />
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#1f0a3d]" />
        <div className="h-3 w-72 rounded-md bg-gray-100 dark:bg-[#1f0a3d]/60" />
      </div>
    </div>
  );
}
