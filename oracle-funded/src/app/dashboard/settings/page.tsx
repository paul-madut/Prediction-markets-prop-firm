"use client";

// /dashboard/settings — trader account preferences.
//
// Sections (Profile / Accounts / Security) are surfaced as tabs in the
// Blueberry pattern: snappy spring + layoutId for the active underline.
//
// What this page does today:
// - Show authenticated email + role + firm membership (from /api/auth/me).
// - List every challenge account the trader owns + a switch to set the
//   active one (mirrors the dashboard switcher but persistent here).
// - Send a password-reset email via Supabase (resetPasswordForEmail).
// - Sign out.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightEndOnRectangleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  UserIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "@heroicons/react/16/solid";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

type TabId = "profile" | "accounts" | "security";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "accounts", label: "Accounts", icon: CreditCardIcon },
  { id: "security", label: "Security", icon: ShieldCheckIcon },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, accounts, activeAccountId, setActiveAccount, signedIn } = useApp();
  const [tab, setTab] = useState<TabId>("profile");
  const [resetState, setResetState] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [signOutPending, setSignOutPending] = useState(false);

  if (!signedIn || !user) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-white/55">
        Not signed in.
      </div>
    );
  }

  async function sendPasswordReset(): Promise<void> {
    if (!user?.email) return;
    setResetState({ kind: "sending" });
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.origin}/sign-in`
          : undefined,
    });
    if (error) {
      setResetState({ kind: "error", message: error.message });
      return;
    }
    setResetState({ kind: "sent" });
  }

  async function signOut(): Promise<void> {
    setSignOutPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1
          className="text-[32px] leading-[38px] font-bold text-white tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Settings
        </h1>
        <p className="text-sm text-white/65 mt-2">
          Profile and account preferences.
        </p>
      </div>

      {/* Tabs — animated underline via layoutId + snappy spring. */}
      <div className="border-b border-white/10">
        <div role="tablist" className="inline-flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm font-semibold transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  isActive
                    ? "text-white"
                    : "text-white/55 hover:text-white hover:bg-white/[0.03]",
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {isActive && (
                  <motion.span
                    layoutId="bb-settings-underline"
                    aria-hidden
                    className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full bg-[#7F24FF]"
                    transition={SNAPPY}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        >
          {tab === "profile" && (
            <section className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
              <h2
                className="text-lg font-semibold text-white tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Profile
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <Field
                  label="Email"
                  value={user.email ?? "(not set)"}
                  icon={<EnvelopeIcon className="w-4 h-4" />}
                />
                <Field label="Role" value={user.role} />
                <Field label="User ID" value={user.userId} mono />
                <Field label="Firm ID" value={user.firmId} mono />
              </div>
            </section>
          )}

          {tab === "accounts" && (
            <section className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
              <h2
                className="text-lg font-semibold text-white tracking-[-0.01em]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Challenge accounts
              </h2>
              {accounts.length === 0 ? (
                <p className="text-sm text-white/55">
                  You don&apos;t have any challenge accounts yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((a) => {
                    const isActive = a.id === activeAccountId;
                    return (
                      <motion.button
                        key={a.id}
                        type="button"
                        onClick={() => setActiveAccount(a.id)}
                        whileTap={{ scale: 0.99 }}
                        transition={SNAPPY}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center justify-between gap-4",
                          isActive
                            ? "border-white/[0.18] bg-[#1f0a3d]"
                            : "border-white/10 bg-[#180630] hover:bg-[#1f0a3d] hover:border-white/[0.18]",
                        )}
                      >
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {a.config.name}
                          </div>
                          <div
                            className="text-xs text-white/55 mt-0.5"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {a.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-sm font-semibold text-white tabular-nums"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {formatCurrency(Number(a.currentBalanceCents))}
                          </div>
                          <div className="text-xs text-white/55 capitalize">
                            {a.status.replace("_", " ")}
                          </div>
                        </div>
                        {isActive && (
                          <CheckCircleIcon className="w-5 h-5 text-[#A769FF] flex-shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === "security" && (
            <div className="space-y-6">
              <section className="p-6 rounded-xl bg-[#180630] border border-white/10 space-y-4">
                <h2
                  className="text-lg font-semibold text-white tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Password
                </h2>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-medium text-white inline-flex items-center gap-1.5">
                      <KeyIcon className="w-4 h-4 text-white/55" />
                      Reset password
                    </div>
                    <p className="text-xs text-white/65 mt-1">
                      We send a reset link to {user.email}. Sign in with the new
                      password you choose.
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => void sendPasswordReset()}
                    disabled={resetState.kind === "sending"}
                    whileTap={
                      resetState.kind === "sending" ? undefined : { scale: 0.97 }
                    }
                    transition={SNAPPY}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.08] text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45"
                  >
                    {resetState.kind === "sending"
                      ? "Sending…"
                      : resetState.kind === "sent"
                        ? "Email sent"
                        : "Send reset email"}
                  </motion.button>
                </div>
                {resetState.kind === "error" && (
                  <div className="bg-[#FF1C1C]/[0.14] border border-[#FF1C1C]/30 rounded-lg px-3 py-2 text-xs text-[#FF1C1C]">
                    {resetState.message}
                  </div>
                )}
                {resetState.kind === "sent" && (
                  <div className="bg-[#12DFBA]/[0.08] border border-[#12DFBA]/30 rounded-lg px-3 py-2 text-xs text-[#12DFBA]">
                    Check {user.email} for the reset link.
                  </div>
                )}

                {(user.role === "admin" || user.role === "owner") && (
                  <div className="flex items-center justify-between gap-4 flex-wrap pt-3 border-t border-white/10">
                    <div>
                      <div className="text-sm font-medium text-white">
                        Two-factor authentication
                      </div>
                      <p className="text-xs text-white/65 mt-1">
                        Required for admin actions in production.
                      </p>
                    </div>
                    <a
                      href="/2fa-enrollment"
                      className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.08] text-white text-sm font-semibold transition-colors duration-150"
                    >
                      Manage 2FA
                    </a>
                  </div>
                )}
              </section>

              <section className="p-6 rounded-xl bg-[#180630] border border-white/10 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2
                    className="text-lg font-semibold text-white tracking-[-0.01em]"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Sign out
                  </h2>
                  <p className="text-sm text-white/65 mt-1">
                    Ends this browser session. You can sign back in any time.
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signOutPending}
                  whileTap={signOutPending ? undefined : { scale: 0.97 }}
                  transition={SNAPPY}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white/[0.06] hover:bg-[#FF1C1C]/[0.14] hover:text-[#FF1C1C] text-white text-sm font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7F24FF]/45"
                >
                  <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
                  {signOutPending ? "Signing out…" : "Sign out"}
                </motion.button>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="text-[11px] uppercase tracking-[0.08em] text-white/55 font-medium inline-flex items-center gap-1.5"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm text-white",
          mono && "break-all",
        )}
        style={mono ? { fontFamily: "var(--font-mono)" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
