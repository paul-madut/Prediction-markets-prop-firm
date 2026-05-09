// OAuth callback. Supabase redirects here with `?code=...` after the user
// completes the Google sign-in. We exchange the code for a session cookie,
// then best-effort register firm membership (so first-time OAuth users
// land in /dashboard instead of bouncing on a 403 from /api/auth/me),
// then redirect to the originally-requested page.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Best-effort firm-membership registration. /api/auth/register is
  // idempotent-ish (returns 409 if already a member, which we ignore).
  // If this fails the user can still sign in — `useApp` handles the 403
  // gracefully — so we don't block the redirect on it.
  try {
    await fetch(`${origin}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ firmSlug: "demo" }),
    });
  } catch {
    // swallow — non-fatal
  }

  return NextResponse.redirect(`${origin}${next}`);
}
