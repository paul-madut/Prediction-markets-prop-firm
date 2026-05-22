"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ArrowPathIcon, ExclamationTriangleIcon, EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setInfo("Check your email to confirm your address, then sign in.");
      return;
    }

    // Auto-confirm: register membership against the demo firm.
    try {
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmSlug: "demo" }),
      });
    } catch {
      // Non-fatal — user can be onboarded post-login.
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  // Lightweight password strength signal (visual only — server enforces minLength=8).
  const strength = (() => {
    let s = 0;
    if (password.length >= 8) s += 1;
    if (/[A-Z]/.test(password)) s += 1;
    if (/[0-9]/.test(password)) s += 1;
    if (/[^A-Za-z0-9]/.test(password)) s += 1;
    return s;
  })();

  return (
    <AuthShell
      side="up"
      ctaSwitchHref="/sign-in"
      ctaSwitchLabel="Sign in"
      ctaSwitchPrompt="Already have an account?"
    >
      <div className="space-y-1.5">
        <h2
          className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "var(--font-mona-sans, var(--font-sans))" }}
        >
          Create your account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Free to start — challenge fees apply when you buy your first evaluation.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <GoogleAuthButton label="Sign up with Google" onError={setError} />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            or
          </span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Email
          </label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full pl-9 pr-3.5 py-2.5 bg-[#180630] border border-slate-200 dark:border-white/15 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7F24FF]/30 focus:border-[#7F24FF] transition-all"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={8}
            placeholder="At least 8 characters"
          />
          {/* Subtle strength meter. Doesn't gate submit — backend minLength is the source of truth. */}
          {password.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    strength > i
                      ? strength === 1
                        ? "bg-rose-400"
                        : strength === 2
                          ? "bg-amber-400"
                          : strength === 3
                            ? "bg-blue-400"
                            : "bg-emerald-400"
                      : "bg-slate-200 dark:bg-[#1f0a3d]"
                  }`}
                />
              ))}
              <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-2">
                {strength === 0 ? "" : strength === 1 ? "weak" : strength === 2 ? "fair" : strength === 3 ? "good" : "strong"}
              </span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-sm text-red-700 dark:text-red-300"
            >
              <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {info && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-3 py-2 bg-[#7F24FF]/10 bg-[#1f0a3d]/40 border border-[#A769FF]/30 dark:border-blue-900 rounded-lg text-sm text-[#7F24FF] text-[#A769FF]"
            >
              <CheckCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{info}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-gradient-to-b from-[#A769FF] to-[#7F24FF] text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:from-[#7F24FF] hover:to-[#6c14ee] hover:shadow-xl hover:shadow-blue-500/25 active:translate-y-[0.5px] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
