import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@webflux/db';
import { enrichSupabaseAuth } from '@webflux/auth';

/**
 * POST /api/auth/register
 *
 * Links an authenticated Supabase user to a firm as a trader. Called after
 * the user has completed Supabase sign-up and needs to be onboarded to a
 * specific prop-firm tenant.
 *
 * Body: { firmSlug: string }
 *
 * Returns 201 + AuthContext on success (same shape as GET /api/auth/me).
 * Returns 400 if firmSlug is missing/blank.
 * Returns 401 if the session is absent.
 * Returns 404 if no active firm matches the slug.
 * Returns 409 if the user already belongs to a firm (MVP: one firm per user).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawSlug =
    body !== null &&
    typeof body === 'object' &&
    'firmSlug' in body &&
    typeof (body as Record<string, unknown>).firmSlug === 'string'
      ? ((body as Record<string, unknown>).firmSlug as string).trim()
      : '';

  if (!rawSlug) {
    return NextResponse.json({ error: 'firmSlug is required' }, { status: 400 });
  }

  const firm = await prisma.firm.findUnique({
    where: { slug: rawSlug },
    select: { id: true, status: true, name: true },
  });

  if (!firm || firm.status !== 'active') {
    return NextResponse.json({ error: 'Firm not found or not active' }, { status: 404 });
  }

  // MVP: one firm per user — reject if already a member of any firm
  const existing = await prisma.firmMember.findFirst({
    where: { userId },
    select: { firmId: true },
  });

  if (existing) {
    return NextResponse.json({ error: 'Already a member of a firm' }, { status: 409 });
  }

  const member = await prisma.firmMember.create({
    data: {
      firmId: firm.id,
      userId,
      role: 'trader',
    },
    select: { id: true },
  });

  // Supabase user IDs are real UUIDs, so actor_user_id can hold them directly
  // (unlike Decision 12's Clerk-era workaround that put them in metadata).
  await prisma.auditLog.create({
    data: {
      firmId: firm.id,
      actorUserId: userId,
      action: 'member.register',
      entityType: 'firm_member',
      entityId: member.id,
      afterState: { role: 'trader' },
      metadata: {
        firmSlug: rawSlug,
        firmName: firm.name,
      },
    },
  });

  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  return NextResponse.json(ctx, { status: 201 });
}
