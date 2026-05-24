"use client";

// /dashboard/help — static FAQ + support contact. No live data needed; the
// content here describes the platform behaviour the eval engine and order
// engine actually implement.

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDownIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
const GENTLE = { type: "spring" as const, stiffness: 150, damping: 20 };

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
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
        >
          Buy Challenge
        </Link>{" "}
        page. Pay by card (Authorize.net) or crypto (NOWPayments) — once
        the payment confirms, your account is provisioned automatically and
        you can place orders from any market detail page.
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
            <strong className="text-white">Static</strong>: floor is fixed at a
            percentage below your starting balance.
          </li>
          <li>
            <strong className="text-white">Trailing-EOD</strong>: floor moves up
            each day, tracking a percentage below your highest end-of-day
            reference (balance, equity, or whichever is higher — your config
            decides).
          </li>
        </ul>
        Your{" "}
        <Link
          href="/dashboard/rules"
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
        >
          Rules
        </Link>{" "}
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
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
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
            <strong className="text-white">stale_price</strong> — the quote we
            have is &gt;30 seconds old; the engine refuses to fill against stale
            data.
          </li>
          <li>
            <strong className="text-white">position_limit_exceeded</strong> —
            you&apos;ve hit max-positions-per-market or max-positions-total from
            your config.
          </li>
          <li>
            <strong className="text-white">insufficient_funds</strong> — the
            order&apos;s notional cost exceeds your balance.
          </li>
          <li>
            <strong className="text-white">cooldown_active</strong> — a news
            event is in cooldown for this market; orders are temporarily
            blocked.
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
    <div
      className={cn(
        "rounded-xl border bg-[#180630] overflow-hidden",
        "transition-[border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
        open ? "border-white/[0.18]" : "border-white/10",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full h-14 px-5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        <span className="text-[15px] font-semibold text-white">{qa.q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={SNAPPY}
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0",
            open ? "bg-[#7F24FF]/15 text-[#A769FF]" : "bg-white/[0.06] text-white/55",
          )}
        >
          <ChevronDownIcon className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: GENTLE,
              opacity: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5">
              <div className="pt-3 border-t border-white/10">
                <div className="pt-3 text-base text-white/75 leading-relaxed">
                  {qa.a}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1
          className="text-[32px] leading-[38px] font-bold text-white tracking-[-0.02em] inline-flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <QuestionMarkCircleIcon className="w-7 h-7 text-[#A769FF]" />
          Help
        </h1>
        <p className="text-base text-white/65 mt-2 leading-relaxed">
          Quick answers about challenges, drawdown, fills, and payouts. For
          anything else, email support.
        </p>
      </div>

      <div className="p-6 rounded-xl bg-[#180630] border border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-[24px] leading-[30px] font-semibold text-white tracking-[-0.015em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Email support
          </h2>
          <p className="text-base text-white/65 mt-1">
            We answer within 24 hours on business days.
          </p>
        </div>
        <a
          href="mailto:support@blueberryfunded.com"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-white/[0.06] hover:bg-white/[0.08] text-white text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45"
        >
          <EnvelopeIcon className="w-4 h-4" />
          support@blueberryfunded.com
        </a>
      </div>

      <div className="space-y-2">
        <h2
          className="text-[24px] leading-[30px] font-semibold text-white tracking-[-0.015em] mt-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          FAQ
        </h2>
        {FAQ.map((qa, idx) => (
          <FaqItem key={idx} qa={qa} idx={idx} />
        ))}
      </div>

      <div className="text-xs text-center text-white/55 pb-4">
        See also:{" "}
        <Link
          href="/dashboard/rules"
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
        >
          Rules
        </Link>
        {" · "}
        <Link
          href="/dashboard/challenge"
          className="text-[#A769FF] hover:text-[#7F24FF] transition-colors duration-150"
        >
          Challenge progress
        </Link>
      </div>
    </div>
  );
}
