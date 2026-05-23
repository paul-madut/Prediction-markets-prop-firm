"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { Loader } from "@/components/ui/loader";
import { createClient } from "@/lib/supabase/client";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

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

  // Strength bars use semantic colours from the design palette only.
  const strengthColor = (() => {
    if (strength === 4) return "bg-[#12DFBA]";
    if (strength === 3) return "bg-[#A769FF]";
    if (strength === 2) return "bg-[#FFB539]";
    return "bg-[#FF1C1C]";
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
          className="text-[28px] leading-9 font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Create your account
        </h2>
        <p className="text-sm text-white/65">
          Free to start. Challenge fees apply when you buy your first evaluation.
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <GoogleAuthButton label="Continue with Google" onError={setError} />
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
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/45 pointer-events-none" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 pl-9 pr-3.5 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40
                         transition-[background-color,border-color,box-shadow] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
                         focus:outline-none focus:bg-white/[0.06]
                         focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45 focus-visible:border-white/15"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-[12px] leading-4 font-semibold tracking-[0.02em] text-white/70 mb-2"
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
          {/* Strength meter doesn't gate submit — backend minLength is the source of truth. */}
          {password.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
                    strength > i ? strengthColor : "bg-white/10"
                  }`}
                />
              ))}
              <span
                className="text-[10px] uppercase tracking-[0.08em] text-white/45 ml-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {strength === 0
                  ? ""
                  : strength === 1
                    ? "weak"
                    : strength === 2
                      ? "fair"
                      : strength === 3
                        ? "good"
                        : "strong"}
              </span>
            </div>
          )}
          {/* Inline status line — error replaces helper text per DESIGN.md. */}
          <div className="min-h-[18px] mt-1.5">
            <AnimatePresence mode="wait" initial={false}>
              {error ? (
                <motion.p
                  key={`err-${error}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="text-[12px] leading-4 text-[#FF1C1C]"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </motion.p>
              ) : info ? (
                <motion.p
                  key={`info-${info}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="text-[12px] leading-4 text-[#12DFBA]"
                  role="status"
                  aria-live="polite"
                >
                  {info}
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
            <Loader size="sm" className="w-4 h-4" />
          ) : (
            <>
              Create account
              <ArrowRightIcon className="w-4 h-4" />
            </>
          )}
        </motion.button>
      </form>
    </AuthShell>
  );
}
