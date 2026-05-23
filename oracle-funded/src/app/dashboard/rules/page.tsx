"use client";

// /dashboard/rules — plain-English rulebook for the trader's active account.
// Sources from /api/accounts/[id]: config + currentPhase + ruleOverrides.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
 ShieldCheckIcon,
 ChartBarIcon,
 CurrencyDollarIcon,
 ClockIcon,
 ExclamationTriangleIcon,
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
 currentBalanceCents: string;
 drawdownFloorCents: string;
 startingBalanceCents: string;
 ruleOverrides: Record<string, unknown> | null;
 config: {
 name: string;
 accountSizeCents: string;
 drawdownType: string;
 trailingReference: string;
 totalDrawdownPct: string;
 dailyDrawdownPct: string | null;
 profitSplitPct: string;
 breachComparison: string;
 breachCloseBehavior: string;
 maxPositionsPerMarket: number;
 maxPositionsTotal: number;
 maxContractsPerOrder: number | null;
 };
 currentPhase: Phase;
}

function Section({
 title,
 icon,
 children,
}: {
 title: string;
 icon: React.ReactNode;
 children: React.ReactNode;
}) {
 return (
 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 space-y-3">
 <h2 className="text-lg font-semibold text-white inline-flex items-center gap-2">
 {icon}
 {title}
 </h2>
 <div className="text-sm text-white/85 space-y-2">
 {children}
 </div>
 </TextureCardContent>
 </TextureCard>
 );
}

function describeDrawdown(c: AccountDetail["config"]): string {
 if (c.drawdownType === "static") {
 return `Static drawdown — your floor is fixed at ${c.totalDrawdownPct}% below the starting balance and never moves.`;
 }
 const ref =
 c.trailingReference === "eod_balance"
 ? "end-of-day balance"
 : c.trailingReference === "eod_equity"
 ? "end-of-day equity"
 : "the higher of end-of-day balance and equity";
 return `Trailing-EOD drawdown — your floor moves up each day to track ${c.totalDrawdownPct}% below the highest ${ref} you've recorded.`;
}

function describeBreach(c: AccountDetail["config"]): string {
 const cmp =
 c.breachComparison === "lt"
 ? "drops strictly below"
 : "touches or drops below";
 const close =
 c.breachCloseBehavior === "mark_to_floor"
 ? "All open positions are closed at prices chosen so your final balance lands on the floor exactly. No further loss past the floor."
 : "Open positions are closed at the current market bid.";
 return `If your equity ${cmp} the drawdown floor, your account is breached. ${close}`;
}

