// Admin layout — server-side role gate.
//
// Defense in depth: middleware already redirects unauthenticated users to
// /sign-in, but it does NOT check role (role would require a DB lookup on
// every request). This layout runs server-side before any /admin/* page
// renders and enforces:
//
//   1. Session present       → otherwise /sign-in
//   2. Firm membership exists → otherwise /sign-in?error=no_firm
//   3. Role ∈ {admin, owner}  → otherwise /dashboard?error=admin_only
//
// The API routes under /api/admin/* are independently guarded by
// requireAdmin() (which also enforces AAL2/MFA). This layout is the UI
// half of that protection — it stops a trader from seeing the admin UI
// chrome and getting a broken-looking page where every fetch 403s.

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin"
            className="font-semibold text-gray-900 dark:text-gray-100"
          >
            OracleFunded · Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin/traders"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Traders
            </Link>
            <Link
              href="/admin/configs"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Configs
            </Link>
            <Link
              href="/admin/payouts"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Payouts
            </Link>
            <Link
              href="/admin/audit"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Audit
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700"
            >
              Trader view →
            </Link>
          </nav>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
