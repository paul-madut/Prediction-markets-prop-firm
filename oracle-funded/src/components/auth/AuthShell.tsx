"use client";

// Shared auth-page chrome: full-bleed two-column layout. Left column
// carries the brand + value prop on a dark gradient with subtle radial
// glows; right column hosts the form on a clean light surface.
//
// Mobile collapses to a single column with the form first; the marketing
// content is hidden below `lg` to keep mobile load lean.

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/16/solid";
import type { ReactNode } from "react";

const FEATURES = [
  {
    title: "Broker backed, real capital",
    body: "Live execution against tier-1 broker liquidity from the first trade. No simulators.",
  },
  {
    title: "Up to 90% profit split",
    body: "Static or trailing drawdown. Scale to higher allocations as you stay consistent.",
  },
  {
    title: "No time limit",
    body: "Pass the evaluation at your own pace. One challenge fee, lifetime access until you breach.",
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0C0319]">
      {/* ────────── Left: marketing + brand ────────── */}
      <aside className="relative hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-between p-12 xl:p-16 overflow-hidden bg-[#0C0319]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.6) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
        {/* Purple aurora glows */}
        <div className="absolute top-[-12%] left-[-8%] w-[40rem] h-[40rem] rounded-full pointer-events-none animate-aurora"
          style={{ background: "radial-gradient(closest-side, rgba(127, 36, 255, 0.45), rgba(127, 36, 255, 0) 70%)" }} />
        <div className="absolute bottom-[-18%] right-[-12%] w-[44rem] h-[44rem] rounded-full pointer-events-none animate-aurora"
          style={{ background: "radial-gradient(closest-side, rgba(167, 105, 255, 0.35), rgba(167, 105, 255, 0) 70%)", animationDelay: "3s" }} />
        <div className="absolute top-[40%] left-[20%] w-[28rem] h-[28rem] rounded-full pointer-events-none animate-aurora"
          style={{ background: "radial-gradient(closest-side, rgba(127, 36, 255, 0.20), rgba(127, 36, 255, 0) 70%)", animationDelay: "6s" }} />

        {/* Top: wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <Link href="/" className="inline-flex items-center text-white hover:opacity-90">
            <Image
              src="/blueberry-logo.png"
              alt="Blueberry Funded"
              width={520}
              height={200}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </motion.div>

        {/* Middle: hero copy */}
        <div className="relative z-10 max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-5xl xl:text-[64px] font-bold tracking-tight text-white leading-[1.05]"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.025em" }}
          >
            Trade live markets,
            <br />
            <span className="bb-grad-text">
              {side === "in" ? "with our capital." : "scale with our backing."}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-lg text-white/70 leading-relaxed max-w-lg"
          >
            Broker-backed evaluations with no time limit. Pass once, get funded, and keep up to 90% of your profits.
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
                <span className="mt-0.5 inline-flex w-5 h-5 rounded-full bg-[#12DFBA]/20 border border-[#12DFBA]/40 items-center justify-center shrink-0">
                  <CheckIcon className="w-3 h-3 text-[#12DFBA]" />
                </span>
                <div>
                  <div className="text-white font-medium">{f.title}</div>
                  <div className="text-sm text-white/60 mt-0.5 leading-relaxed">{f.body}</div>
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
            <div className="text-white/45 uppercase tracking-wider">Account size</div>
            <div className="text-white text-base font-semibold mt-0.5">$5K – $200K</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-white/45 uppercase tracking-wider">Profit split</div>
            <div className="text-white text-base font-semibold mt-0.5">Up to 90%</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-white/45 uppercase tracking-wider">Time limit</div>
            <div className="text-white text-base font-semibold mt-0.5">None</div>
          </div>
        </motion.div>
      </aside>

      {/* ────────── Right: form column ────────── */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-[#0C0319] relative">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(600px circle at 70% -10%, rgba(127, 36, 255, 0.18), transparent 60%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile-only wordmark — left column is hidden < lg */}
          <Link href="/" className="lg:hidden inline-flex items-center text-white mb-8">
            <Image
              src="/blueberry-logo.png"
              alt="Blueberry Funded"
              width={520}
              height={200}
              priority
              className="h-8 w-auto"
            />
          </Link>

          {children}

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-white/65">
              {ctaSwitchPrompt}{" "}
              <Link
                href={ctaSwitchHref}
                className="font-medium text-[#A769FF] hover:text-[#7F24FF]"
              >
                {ctaSwitchLabel}
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-white/40 leading-relaxed">
            Protected by Supabase Auth. Encrypted in transit and at rest.
            <br />
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white/70">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white/70">
              Privacy Policy
            </Link>.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
