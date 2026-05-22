// Admin layout — server-side role + AAL2 gate.
//
// Defense in depth: middleware already redirects unauthenticated users to
// /sign-in, but it does NOT check role or AAL (role/AAL would require a DB
// lookup on every request). This layout runs server-side before any /admin/*
// page renders and enforces:
//
//   1. Session present       → otherwise /sign-in
//   2. Firm membership exists → otherwise /sign-in?error=no_firm
//   3. Role ∈ {admin, owner}  → otherwise /dashboard?error=admin_only
//   4. Session at AAL2         → otherwise /2fa-enrollment?next=/admin
//                               (skipped when NEXT_PUBLIC_DEMO_MODE=true,
//                                matching the bypass in requireAdmin())
//
// The API routes under /api/admin/* are independently guarded by
// requireAdmin(). This layout is the UI half of that protection — it stops
// an admin from seeing the admin chrome and watching every API call 403 with
// `mfa_required`, and stops a trader from getting a broken-looking admin
// page where every fetch 403s.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { enrichSupabaseAuth } from "@webflux/auth";
import { prisma } from "@webflux/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    redirect("/sign-in?redirect_url=/admin");
  }

  const ctx = await enrichSupabaseAuth(claims, prisma);
  if (!ctx) {
    redirect("/sign-in?error=no_firm_membership");
  }

  if (ctx.role !== "admin" && ctx.role !== "owner") {
    redirect("/dashboard?error=admin_only");
  }

  // AAL2 / MFA gate. Same dev-bypass convention as requireAdmin().
  const demoBypass = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demoBypass) {
    const aal = (claims as Record<string, unknown>).aal;
    if (aal !== "aal2") {
      redirect("/2fa-enrollment?next=/admin");
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0319]">
      <header className="bg-[#0C0319]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-[#A769FF] to-[#7F24FF] shadow-[0_4px_14px_-2px_rgba(127,36,255,0.5)]" />
            Blueberry Funded · Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/traders" className="text-white/70 hover:text-white">
              Traders
            </Link>
            <Link href="/admin/configs" className="text-white/70 hover:text-white">
              Configs
            </Link>
            <Link href="/admin/payouts" className="text-white/70 hover:text-white">
              Payouts
            </Link>
            <Link href="/admin/audit" className="text-white/70 hover:text-white">
              Audit
            </Link>
            <Link href="/dashboard" className="text-[#A769FF] hover:text-[#7F24FF]">
              Trader view →
            </Link>
          </nav>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
