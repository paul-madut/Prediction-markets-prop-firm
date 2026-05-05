import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@webflux/db';
import { enrichClerkAuth } from '@webflux/auth';

/**
 * POST /api/auth/register
 *
 * Links an authenticated Clerk user to a firm as a trader. Called after
 * the user has completed Clerk sign-up and needs to be onboarded to a
 * specific prop-firm tenant.
 *
 * Body: { firmSlug: string }
 *
 * Returns 201 + AuthContext on success (same shape as GET /api/auth/me).
 * Returns 400 if firmSlug is missing/blank.
 * Returns 401 if the Clerk session is absent.
 * Returns 404 if no active firm matches the slug.
 * Returns 409 if the user already belongs to a firm (MVP: one firm per user).
 */
export async function POST(req: Request) {
  const clerkAuth = await auth();

  if (!clerkAuth.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Parse body
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

  // Resolve firm — must exist and be active
  const firm = await prisma.firm.findUnique({
    where: { slug: rawSlug },
    select: { id: true, status: true, name: true },
  });

  if (!firm || firm.status !== 'active') {
    return NextResponse.json({ error: 'Firm not found or not active' }, { status: 404 });
  }

  // MVP: one firm per user — reject if already a member of any firm
  const existing = await prisma.firmMember.findFirst({
    where: { userId: clerkAuth.userId },
    select: { firmId: true },
  });

  if (existing) {
    return NextResponse.json({ error: 'Already a member of a firm' }, { status: 409 });
  }

  // Create the trader membership
  const member = await prisma.firmMember.create({
    data: {
      firmId: firm.id,
      userId: clerkAuth.userId,
      role: 'trader',
    },
    select: { id: true },
  });

  // Audit log — actorUserId is omitted: Clerk user IDs are not UUIDs.
  // See docs/decisions.md Decision 12.
  await prisma.auditLog.create({
    data: {
      firmId: firm.id,
      action: 'member.register',
      entityType: 'firm_member',
      entityId: member.id,
      afterState: { role: 'trader' },
      metadata: {
        clerkUserId: clerkAuth.userId,
        firmSlug: rawSlug,
        firmName: firm.name,
      },
    },
  });

  // Return the resolved auth context (firmId + role), same as GET /api/auth/me
  const ctx = await enrichClerkAuth(
    { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId },
    prisma,
  );

  return NextResponse.json(ctx, { status: 201 });
}
