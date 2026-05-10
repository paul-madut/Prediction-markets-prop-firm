// OAuth callback. Supabase redirects here with `?code=...` after the user
// completes Google sign-in. We exchange the code for a session cookie,
// then ensure the user has a firm_members row (so /api/auth/me returns 200
// instead of 403 and useApp() flips signedIn=true), then redirect.
//
// Why we don't POST /api/auth/register from inside this handler: the session
// cookies set by exchangeCodeForSession live on the outbound response, not
// the inbound request, so a same-process fetch with forwarded cookies
// authenticates as nobody. We do the membership write directly via Prisma
// here using the userId we just decoded.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@webflux/db";

const DEMO_FIRM_SLUG = "demo";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");

  console.log("[auth/callback] hit", {
    url: req.url,
    hasCode: !!code,
    next,
    oauthError,
    oauthErrorDescription,
  });

  if (oauthError) {
    const msg = oauthErrorDescription ?? oauthError;
    console.error("[auth/callback] provider error", msg);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(`Google: ${msg}`)}`,
    );
  }

  if (!code) {
    console.error("[auth/callback] missing code");
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(
        "OAuth callback hit without a code. Check Supabase → Authentication → URL Configuration → Redirect URLs.",
      )}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(
        `exchangeCodeForSession: ${error.message}`,
      )}`,
    );
  }

  const userId = data.session?.user?.id;
  const email = data.session?.user?.email;
  console.log("[auth/callback] session created", { userId, email });

  if (!userId) {
    console.error("[auth/callback] session has no user id — bailing");
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent("Session is missing user id")}`,
    );
  }

  // Ensure firm membership exists. Idempotent: noop if already a member.
  // Done directly via Prisma so we don't depend on cookie-passing.
  try {
    const existing = await prisma.firmMember.findFirst({
      where: { userId },
      select: { id: true, firmId: true },
    });

    if (existing) {
      console.log("[auth/callback] firm membership already exists", {
        userId,
        firmId: existing.firmId,
      });
    } else {
      const firm = await prisma.firm.findUnique({
        where: { slug: DEMO_FIRM_SLUG },
        select: { id: true, status: true, name: true },
      });

      if (!firm || firm.status !== "active") {
        console.error(
          "[auth/callback] demo firm missing/inactive — user will land on /dashboard with no firm",
        );
      } else {
        const member = await prisma.firmMember.create({
          data: { firmId: firm.id, userId, role: "trader" },
          select: { id: true },
        });
        await prisma.auditLog.create({
          data: {
            firmId: firm.id,
            actorUserId: userId,
            action: "member.register",
            entityType: "firm_member",
            entityId: member.id,
            afterState: { role: "trader" },
            metadata: {
              firmSlug: DEMO_FIRM_SLUG,
              firmName: firm.name,
              source: "oauth_callback",
            },
          },
        });
        console.log("[auth/callback] firm membership created", {
          userId,
          firmId: firm.id,
          memberId: member.id,
        });
      }
    }
  } catch (e) {
    console.error("[auth/callback] firm membership write failed", e);
    // Non-fatal. User has a valid session and lands on /dashboard, where
    // useApp() will surface the 403 from /api/auth/me. Better than blocking
    // the whole sign-in if the DB is briefly unavailable.
  }

  return NextResponse.redirect(`${origin}${next}`);
}