export default function RulesPage() {
 const { activeAccount, signedIn } = useApp();
 const [account, setAccount] = useState<AccountDetail | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!activeAccount) return;
 api
 .get<AccountDetail>(`/api/accounts/${activeAccount.id}`)
 .then(setAccount)
 .catch((err) =>
 setError(err instanceof ApiError ? err.message : String(err)),
 );
 }, [activeAccount?.id]);

 if (!signedIn) {
 return (
 <div className="max-w-3xl mx-auto py-12 text-center text-sm text-white/55">
 Sign in to view your rules.
 </div>
 );
 }

 if (!activeAccount) {
 return (
 <div className="max-w-3xl mx-auto py-12 text-center space-y-3">
 <h1 className="text-2xl font-bold text-white">
 Trading Rules
 </h1>
 <p className="text-sm text-white/55">
 Buy a challenge to see the rules that apply to your account.
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
 <div className="max-w-3xl mx-auto py-12 bg-[#FF1C1C]/10 border border-[#FF1C1C]/30 rounded-xl px-4 py-3 text-sm text-[#FF6B6B]">
 {error}
 </div>
 );
 }

 if (!account) {
 return (
 <div className="max-w-3xl mx-auto py-12 text-center text-sm text-white/55">
 Loading rules…
 </div>
 );
 }

 const c = account.config;
 const accountSize = Number(c.accountSizeCents);
 const startingBalance = Number(account.startingBalanceCents);
 const totalDD = Number(c.totalDrawdownPct);
 const totalDDdollars = Math.round((startingBalance * totalDD) / 100);
 const dailyDD = c.dailyDrawdownPct ? Number(c.dailyDrawdownPct) : null;
 const dailyDDdollars =
 dailyDD !== null ? Math.round((startingBalance * dailyDD) / 100) : null;
 const phaseTargetPct = Number(account.currentPhase.profitTargetPct);
 const phaseTargetDollars = Math.round((startingBalance * phaseTargetPct) / 100);

 const overrides = (account.ruleOverrides ?? {}) as Record<string, unknown>;
 const hasOverrides = Object.keys(overrides).length > 0;

 return (
 <div className="space-y-6 max-w-4xl mx-auto">
 <div>
 <h1 className="text-3xl font-bold text-white">
 Trading Rules
 </h1>
 <p className="text-sm text-white/55 mt-1">
 The rules that apply to your <strong>{c.name}</strong> account ({formatCurrency(accountSize)}).
 </p>
 </div>

 {hasOverrides && (
 <div className="rounded-xl border border-[#FFB539]/30 bg-[#FFB539]/10 px-4 py-3 text-sm text-amber-900 inline-flex items-start gap-2">
 <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
 <div>
 Your account has admin overrides that take precedence over the
 defaults below. Effective values:
 <pre className="mt-1 text-xs bg-[#FFB539]/15 rounded px-2 py-1 inline-block whitespace-pre-wrap">
 {JSON.stringify(overrides, null, 0)}
 </pre>
 </div>
 </div>
 )}

 <Section title="Current phase" icon={<ChartBarIcon className="w-5 h-5 text-[#A769FF]" />}>
 <p>
 You are on <strong>{account.currentPhase.name}</strong> (phase{" "}
 {account.currentPhase.phaseNumber}). Pass this phase by reaching{" "}
 <strong>{phaseTargetPct}% profit</strong> ({formatCurrency(phaseTargetDollars)})
 and trading at least <strong>{account.currentPhase.minTradingDays} day{account.currentPhase.minTradingDays === 1 ? "" : "s"}</strong>.
 </p>
 <p className="text-xs text-white/55">
 A trading day counts whenever you open or close at least one position.
 </p>
 </Section>

 <Section title="Drawdown" icon={<ShieldCheckIcon className="w-5 h-5 text-[#12DFBA]" />}>
 <p>{describeDrawdown(c)}</p>
 <ul className="list-disc list-inside space-y-1">
 <li>
 <strong>Total drawdown:</strong> {totalDD}% ({formatCurrency(totalDDdollars)})
 </li>
 {dailyDD !== null && dailyDDdollars !== null && (
 <li>
 <strong>Daily loss limit:</strong> {dailyDD}% ({formatCurrency(dailyDDdollars)} per
 day, resets at 00:01 UTC)
 </li>
 )}
 </ul>
 <p className="text-xs text-white/55 italic">
 {describeBreach(c)}
 </p>
 </Section>

 <Section title="Position limits" icon={<ChartBarIcon className="w-5 h-5 text-violet-600" />}>
 <ul className="list-disc list-inside space-y-1">
 <li>
 Maximum <strong>{c.maxPositionsPerMarket}</strong> open position
 {c.maxPositionsPerMarket === 1 ? "" : "s"} per market
 </li>
 <li>
 Maximum <strong>{c.maxPositionsTotal}</strong> open positions across
 all markets
 </li>
 {c.maxContractsPerOrder !== null && (
 <li>
 Maximum <strong>{c.maxContractsPerOrder}</strong> contracts per
 order
 </li>
 )}
 </ul>
 </Section>

 <Section title="Profit split" icon={<CurrencyDollarIcon className="w-5 h-5 text-[#12DFBA]" />}>
 <p>
 When you reach the <strong>funded</strong> stage, your share of profits
 is <strong>{c.profitSplitPct}%</strong>; the firm keeps the rest. Payouts
 are reviewed in the admin queue and processed off-platform.
 </p>
 </Section>

 <Section title="Order types" icon={<ClockIcon className="w-5 h-5 text-[#FFB539]" />}>
 <ul className="list-disc list-inside space-y-1">
 <li>
 <strong>Market orders</strong> only at MVP. Fills at the current ask
 (buy) or bid (sell) on Polymarket.
 </li>
 <li>
 Latency-arbitrage protection: orders priced against quotes older than
 30 seconds are rejected; a 500&nbsp;ms minimum-age cushion applies
 after each successful fill.
 </li>
 <li>
 Rate limit: 10 orders per second per account.
 </li>
 </ul>
 </Section>

 <Section title="What disables your account" icon={<ExclamationTriangleIcon className="w-5 h-5 text-[#FF6B6B]" />}>
 <ul className="list-disc list-inside space-y-1">
 <li>Breach of drawdown floor (mark-to-floor closes positions automatically).</li>
 <li>Refund of the challenge fee (per firm policy).</li>
 <li>Admin discipline action (cheating, latency arbitrage, terms violation).</li>
 </ul>
 </Section>
 </div>
 );
}
