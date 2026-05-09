"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_url") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthShell
      side="in"
      ctaSwitchHref="/sign-up"
      ctaSwitchLabel="Create one"
      ctaSwitchPrompt="Don't have an account?"
    >
      <div className="space-y-1.5">
        <h2
          className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "var(--font-mona-sans, var(--font-sans))" }}
        >
          Welcome back
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sign in to continue trading.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <GoogleAuthButton redirectTo={redirectTo} onError={setError} />
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
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Password
            </label>
            <button
              type="button"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setError("Password reset is coming soon. Email hello@oraclefunded.dev for help.")}
            >
              Forgot?
            </button>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
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
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/25 active:translate-y-[0.5px] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
