import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichSupabaseAuth } from '@webflux/auth';
import { prisma } from '@webflux/db';

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's full auth context: userId, sessionId,
 * firmId, role, plus a public-safe slice of firm settings the trader UI
 * needs (oneSidedThresholdPct for market filtering). Called by the
 * frontend after Supabase sign-in to resolve permissions + firm policy.
 *
 * Protected by middleware (see src/middleware.ts). Returns 401 if the session
 * is invalid and 403 if the user has no firm membership yet.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichSupabaseAuth(data.claims, prisma);

  if (!ctx) {
    return NextResponse.json(
      { error: 'No firm membership found for this user' },
      { status: 403 },
    );
  }

  const firm = await prisma.firm.findUnique({
    where: { id: ctx.firmId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      oneSidedThresholdPct: true,
      enabledVenues: true,
    },
  });

  // Pull the OAuth profile fields off the Supabase user. Google's provider
  // metadata lands under user.user_metadata as `full_name`, `name`, and
  // `avatar_url` (sometimes also `picture`). For email/password users these
  // are absent and the UI falls back to email-derived display.
  const { data: userResp } = await supabase.auth.getUser();
  const meta = (userResp?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const profile = {
    fullName:
      (typeof meta.full_name === "string" && meta.full_name) ||
      (typeof meta.name === "string" && meta.name) ||
      null,
    avatarUrl:
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null,
  };

  return NextResponse.json({ ...ctx, firm, profile });
}
