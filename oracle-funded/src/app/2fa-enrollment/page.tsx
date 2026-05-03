"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type Step = "intro" | "scan" | "verify" | "done";

const stepOrder: Step[] = ["intro", "scan", "verify", "done"];
const stepLabels: Record<Step, string> = {
  intro: "Intro",
  scan: "Scan",
  verify: "Verify",
  done: "Done",
};

const MOCK_SECRET = "JBSWY3DPEHPK3PXP";
const MOCK_RECOVERY_CODES = [
  "g7d2-4kx9-1mq8",
  "p4w8-2hn5-7tj1",
  "v9k3-6bc2-8sl4",
  "r5n7-1xz8-3qp2",
  "h2m6-9wd4-5fy7",
  "t8j1-3kp5-2nb9",
];

export default function TwoFAEnrollmentPage() {
  const [step, setStep] = useState<Step>("intro");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const stepIndex = stepOrder.indexOf(step);

  const next = (s: Step) => setStep(s);

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-1">
            {stepOrder.map((s, i) => {
              const reached = i <= stepIndex;
              return (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition",
                      reached ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-[11px]",
                      reached ? "text-indigo-300" : "text-slate-500"
                    )}
                  >
                    {stepLabels[s]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-indigo-500"
              initial={false}
              animate={{ width: `${((stepIndex + 1) / stepOrder.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[360px]">
          <AnimatePresence mode="wait">
            {step === "intro" && (
              <StepWrap key="intro">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/15 rounded-lg">
                    <ShieldCheckIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold">Enroll in two-factor auth</h1>
                </div>
                <p className="text-sm text-slate-300 max-w-prose">
                  Required for admin and owner roles. You&apos;ll use an authenticator app
                  (1Password, Authy, Google Authenticator, etc.) to generate a 6-digit
                  code at sign-in.
                </p>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                  <strong>Mockup note:</strong> this flow is a placeholder. Real
                  Supabase MFA TOTP wiring lands in §6 of the WebFlux MVP plan.
                </div>
                <button
                  onClick={() => next("scan")}
                  className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition w-full"
                >
                  Get started
                </button>
              </StepWrap>
            )}

            {step === "scan" && (
              <StepWrap key="scan">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/15 rounded-lg">
                    <QrCodeIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold">Scan the QR code</h1>
                </div>
                <p className="text-sm text-slate-300">
                  Open your authenticator app and scan this code. Or enter the secret
                  manually.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 items-center">
                  {/* QR placeholder */}
                  <div className="aspect-square bg-white rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-7 gap-0.5 p-3">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-3 w-3",
                            // Pseudo-random pattern based on index
                            (i * 7 + (i % 3)) % 3 === 0 ? "bg-black" : "bg-white"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-400 mb-1">
                      Manual entry secret
                    </p>
                    <button
                      onClick={() => copy(MOCK_SECRET, "secret")}
                      className="w-full text-left bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm hover:border-indigo-500 transition flex items-center justify-between"
                    >
                      <span>{MOCK_SECRET}</span>
                      <ClipboardDocumentIcon className="h-4 w-4 text-slate-500" />
                    </button>
                    {copied === "secret" && (
                      <p className="text-xs text-emerald-400 mt-1">Copied</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => next("intro")}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => next("verify")}
                    className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
                  >
                    I&apos;ve scanned it
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "verify" && (
              <StepWrap key="verify">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/15 rounded-lg">
                    <KeyIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold">Enter the 6-digit code</h1>
                </div>
                <p className="text-sm text-slate-300">
                  From your authenticator app. Mock flow accepts any 6 digits.
                </p>

                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="mt-4 w-full text-center text-3xl font-mono tracking-[0.5em] bg-slate-900 border border-slate-700 rounded-lg px-4 py-4 focus:outline-none focus:border-indigo-500"
                />

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => next("scan")}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => next("done")}
                    disabled={code.length !== 6}
                    className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Verify
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "done" && (
              <StepWrap key="done">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/15 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h1 className="text-xl font-bold">2FA enrolled</h1>
                </div>
                <p className="text-sm text-slate-300">
                  Save these recovery codes somewhere safe. Each can be used once if you
                  lose access to your authenticator app.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {MOCK_RECOVERY_CODES.map((c) => (
                    <button
                      key={c}
                      onClick={() => copy(c, c)}
                      className="font-mono text-sm bg-slate-900 border border-slate-700 rounded px-3 py-2 text-left hover:border-indigo-500 transition flex items-center justify-between"
                    >
                      <span>{c}</span>
                      {copied === c ? (
                        <span className="text-xs text-emerald-400">copied</span>
                      ) : (
                        <ClipboardDocumentIcon className="h-3.5 w-3.5 text-slate-500" />
                      )}
                    </button>
                  ))}
                </div>

                <Link
                  href="/admin"
                  className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition w-full"
                >
                  Continue to admin
                </Link>
              </StepWrap>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
