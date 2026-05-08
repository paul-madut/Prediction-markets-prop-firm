// Admin action guard. Centralizes two checks that every admin route runs:
//   1. Caller has role 'admin' or 'owner' on the resolved firm.
//   2. Caller's session is at AAL2 (MFA factor presented this session) —
//      this is what the MVP plan §9 calls "2FA enforcement on admin/owner".
//
// AAL2 enforcement can be bypassed in dev with NEXT_PUBLIC_DEMO_MODE=true;
// otherwise an admin/owner with an AAL1-only session gets 403 with a
// hint to re-authenticate with their TOTP factor.

import { NextResponse } from "next/server";
import { createClient } from "./supabase/server";
import { enrichSupabaseAuth, type AuthContext } from "@webflux/auth";
import { prisma } from "@webflux/db";

export type AdminGuardResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; response: Response };

const FORBIDDEN_ROLES_RESPONSE = NextResponse.json(
  { error: "Forbidden: admin or owner role required" },
  { status: 403 },
);
const NOT_AUTHENTICATED_RESPONSE = NextResponse.json(
  { error: "Not authenticated" },
  { status: 401 },
);
const NO_FIRM_RESPONSE = NextResponse.json(
  { error: "No firm membership found" },
  { status: 403 },
);
const MFA_REQUIRED_RESPONSE = NextResponse.json(
  {
    error: "MFA required for admin actions",
    code: "mfa_required",
    hint: "Re-authenticate with your TOTP factor (Supabase mfa.challenge → mfa.verify) to elevate session to aal2.",
  },
  { status: 403 },
);

/**
 * Resolve the caller's auth context, then enforce role + AAL2.
 *
 * Returns either the validated AuthContext to use downstream, or a ready-to-
 * return Response. Callers should:
 *
 *   const guard = await requireAdmin();
 *   if (!guard.ok) return guard.response;
 *   // ...use guard.ctx...
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  // Test-only override: when ADMIN_GUARD_TEST_USER_ID is set, skip the
  // Supabase session lookup and resolve the AuthContext via DB only. The
  // role + AAL2 checks below still run, so role-based denial is exercised
  // exactly as in production. Never set this in any deployed environment.
  const testUserId = process.env.ADMIN_GUARD_TEST_USER_ID;
  let claims: Record<string, unknown> | null = null;
  let ctx: AuthContext | null = null;

  if (testUserId) {
    claims = {
      sub: testUserId,
      // Tests opt into aal2 via ADMIN_GUARD_TEST_AAL=aal2; default aal1.
      aal: process.env.ADMIN_GUARD_TEST_AAL ?? "aal1",
    };
    ctx = await enrichSupabaseAuth({ sub: testUserId }, prisma);
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
    if (!claims?.sub) return { ok: false, response: NOT_AUTHENTICATED_RESPONSE };
    ctx = await enrichSupabaseAuth(claims, prisma);
  }

  if (!claims?.sub) return { ok: false, response: NOT_AUTHENTICATED_RESPONSE };
  if (!ctx) return { ok: false, response: NO_FIRM_RESPONSE };

  if (ctx.role !== "admin" && ctx.role !== "owner") {
    return { ok: false, response: FORBIDDEN_ROLES_RESPONSE };
  }

  // AAL2 check. Supabase JWTs surface the session's authentication assurance
  // level on the `aal` claim ('aal1' or 'aal2'). The user enrols TOTP once
  // (mfa.enroll → mfa.challenge → mfa.verify) and from then on every login
  // that includes the second factor lands the session on aal2.
  const demoBypass = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!demoBypass) {
    const aal = (claims as Record<string, unknown>).aal;
    if (aal !== "aal2") {
      return { ok: false, response: MFA_REQUIRED_RESPONSE };
    }
  }

  return { ok: true, ctx };
}
