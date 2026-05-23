"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";

// Spring presets from DESIGN.md.
const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_url") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surface OAuth callback errors that arrive as ?error=... in the URL.
  // Without this, the callback route's redirects vanish silently.
  useEffect(() => {
    const e = searchParams.get("error");
    if (e) {
      console.error("[sign-in] error from callback URL:", e);
      setError(e);
    }
  }, [searchParams]);

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
          className="text-[28px] leading-9 font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Welcome back
        </h2>
        <p className="text-sm text-white/65">
          Sign in to continue trading.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <GoogleAuthButton redirectTo={redirectTo} onError={setError} />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span
            className="text-[11px] uppercase tracking-[0.08em] text-white/45"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-[12px] leading-4 font-semibold tracking-[0.02em] text-white/70 mb-2"
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
            className="w-full h-11 px-3.5 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40
                       transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                       focus:outline-none focus:bg-white/[0.06]
                       focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:border-white/15"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-[12px] leading-4 font-semibold tracking-[0.02em] text-white/70"
            >
              Password
            </label>
            <button
              type="button"
              className="text-xs text-white/55 hover:text-[#A769FF] transition-colors duration-150"
              onClick={() =>
                setError("Password reset is coming soon. Email hello@blueberryfunded.com for help.")
              }
            >
              Forgot?
            </button>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="********"
          />
          {/* Helper / error line. DESIGN.md: errors replace helper text. */}
          <div className="min-h-[18px] mt-1.5">
            <AnimatePresence mode="wait" initial={false}>
              {error ? (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="text-[12px] leading-4 text-[#FF1C1C]"
                  style={{ fontFamily: "var(--font-sans)" }}
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={loading ? undefined : { scale: 0.97 }}
          transition={SNAPPY}
          className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg
                     bg-[#7F24FF] hover:bg-[#A769FF] text-white text-sm font-semibold
                     shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)]
                     transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0319]
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            // Inline spinner — width matches the resting label so the button
            // doesn't reflow when state flips.
            <Loader size="sm" className="w-4 h-4" />
          ) : (
            <>
              Sign in
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </form>
    </AuthShell>
  );
}
