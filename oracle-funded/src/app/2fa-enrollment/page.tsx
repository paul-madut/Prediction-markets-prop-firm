"use client";

// /2fa-enrollment — real Supabase MFA TOTP enrollment.
//
// Flow:
//   1. Intro: explain why MFA is needed (admin/owner only).
//   2. Scan: call supabase.auth.mfa.enroll({ factorType: 'totp' }) to get a
//      pending factor with a QR-code SVG and an alphanumeric secret. User
//      scans into 1Password / Authy / etc.
//   3. Verify: call mfa.challenge → mfa.verify with the 6-digit code from
//      the authenticator. Success upgrades the session to aal2, which is
//      what `requireAdmin()` checks.
//   4. Done: session is now MFA-elevated; redirect to /admin.
//
// Existing factors: if the user already enrolled, mfa.listFactors() returns
// a verified factor and we skip straight to "challenge to elevate".

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type Step = "intro" | "scan" | "verify" | "done" | "elevate";

const stepOrder: Step[] = ["intro", "scan", "verify", "done"];
const stepLabels: Record<Step, string> = {
  intro: "Intro",
  scan: "Scan",
  verify: "Verify",
  done: "Done",
  elevate: "Verify",
};

interface PendingFactor {
  factorId: string;
  qrSvg: string;
  secret: string;
  uri: string;
}

export default function TwoFAEnrollmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>("intro");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFactor | null>(null);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: if the user already has a verified factor, switch to the
  // "elevate this session to aal2" path (no fresh enrollment needed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listErr) {
        // Not signed in or transient — leave at intro.
        return;
      }
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setVerifiedFactorId(verified.id);
        setStep("elevate");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = step === "elevate" ? 2 : stepOrder.indexOf(step);

  async function startEnrollment(): Promise<void> {
    setSubmitting(true);
    setError(null);
    const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Blueberry Funded · ${new Date().toISOString().slice(0, 10)}`,
    });
    setSubmitting(false);
    if (enrollErr || !data) {
      setError(enrollErr?.message ?? "Failed to start MFA enrollment");
      return;
    }
    setPending({
      factorId: data.id,
      qrSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
    setStep("scan");
  }

  async function verifyEnrollment(): Promise<void> {
    if (!pending || code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    const { data: challengeData, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId: pending.factorId });
    if (challengeErr || !challengeData) {
      setError(challengeErr?.message ?? "Failed to challenge MFA factor");
      setSubmitting(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: pending.factorId,
      challengeId: challengeData.id,
      code,
    });
    setSubmitting(false);
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    setStep("done");
  }

  async function elevateSession(): Promise<void> {
    if (!verifiedFactorId || code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    const { data: challengeData, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId: verifiedFactorId });
    if (challengeErr || !challengeData) {
      setError(challengeErr?.message ?? "Failed to challenge MFA factor");
      setSubmitting(false);
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: verifiedFactorId,
      challengeId: challengeData.id,
      code,
    });
    setSubmitting(false);
    if (verifyErr) {
      setError(verifyErr.message);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function unenroll(): Promise<void> {
    if (!verifiedFactorId) return;
    if (!confirm("Remove the existing TOTP factor and start over? You'll need to re-enroll before performing admin actions.")) return;
    setSubmitting(true);
    setError(null);
    const { error: unErr } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactorId,
    });
    setSubmitting(false);
    if (unErr) {
      setError(unErr.message);
      return;
    }
    setVerifiedFactorId(null);
    setCode("");
    setStep("intro");
  }

  const copy = async (value: string, key: string): Promise<void> => {
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
        {/* Progress bar */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between mb-1">
            {stepOrder.map((s, i) => {
              const reached = i <= stepIndex;
              return (
                <div key={s} className="flex-1 flex flex-col items-center">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition",
                      reached ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400",
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-[11px]",
                      reached ? "text-indigo-300" : "text-slate-500",
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
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  Required for admin and owner roles. You&apos;ll use an
                  authenticator app (1Password, Authy, Google Authenticator,
                  etc.) to generate a 6-digit code at sign-in.
                </p>
                <p className="text-sm text-slate-400 mt-3 max-w-prose">
                  Backed by Supabase MFA (TOTP). Once enrolled, your session is
                  upgraded to AAL2 — the level required by the admin
                  middleware.
                </p>
                <button
                  onClick={() => void startEnrollment()}
                  disabled={submitting}
                  className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition w-full disabled:opacity-50"
                >
                  {submitting ? "Starting…" : "Get started"}
                </button>
              </StepWrap>
            )}

            {step === "scan" && pending && (
              <StepWrap key="scan">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/15 rounded-lg">
                    <QrCodeIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold">Scan the QR code</h1>
                </div>
                <p className="text-sm text-slate-300">
                  Open your authenticator app and scan this code, or enter the
                  secret manually.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 items-center">
                  <div
                    className="aspect-square bg-white rounded-lg flex items-center justify-center p-3"
                    // Supabase returns the QR as an SVG string.
                    dangerouslySetInnerHTML={{ __html: pending.qrSvg }}
                  />
                  <div>
                    <p className="text-xs uppercase text-slate-400 mb-1">
                      Manual entry secret
                    </p>
                    <button
                      onClick={() => void copy(pending.secret, "secret")}
                      className="w-full text-left bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs hover:border-indigo-500 transition flex items-center justify-between break-all"
                    >
                      <span className="break-all">{pending.secret}</span>
                      <ClipboardDocumentIcon className="h-4 w-4 text-slate-500 ml-2 flex-shrink-0" />
                    </button>
                    {copied === "secret" && (
                      <p className="text-xs text-emerald-400 mt-1">Copied</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setStep("intro")}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep("verify")}
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
                <p className="text-sm text-slate-300">From your authenticator app.</p>

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
                    onClick={() => setStep("scan")}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => void verifyEnrollment()}
                    disabled={code.length !== 6 || submitting}
                    className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Verifying…" : "Verify"}
                  </button>
                </div>
              </StepWrap>
            )}

            {step === "elevate" && (
              <StepWrap key="elevate">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/15 rounded-lg">
                    <KeyIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h1 className="text-xl font-bold">Verify to continue</h1>
                </div>
                <p className="text-sm text-slate-300">
                  You&apos;re already enrolled in TOTP. Enter your current
                  authenticator code to upgrade this session to AAL2.
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
                    onClick={() => void unenroll()}
                    disabled={submitting}
                    className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Remove factor
                  </button>
                  <button
                    onClick={() => void elevateSession()}
                    disabled={code.length !== 6 || submitting}
                    className="flex-1 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Verifying…" : "Verify"}
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
                  Your session is now AAL2. Admin actions are unlocked. Keep
                  your authenticator app safe — if you lose it, you&apos;ll need
                  an admin or owner to remove the factor on your account.
                </p>

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
