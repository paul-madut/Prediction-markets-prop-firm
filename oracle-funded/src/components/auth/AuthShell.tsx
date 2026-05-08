"use client";

// Shared auth-page chrome: full-bleed two-column layout. Left column
// carries the brand + value prop on a dark gradient with subtle radial
// glows; right column hosts the form on a clean light surface.
//
// Mobile collapses to a single column with the form first; the marketing
// content is hidden below `lg` to keep mobile load lean.

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/16/solid";
import type { ReactNode } from "react";

const FEATURES = [
  {
    title: "Real-time evaluation engine",
    body: "Every fill is checked against your drawdown floor the moment it clears. No surprises at EOD.",
  },
  {
    title: "$25K to $100K accounts",
    body: "Static or trailing-EOD drawdown. 70–80% profit split. Pay once, no monthly fee.",
  },
  {
    title: "Live Polymarket data",
    body: "Trade on real prediction markets — politics, sports, finance — backed by on-chain liquidity.",
  },
];

export function AuthShell({
  side,
  ctaSwitchHref,
  ctaSwitchLabel,
  ctaSwitchPrompt,
  children,
}: {
  /** "left" = sign in, "right" = sign up. Used to vary copy + emphasis subtly. */
  side: "in" | "up";
  ctaSwitchHref: string;
  ctaSwitchLabel: string;
  ctaSwitchPrompt: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-950">
      {/* ────────── Left: marketing + brand ────────── */}
      <aside className="relative hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/80 to-slate-950">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.6) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
        {/* Two large radial glows — fixed not animated, positioned for depth */}
        <div className="absolute top-[-12%] left-[-8%] w-[40rem] h-[40rem] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(56, 189, 248, 0.18), rgba(56, 189, 248, 0) 70%)" }} />
        <div className="absolute bottom-[-18%] right-[-12%] w-[44rem] h-[44rem] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(99, 102, 241, 0.20), rgba(99, 102, 241, 0) 70%)" }} />

        {/* Top: wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-950">
                <path
                  fill="currentColor"
                  d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z M12 6.5 L7 9.5 L7 14.5 L12 17.5 L17 14.5 L17 9.5 Z"
                />
              </svg>
            </div>
            <span className="font-semibold tracking-tight" style={{ fontFamily: "var(--font-mona-sans, var(--font-sans))" }}>
              OracleFunded
            </span>
          </Link>
        </motion.div>

        {/* Middle: hero copy */}
        <div className="relative z-10 max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-5xl xl:text-6xl font-semibold tracking-tight text-white leading-[1.05]"
            style={{ fontFamily: "var(--font-mona-sans, var(--font-sans))" }}
          >
            Trade prediction markets,
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
              {side === "in" ? "professionally." : "with our capital."}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-lg text-slate-300/90 leading-relaxed"
          >
            Pass the evaluation, get funded up to $100,000, and keep up to 80% of profits.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 space-y-5"
          >
            {FEATURES.map((f, i) => (
              <motion.li
                key={f.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 inline-flex w-5 h-5 rounded-full bg-emerald-400/20 border border-emerald-300/40 items-center justify-center shrink-0">
                  <CheckIcon className="w-3 h-3 text-emerald-300" />
                </span>
                <div>
                  <div className="text-white font-medium">{f.title}</div>
                  <div className="text-sm text-slate-400 mt-0.5 leading-relaxed">{f.body}</div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Bottom: stats line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 flex items-center gap-8 text-xs"
          style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
        >
          <div>
            <div className="text-slate-400 uppercase tracking-wider">Account size</div>
            <div className="text-white text-base font-semibold mt-0.5">$25K – $100K</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-slate-400 uppercase tracking-wider">Profit split</div>
            <div className="text-white text-base font-semibold mt-0.5">70–80%</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-slate-400 uppercase tracking-wider">Drawdown</div>
            <div className="text-white text-base font-semibold mt-0.5">4–10%</div>
          </div>
        </motion.div>
      </aside>

      {/* ────────── Right: form column ────────── */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-slate-50 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile-only wordmark — left column is hidden < lg */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2 text-slate-900 dark:text-slate-100 mb-8">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-400 via-indigo-400 to-violet-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-slate-950">
                <path fill="currentColor" d="M12 2 L20 7 L20 17 L12 22 L4 17 L4 7 Z M12 6.5 L7 9.5 L7 14.5 L12 17.5 L17 14.5 L17 9.5 Z" />
              </svg>
            </div>
            <span className="font-semibold tracking-tight">OracleFunded</span>
          </Link>

          {children}

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {ctaSwitchPrompt}{" "}
              <Link
                href={ctaSwitchHref}
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {ctaSwitchLabel}
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            Protected by Supabase Auth. Encrypted in transit and at rest.
            <br />
            By continuing you agree to our{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300">
              Privacy Policy
            </Link>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
