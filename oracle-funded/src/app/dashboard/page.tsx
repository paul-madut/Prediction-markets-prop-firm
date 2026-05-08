"use client";

// Trader dashboard home — real account state from /api/accounts +
// /api/accounts/[id]/equity. Replaces the mock-data home page.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { useApp, type AccountRow } from "@/context/AppContext";
import { api, ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";

interface EquitySnapshot {
  accountId: string;
  status: string;
  balanceCents: string;
  openPositionsPnlCents: string;
  equityCents: string;
  drawdownFloorCents: string;
  dailyFloorCents: string | null;
  distanceToFloorCents: string;
  distanceToFloorPct: number;
  isBreach: boolean;
}

export default function DashboardHome() {
  const { user, accounts, activeAccount, setActiveAccount, loading, signedIn } = useApp();

  const [equity, setEquity] = useState<EquitySnapshot | null>(null);
  const [equityError, setEquityError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeAccount) {
      setEquity(null);
      return;
    }
    let cancelled = false;
    setEquityError(null);
    api
      .get<EquitySnapshot>(`/api/accounts/${activeAccount.id}/equity`)
      .then((s) => {
        if (!cancelled) setEquity(s);
      })
      .catch((err) => {
        if (cancelled) return;
        setEquityError(err instanceof ApiError ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [activeAccount]);

  if (loading) return <DashboardSkeleton />;

  if (!signedIn) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Not signed in. Redirecting…</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <TextureCard interactive={false}>
          <TextureCardContent className="p-10 text-center">
            <RocketLaunchIcon className="w-10 h-10 text-blue-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Welcome, {user?.email ?? "trader"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              You don&apos;t have a challenge account yet. Pick one to get started.
            </p>
            <TextureButton variant="primary" size="lg" asChild>
              <Link href="/dashboard/new-challenge">
                Browse Challenges
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </TextureButton>
          </TextureCardContent>
        </TextureCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {user?.email ?? "Trader"}
          </h1>
        </div>
        {accounts.length > 1 && (
          <select
            value={activeAccount?.id ?? ""}
            onChange={(e) => setActiveAccount(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.config.name} · {formatCurrency(Number(a.currentBalanceCents))}
              </option>
            ))}
          </select>
        )}
      </div>

      {activeAccount && <AccountSummary account={activeAccount} equity={equity} equityError={equityError} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextureCard>
          <TextureCardContent className="p-5">
            <RocketLaunchIcon className="w-5 h-5 text-blue-600 mb-2" />
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">New challenge</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Buy another account or scale up.
            </p>
            <Link href="/dashboard/new-challenge" className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
              Browse <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="p-5">
            <ChartBarIcon className="w-5 h-5 text-purple-600 mb-2" />
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Markets</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Live Polymarket data. Place a market order.
            </p>
            <Link href="/dashboard/markets" className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
              Browse <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </TextureCardContent>
        </TextureCard>
        <TextureCard>
          <TextureCardContent className="p-5">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600 mb-2" />
            <div className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Payouts</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Request a payout from a funded account.
            </p>
            <Link href="/dashboard/payouts" className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
              Open <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </TextureCardContent>
        </TextureCard>
      </div>
    </div>
  );
}

function AccountSummary({
  account,
  equity,
  equityError,
}: {
  account: AccountRow;
  equity: EquitySnapshot | null;
  equityError: string | null;
}) {
  const balance = Number(account.currentBalanceCents);
  const starting = Number(account.startingBalanceCents);
  const profit = balance - starting;
  const profitPct = starting > 0 ? (profit / starting) * 100 : 0;
  const phaseLabel =
    account.status === "funded"
      ? "Funded"
      : `Phase ${account.currentPhase.phaseNumber} — ${account.currentPhase.name}`;
  const phaseBadge =
    account.status === "funded"
      ? "bg-green-100 text-green-800"
      : account.status === "breached"
        ? "bg-red-100 text-red-800"
        : account.status === "passed_phase"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";

  const equityCents = equity ? Number(equity.equityCents) : balance;
  const floor = equity ? Number(equity.drawdownFloorCents) : Number(account.drawdownFloorCents);
  const distanceCents = equity ? Number(equity.distanceToFloorCents) : equityCents - floor;
  const distancePct = equity?.distanceToFloorPct ?? (starting > 0 ? (distanceCents / starting) * 100 : 0);
  const isBreach = equity?.isBreach ?? false;

  return (
    <TextureCard interactive={false}>
      <TextureCardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">Account</div>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{account.config.name}</div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${phaseBadge}`}>{phaseLabel}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <Stat label="Balance" value={formatCurrency(balance)} accent="text-gray-900 dark:text-gray-100" />
          <Stat
            label="Equity"
            value={formatCurrency(equityCents)}
            accent="text-gray-900 dark:text-gray-100"
            sub={profit !== 0 ? `${profit > 0 ? "+" : ""}${profitPct.toFixed(2)}%` : undefined}
            subAccent={profit >= 0 ? "text-green-600" : "text-red-600"}
          />
          <Stat
            label="Distance to floor"
            value={formatCurrency(Math.max(0, distanceCents))}
            accent={distancePct < 2 ? "text-amber-600" : "text-gray-900 dark:text-gray-100"}
            sub={`${distancePct.toFixed(2)}% of starting`}
            subAccent="text-gray-500 dark:text-gray-400"
          />
          <Stat
            label="Trading days"
            value={String(account.tradingDaysCount)}
            accent="text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-500 dark:text-gray-400">Floor {formatCurrency(floor)}</span>
            <span className="text-gray-500 dark:text-gray-400">Equity {formatCurrency(equityCents)}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all ${
                isBreach ? "bg-red-500" : distancePct < 2 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.max(2, Math.min(100, ((equityCents - floor) / Math.max(1, starting - floor)) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          {isBreach ? (
            <span className="inline-flex items-center gap-1.5 text-red-600">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <strong>Breached.</strong> Open positions auto-closed at floor.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircleIcon className="w-4 h-4" />
              Account active
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ShieldCheckIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            {account.config.totalDrawdownPct}% total drawdown
            {account.config.dailyDrawdownPct ? ` · ${account.config.dailyDrawdownPct}% daily` : ""}
          </span>
          {equityError && (
            <span className="text-red-600 text-xs">live equity unavailable: {equityError}</span>
          )}
        </div>
      </TextureCardContent>
    </TextureCard>
  );
}

function Stat({
  label,
  value,
  accent,
  sub,
  subAccent,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
  subAccent?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium mb-1">
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${subAccent ?? ""}`}>{sub}</div>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="h-10 w-48 bg-gray-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="h-44 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-28 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-28 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-28 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
