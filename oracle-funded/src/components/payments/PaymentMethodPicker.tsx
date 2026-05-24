"use client";

// Two-choice radio between Card (Authorize.net) and Crypto (NOWPayments).
// Styled per DESIGN.md: secondary-card surface, primary glow + brand border
// when selected, snappy press, layoutId selection accent.

import { motion } from "framer-motion";
import { CreditCardIcon } from "@heroicons/react/24/outline";
import { CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

export type PaymentMethod = "card" | "crypto";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
const RESPONSIVE = { type: "spring" as const, stiffness: 300, damping: 30 };

interface Option {
  id: PaymentMethod;
  title: string;
  body: string;
  icon: typeof CreditCardIcon;
  provider: string;
}

const OPTIONS: Option[] = [
  {
    id: "card",
    title: "Card",
    body: "Visa, Mastercard, Amex, Discover. Hosted by our payment processor — your card details never touch our servers.",
    icon: CreditCardIcon,
    provider: "via Authorize.net",
  },
  {
    id: "crypto",
    title: "Crypto",
    body: "BTC, ETH, USDC, USDT, and 200+ other coins. Pay from any wallet — no account required.",
    icon: CurrencyDollarIcon,
    provider: "via NOWPayments",
  },
];

export function PaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Payment method"
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.id;
        const Icon = opt.icon;
        return (
          <motion.button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            whileHover={disabled ? undefined : { y: -1 }}
            transition={SNAPPY}
            className={cn(
              "relative text-left rounded-xl p-6 transition-colors duration-150 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:ring-offset-0",
              selected
                ? "bg-[#1f0a3d] border border-[#A769FF]/40"
                : "bg-[#180630] border border-white/10 hover:bg-[#1f0a3d] hover:border-white/[0.18]",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            {selected && (
              <motion.span
                layoutId="payment-method-glow"
                transition={RESPONSIVE}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  boxShadow:
                    "inset 0 0 0 1px rgba(167,105,255,0.25), 0 8px 24px -6px rgba(127,36,255,0.55)",
                }}
              />
            )}

            <div className="relative flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                  selected ? "bg-[#7F24FF]/20 text-[#A769FF]" : "bg-white/[0.04] text-white/70",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-base font-semibold text-white"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {opt.title}
                  </span>
                  <span
                    className="text-[11px] uppercase tracking-[0.08em] text-white/45 font-mono"
                  >
                    {opt.provider}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/65 leading-relaxed">{opt.body}</p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
