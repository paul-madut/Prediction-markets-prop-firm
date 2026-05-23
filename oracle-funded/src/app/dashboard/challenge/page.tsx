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
import { useApp } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
      ? "bg-[#12DFBA]"
      : tone === "amber"
        ? "bg-[#FFB539]"
        : "bg-[#7F24FF]";
  return (
    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className={cn("h-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]", cls)}
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
      className={cn(
        "rounded-xl border p-4 transition-[background-color,border-color] duration-150",
        active
          ? "border-[#A769FF]/40 bg-[#1f0a3d]"
          : passed
            ? "border-[#12DFBA]/40 bg-[#12DFBA]/[0.08]"
            : "border-white/10 bg-[#180630]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.08em]",
            active ? "text-[#A769FF]" : passed ? "text-[#12DFBA]" : "text-white/55",
          )}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Phase {phaseNumber}
        </span>
        {passed && <CheckCircleIcon className="w-4 h-4 text-[#12DFBA]" />}
      </div>
      <div className="text-sm font-semibold text-white">{name}</div>
      <div
        className="text-xs text-white/55 mt-2"
        style={{ fontFamily: "var(--font-mono)" }}
      >
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
        <h1
          className="text-[24px] leading-[30px] font-semibold text-white tracking-[-0.015em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Challenge Progress
        </h1>
        <p className="text-sm text-white/65">
          Buy a challenge to see your progress.
        </p>
        <Link
          href="/dashboard/new-challenge"
          className="inline-flex items-center justify-center h-11 px-5 rounded-lg bg-[#7F24FF] hover:bg-[#A769FF] text-white text-sm font-semibold transition-colors duration-150"
        >
          Browse challenges
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF1C1C]">
          {error}
        </div>
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
        <h1
          className="text-[32px] leading-[38px] font-bold text-white tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Challenge Progress
        </h1>
        <p className="text-sm text-white/65 mt-2">
          {account.config.name} — current status:{" "}
          <span className="capitalize font-medium text-white">
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
        <div className="p-6 rounded-xl bg-[#12DFBA]/[0.08] border border-[#12DFBA]/30">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-[#12DFBA]" />
            <div>
              <h2 className="text-lg font-semibold text-white">
                You&apos;re funded
              </h2>
              <p className="text-sm text-white/75 mt-0.5">
                Profits are split {account.config.profitSplitPct}% to you, the rest to the firm.
                Request payouts from{" "}
                <Link
                  href="/dashboard/payouts"
                  className="underline underline-offset-2 font-medium text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
                >
                  Payouts
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      {isBreached && (
        <div className="p-6 rounded-xl bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30">
          <h2 className="text-lg font-semibold text-white">Account breached</h2>
          <p className="text-sm text-white/75 mt-1">
            Open positions were closed automatically. Contact support to discuss
            a reset, or buy a new challenge.
          </p>
        </div>
      )}

      {/* Profit-to-target */}
      <div className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-[#A769FF]" />
          <h2 className="text-lg font-semibold text-white">
            Profit toward {account.currentPhase.name}
          </h2>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[32px] leading-[38px] font-bold text-white tabular-nums tracking-[-0.005em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {profitCents >= 0 ? "+" : ""}
            {formatCurrency(profitCents)}
          </span>
          <span
            className="text-sm text-white/55 tabular-nums"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            of {formatCurrency(phaseTargetCents)} target
          </span>
        </div>
        <ProgressBar
          pct={profitProgressPct}
          tone={profitProgressPct >= 100 ? "green" : "blue"}
        />
        <div
          className="text-xs text-white/55 tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {profitPct >= 0 ? "+" : ""}
          {profitPct.toFixed(2)}% · {profitProgressPct.toFixed(0)}% to target
        </div>
      </div>

      {/* Trading days progress */}
      <div className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-[#A769FF]" />
          <h2 className="text-lg font-semibold text-white">Trading days</h2>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[32px] leading-[38px] font-bold text-white tabular-nums tracking-[-0.005em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {account.tradingDaysCount}
          </span>
          <span
            className="text-sm text-white/55 tabular-nums"
            style={{ fontFamily: "var(--font-mono)" }}
          >
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
      </div>

      {/* Drawdown room */}
      <div className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-5 h-5 text-[#12DFBA]" />
          <h2 className="text-lg font-semibold text-white">Drawdown room</h2>
        </div>
        <div className="flex items-baseline justify-between">
          <span
            className="text-[32px] leading-[38px] font-bold text-white tabular-nums tracking-[-0.005em]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
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
        <div
          className="text-xs text-white/55 tabular-nums"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Floor {formatCurrency(floor)} · Equity {formatCurrency(equityCents)}
        </div>
      </div>

      <div className="text-xs text-white/55 text-center pb-4">
        See full rules at{" "}
        <Link
          href="/dashboard/rules"
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
        >
          /dashboard/rules
        </Link>
        .
      </div>
    </div>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto motion-safe:animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-white/[0.06]" />
        <div className="h-4 w-80 rounded-md bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-[#180630] border border-white/10"
          />
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-[#180630] p-6 space-y-4"
        >
          <div className="h-5 w-56 rounded-md bg-white/[0.06]" />
          <div className="flex items-baseline justify-between">
            <div className="h-9 w-32 rounded-md bg-white/[0.06]" />
            <div className="h-4 w-28 rounded-md bg-white/[0.06]" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}
