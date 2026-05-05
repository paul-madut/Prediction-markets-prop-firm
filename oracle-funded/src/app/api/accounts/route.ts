import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@webflux/db';
import { enrichClerkAuth } from '@webflux/auth';

// BigInt fields don't serialize via JSON.stringify by default.
// Return them as strings so clients can use arbitrary-precision libraries.
function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * GET /api/accounts
 *
 * Returns accounts scoped to the authenticated user's firm.
 * Traders see only their own accounts.
 * Admins and owners see all accounts in the firm.
 */
export async function GET() {
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

  const accounts = await prisma.account.findMany({
    where: {
      firmId: ctx.firmId,
      ...(isAdmin ? {} : { userId: ctx.userId }),
    },
    select: {
      id: true,
      userId: true,
      status: true,
      startingBalanceCents: true,
      currentBalanceCents: true,
      highestEodBalanceCents: true,
      drawdownFloorCents: true,
      dailyLossFloorCents: true,
      tradingDaysCount: true,
      firstTradeAt: true,
      breachAt: true,
      createdAt: true,
      config: {
        select: {
          name: true,
          accountSizeCents: true,
          drawdownType: true,
          totalDrawdownPct: true,
          dailyDrawdownPct: true,
          profitSplitPct: true,
        },
      },
      currentPhase: {
        select: {
          phaseNumber: true,
          name: true,
          profitTargetPct: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return bigintJson(accounts);
}

/**
 * POST /api/accounts
 *
 * Provisions a trading account directly (admin/owner only).
 * Used for admin-initiated provisioning; the payment flow provisions
 * accounts via the Stripe webhook handler (Phase 6).
 *
 * Body: { userId: string, configId: string }
 *
 * Returns 201 + the new account on success.
 * Returns 400 if required fields are missing.
 * Returns 403 if caller is not admin/owner.
 * Returns 404 if the target user is not a firm member or config is inactive.
 * Returns 422 if the challenge config has no phases.
 */
export async function POST(req: Request) {
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
  const targetUserId = typeof b.userId === 'string' ? b.userId.trim() : '';
  const configId = typeof b.configId === 'string' ? b.configId.trim() : '';

  if (!targetUserId || !configId) {
    return NextResponse.json({ error: 'userId and configId are required' }, { status: 400 });
  }

  // Target user must be a member of this firm
  const targetMember = await prisma.firmMember.findFirst({
    where: { userId: targetUserId, firmId: ctx.firmId },
    select: { id: true },
  });
  if (!targetMember) {
    return NextResponse.json(
      { error: 'Target user is not a member of this firm' },
      { status: 404 },
    );
  }

  // Config must belong to this firm and be active
  const config = await prisma.challengeConfig.findFirst({
    where: { id: configId, firmId: ctx.firmId, isActive: true },
    select: {
      id: true,
      name: true,
      accountSizeCents: true,
      totalDrawdownPct: true,
      phases: {
        orderBy: { phaseNumber: 'asc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!config) {
    return NextResponse.json(
      { error: 'Challenge config not found or not active' },
      { status: 404 },
    );
  }
  if (!config.phases.length) {
    return NextResponse.json(
      { error: 'Challenge config has no phases configured' },
      { status: 422 },
    );
  }

  const firstPhase = config.phases[0];
  const startingBalance = config.accountSizeCents;

  // Drawdown floor = startingBalance × (1 − totalDrawdownPct / 100)
  // Use integer basis-point math to avoid float rounding.
  const drawdownBps = BigInt(Math.round(Number(config.totalDrawdownPct) * 100));
  const drawdownAmount = (startingBalance * drawdownBps) / 10000n;
  const drawdownFloor = startingBalance - drawdownAmount;

  const account = await prisma.account.create({
    data: {
      firmId: ctx.firmId,
      userId: targetUserId,
      configId: config.id,
      currentPhaseId: firstPhase.id,
      status: 'pending',
      startingBalanceCents: startingBalance,
      currentBalanceCents: startingBalance,
      highestEodBalanceCents: startingBalance,
      highestEodEquityCents: startingBalance,
      drawdownFloorCents: drawdownFloor,
      dayStartEquityCents: 0n,
    },
    select: {
      id: true,
      userId: true,
      configId: true,
      currentPhaseId: true,
      status: true,
      startingBalanceCents: true,
      currentBalanceCents: true,
      drawdownFloorCents: true,
      createdAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      action: 'account.provision',
      entityType: 'account',
      entityId: account.id,
      afterState: {
        status: 'pending',
        configId: config.id,
        configName: config.name,
        startingBalanceCents: startingBalance.toString(),
      },
      metadata: {
        provisionedByClerkUserId: clerkAuth.userId,
        targetUserId,
      },
    },
  });

  return bigintJson(account, 201);
}
