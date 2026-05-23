"use client";

// /dashboard/help — static FAQ + support contact. No live data needed; the
// content here describes the platform behaviour the eval engine and order
// engine actually implement.

import Link from "next/link";
import {
 EnvelopeIcon,
 QuestionMarkCircleIcon,
 ChevronDownIcon,
} from "@heroicons/react/16/solid";
import { useState } from "react";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";

interface QA {
 q: string;
 a: React.ReactNode;
}

const FAQ: QA[] = [
 {
 q: "How do I start trading?",
 a: (
 <>
 Buy a challenge from the{" "}
 <Link
 href="/dashboard/new-challenge"
 className="text-[#A769FF] hover:text-[#A769FF]"
 >
 Buy Challenge
 </Link>{" "}
 page. Once Stripe confirms the payment, your account is provisioned
 automatically and you can place orders from any market detail page.
 </>
 ),
 },
 {
 q: "What's the difference between a Phase 1, 2, 3 challenge?",
 a: "Phase count = how many evaluation rounds you need to clear before being funded. More phases generally means a lower fee per phase but more time to qualify. Pick the path that fits your style.",
 },
 {
 q: "How is drawdown calculated?",
 a: (
 <>
 Two styles, set per challenge config:
 <ul className="list-disc list-inside mt-2 space-y-1">
 <li>
 <strong>Static</strong>: floor is fixed at a percentage below your
 starting balance.
 </li>
 <li>
 <strong>Trailing-EOD</strong>: floor moves up each day, tracking a
 percentage below your highest end-of-day reference (balance, equity,
 or whichever is higher — your config decides).
 </li>
 </ul>
 Your <Link href="/dashboard/rules" className="text-[#A769FF] hover:text-[#A769FF]">Rules</Link>{" "}
 page shows what applies to your account.
 </>
 ),
 },
 {
 q: "What happens if I breach?",
 a: "If your equity drops below the drawdown floor, your account moves to 'breached'. Open positions are closed at prices chosen so your final balance lands on the floor exactly (no spread loss past the floor). The account stops accepting orders. Buy a new challenge to start over.",
 },
 {
 q: "What does 'mark-to-floor' mean?",
 a: "When you breach, we don't market-sell at the current bid; we compute closing prices that bring your final balance to the floor exactly. This eliminates further loss from a wide spread at the wrong moment, and produces a cleaner audit trail.",
 },
 {
 q: "How do payouts work?",
 a: (
 <>
 Once you&apos;re funded, request payouts from the{" "}
 <Link
 href="/dashboard/payouts"
 className="text-[#A769FF] hover:text-[#A769FF]"
 >
 Payouts
 </Link>{" "}
 page. Each request is reviewed by an admin, then processed off-platform
 (wire/ACH/crypto, depending on your firm). Your share is per the profit
 split on your config (visible on Rules).
 </>
 ),
 },
 {
 q: "Why was my order rejected?",
 a: (
 <>
 Common reasons:
 <ul className="list-disc list-inside mt-2 space-y-1">
 <li>
 <strong>stale_price</strong> — the quote we have is &gt;30 seconds
 old; the engine refuses to fill against stale data.
 </li>
 <li>
 <strong>position_limit_exceeded</strong> — you&apos;ve hit
 max-positions-per-market or max-positions-total from your config.
 </li>
 <li>
 <strong>insufficient_funds</strong> — the order&apos;s notional cost
 exceeds your balance.
 </li>
 <li>
 <strong>cooldown_active</strong> — a news event is in cooldown for
 this market; orders are temporarily blocked.
 </li>
 </ul>
 </>
 ),
 },
 {
 q: "How fresh is the price data?",
 a: "Polymarket prices come from their public Gamma REST endpoint, polled every 30 seconds for active markets. The engine also re-reads the price inside the fill transaction with a FOR UPDATE lock, so the price you fill at is what the order book showed at the moment of fill — even if the page hasn't refreshed.",
 },
 {
 q: "Can I trade outside US market hours?",
 a: "Yes — Polymarket markets run 24/7. Some firms block trading during news cooldowns; check the Rules page for your config's policy.",
 },
 {
 q: "How do I cancel my challenge?",
 a: "Email support. Refunds are handled per your firm's policy on the challenge config (some firms disable the account on refund; some allow continued trading until the next breach event).",
 },
];

function FaqItem({ qa, idx }: { qa: QA; idx: number }) {
 const [open, setOpen] = useState(idx === 0);
 return (
 <button
 onClick={() => setOpen((o) => !o)}
 className="w-full text-left bg-[#180630] border border-gray-200 dark:border-white/10 rounded-xl px-5 py-4 hover:border-[#A769FF] transition-colors"
 >
 <div className="flex items-center justify-between gap-3">
 <span className="font-semibold text-white text-sm">
 {qa.q}
 </span>
 <ChevronDownIcon
 className={`w-4 h-4 text-white/45 transition-transform ${open ? "rotate-180" : ""}`}
 />
 </div>
 {open && (
 <div className="mt-3 text-sm text-white/85 leading-relaxed">
 {qa.a}
 </div>
 )}
 </button>
 );
}

export default function HelpPage() {
 return (
 <div className="space-y-6 max-w-3xl mx-auto">
 <div>
 <h1 className="text-3xl font-bold text-white inline-flex items-center gap-2">
 <QuestionMarkCircleIcon className="w-7 h-7 text-[#A769FF]" />
 Help
 </h1>
 <p className="text-sm text-white/55 mt-1">
 Quick answers about challenges, drawdown, fills, and payouts. For
 anything else, email support.
 </p>
 </div>

 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
 <div>
 <h2 className="text-lg font-semibold text-white">
 Email support
 </h2>
 <p className="text-sm text-white/55">
 We answer within 24 hours on business days.
 </p>
 </div>
 <a
 href="mailto:support@blueberryfunded.com"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7F24FF] hover:bg-[#6c14ee] text-white text-sm font-medium"
 >
 <EnvelopeIcon className="w-4 h-4" />
 support@blueberryfunded.com
 </a>
 </TextureCardContent>
 </TextureCard>

 <div className="space-y-2">
 <h2 className="text-lg font-semibold text-white mt-2">
 FAQ
 </h2>
 {FAQ.map((qa, idx) => (
 <FaqItem key={idx} qa={qa} idx={idx} />
 ))}
 </div>

 <div className="text-xs text-center text-white/55 pb-4">
 See also: <Link href="/dashboard/rules" className="text-[#A769FF] hover:text-[#A769FF]">Rules</Link>
 {" · "}
 <Link href="/dashboard/challenge" className="text-[#A769FF] hover:text-[#A769FF]">Challenge progress</Link>
 </div>
 </div>
 );
}
