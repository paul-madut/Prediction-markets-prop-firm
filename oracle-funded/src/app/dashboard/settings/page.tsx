"use client";

// /dashboard/settings — trader account preferences.
//
// What this page does today:
// - Show authenticated email + role + firm membership (from /api/auth/me).
// - List every challenge account the trader owns + a switch to set the
// active one (mirrors the dashboard switcher but persistent here).
// - Send a password-reset email via Supabase (resetPasswordForEmail).
// - Sign out.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
 ArrowRightEndOnRectangleIcon,
 EnvelopeIcon,
 KeyIcon,
 CheckCircleIcon,
} from "@heroicons/react/16/solid";
import { TextureCard, TextureCardContent } from "@/components/ui/texture-card";
import { TextureButton } from "@/components/ui/texture-button";
import { useApp } from "@/context/AppContext";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/formatters";

export default function SettingsPage() {
 const router = useRouter();
 const { user, accounts, activeAccountId, setActiveAccount, signedIn } = useApp();
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
 <h1 className="text-3xl font-bold text-white">Settings</h1>
 <p className="text-sm text-white/55 mt-1">
 Profile and account preferences.
 </p>
 </div>

 {/* Profile */}
 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 space-y-4">
 <h2 className="text-lg font-semibold text-white">
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
 </TextureCardContent>
 </TextureCard>

 {/* Accounts */}
 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 space-y-4">
 <h2 className="text-lg font-semibold text-white">
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
 <button
 key={a.id}
 onClick={() => setActiveAccount(a.id)}
 className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between gap-4 ${
 isActive
 ? "border-[#A769FF] bg-[#7F24FF]/10 bg-[#1f0a3d]/40"
 : "border-gray-200 dark:border-white/10 bg-[#180630] hover:border-[#A769FF]"
 }`}
 >
 <div>
 <div className="text-sm font-semibold text-white">
 {a.config.name}
 </div>
 <div className="text-xs text-white/55 font-mono mt-0.5">
 {a.id}
 </div>
 </div>
 <div className="text-right">
 <div className="text-sm tabular-nums font-semibold text-white">
 {formatCurrency(Number(a.currentBalanceCents))}
 </div>
 <div className="text-xs text-white/55 capitalize">
 {a.status.replace("_", " ")}
 </div>
 </div>
 {isActive && (
 <CheckCircleIcon className="w-5 h-5 text-[#A769FF] flex-shrink-0" />
 )}
 </button>
 );
 })}
 </div>
 )}
 </TextureCardContent>
 </TextureCard>

 {/* Security */}
 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 space-y-4">
 <h2 className="text-lg font-semibold text-white">
 Security
 </h2>
 <div className="flex items-center justify-between gap-4 flex-wrap">
 <div>
 <div className="text-sm font-medium text-white inline-flex items-center gap-1.5">
 <KeyIcon className="w-4 h-4 text-white/55" />
 Password
 </div>
 <p className="text-xs text-white/55 mt-0.5">
 We send a reset link to {user.email}. Sign in with the new password
 you choose.
 </p>
 </div>
 <TextureButton
 variant="secondary"
 size="sm"
 onClick={() => void sendPasswordReset()}
 disabled={resetState.kind === "sending"}
 >
 {resetState.kind === "sending"
 ? "Sending…"
 : resetState.kind === "sent"
 ? "Email sent"
 : "Send reset email"}
 </TextureButton>
 </div>
 {resetState.kind === "error" && (
 <div className="bg-[#FF1C1C]/10 border border-[#FF1C1C]/30 rounded-lg px-3 py-2 text-xs text-[#FF6B6B]">
 {resetState.message}
 </div>
 )}
 {resetState.kind === "sent" && (
 <div className="bg-[#12DFBA]/10 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
 Check {user.email} for the reset link.
 </div>
 )}

 {(user.role === "admin" || user.role === "owner") && (
 <div className="flex items-center justify-between gap-4 flex-wrap pt-3 border-t border-gray-100 dark:border-white/10">
 <div>
 <div className="text-sm font-medium text-white">
 Two-factor authentication
 </div>
 <p className="text-xs text-white/55 mt-0.5">
 Required for admin actions in production.
 </p>
 </div>
 <TextureButton variant="secondary" size="sm" asChild>
 <a href="/2fa-enrollment">Manage 2FA</a>
 </TextureButton>
 </div>
 )}
 </TextureCardContent>
 </TextureCard>

 {/* Sign out */}
 <TextureCard interactive={false}>
 <TextureCardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
 <div>
 <h2 className="text-lg font-semibold text-white">
 Sign out
 </h2>
 <p className="text-sm text-white/55">
 Ends this browser session. You can sign back in any time.
 </p>
 </div>
 <TextureButton
 variant="destructive"
 size="sm"
 onClick={() => void signOut()}
 disabled={signOutPending}
 >
 <ArrowRightEndOnRectangleIcon className="w-4 h-4" />
 {signOutPending ? "Signing out…" : "Sign out"}
 </TextureButton>
 </TextureCardContent>
 </TextureCard>
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
 <div className="text-xs uppercase tracking-wider text-white/45 font-medium inline-flex items-center gap-1.5">
 {icon}
 {label}
 </div>
 <div
 className={`mt-1 text-sm text-white ${mono ? "font-mono break-all" : ""}`}
 >
 {value}
 </div>
 </div>
 );
}
