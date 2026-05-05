import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@webflux/db';
import { enrichClerkAuth } from '@webflux/auth';

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

// Status transitions allowed via PATCH. Breached/funded/passed_phase are
// set by the eval engine and payment flow; admins use active ↔ disabled.
const ALLOWED_STATUS_TRANSITIONS = ['active', 'disabled'] as const;
type AllowedStatus = (typeof ALLOWED_STATUS_TRANSITIONS)[number];

/**
 * GET /api/accounts/[id]
 *
 * Returns a single account with its config, current phase, and open positions.
 * Traders may only fetch their own accounts; admins/owners can fetch any in the firm.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichClerkAuth(
    { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId },
    prisma,
  );
  if (!ctx) {
    return NextResponse.json({ error: 'No firm membership found' }, { status: 403 });
  }

  const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';

  const account = await prisma.account.findFirst({
    where: {
      id,
      firmId: ctx.firmId,
      ...(isAdmin ? {} : { userId: ctx.userId }),
    },
    include: {
      config: {
        select: {
          name: true,
          accountSizeCents: true,
          challengeFeeCents: true,
          drawdownType: true,
          trailingReference: true,
          totalDrawdownPct: true,
          dailyDrawdownPct: true,
          profitSplitPct: true,
          breachComparison: true,
          breachCloseBehavior: true,
          maxPositionsPerMarket: true,
          maxPositionsTotal: true,
          maxContractsPerOrder: true,
        },
      },
      currentPhase: {
        select: {
          phaseNumber: true,
          name: true,
          profitTargetPct: true,
          minTradingDays: true,
        },
      },
      positions: {
        where: { netContracts: { not: 0 } },
        select: {
          id: true,
          venue: true,
          externalMarketId: true,
          side: true,
          netContracts: true,
          avgEntryPriceCents: true,
          unrealizedPnlCents: true,
          lastPricedAt: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  return bigintJson(account);
}

/**
 * PATCH /api/accounts/[id]
 *
 * Updates an account's status (admin/owner only).
 * Allowed transitions: active ↔ disabled.
 * Other statuses (breached, funded, passed_phase, pending) are set by system flows.
 *
 * Body: { status: 'active' | 'disabled', reason: string }
 *
 * Returns 400 if status or reason is missing/invalid.
 * Returns 403 if caller is not admin/owner.
 * Returns 404 if account not found in firm.
 * Returns 409 if account is already in the requested status.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const clerkAuth = await auth();
  if (!clerkAuth.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichClerkAuth(
    { userId: clerkAuth.userId, sessionId: clerkAuth.sessionId },
    prisma,
  );
  if (!ctx) {
    return NextResponse.json({ error: 'No firm membership found' }, { status: 403 });
  }

  if (ctx.role !== 'admin' && ctx.role !== 'owner') {
    return NextResponse.json(
      { error: 'Forbidden: admin or owner role required' },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const newStatus = typeof b.status === 'string' ? (b.status as AllowedStatus) : null;
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';

  if (!newStatus || !ALLOWED_STATUS_TRANSITIONS.includes(newStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUS_TRANSITIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (!reason) {
    return NextResponse.json(
      { error: 'reason is required for status changes' },
      { status: 400 },
    );
  }

  const current = await prisma.account.findFirst({
    where: { id, firmId: ctx.firmId },
    select: { id: true, status: true, version: true },
  });
  if (!current) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  if (current.status === newStatus) {
    return NextResponse.json(
      { error: 'Account is already in that status' },
      { status: 409 },
    );
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      status: newStatus,
      version: { increment: 1 },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      version: true,
      currentBalanceCents: true,
      drawdownFloorCents: true,
    },
  });

  // Write state log and audit log in parallel — both are fire-and-remember at this layer.
  await Promise.all([
    prisma.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: current.status,
        toStatus: newStatus,
        reason,
      },
    }),
    prisma.auditLog.create({
      data: {
        firmId: ctx.firmId,
        action: `account.status.${newStatus}`,
        entityType: 'account',
        entityId: id,
        beforeState: { status: current.status },
        afterState: { status: newStatus },
        metadata: { reason, adminClerkUserId: clerkAuth.userId },
      },
    }),
  ]);

  return bigintJson(updated);
}
