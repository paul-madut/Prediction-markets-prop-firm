import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@webflux/db';
import { enrichClerkAuth } from '@webflux/auth';
import {
  computeEquityFromStoredPnl,
  computeEffectiveFloor,
  computeDailyFloor,
  checkBreach,
} from '@webflux/utils';

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * GET /api/accounts/[id]/equity
 *
 * Computes the current equity snapshot for a trading account using the stored
 * unrealized PnL on open positions. When the order engine and price feed are
 * live, the worker's eval tick loop will maintain unrealizedPnlCents in real-
 * time, so this endpoint stays accurate without any code changes.
 *
 * Returns:
 *   accountId, status,
 *   balanceCents, openPositionsPnlCents, equityCents,
 *   drawdownFloorCents (effective floor), dailyFloorCents (null if no daily limit),
 *   distanceToFloorCents, distanceToFloorPct, isBreach
 *
 * All cent fields serialized as numeric strings to preserve BigInt precision.
 *
 * Access: traders see own accounts; admins/owners see any account in their firm.
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
    select: {
      id: true,
      status: true,
      currentBalanceCents: true,
      startingBalanceCents: true,
      highestEodBalanceCents: true,
      highestEodEquityCents: true,
      dayStartEquityCents: true,
      drawdownFloorCents: true,
      ruleOverrides: true,
      config: {
        select: {
          drawdownType: true,
          trailingReference: true,
          totalDrawdownPct: true,
          dailyDrawdownPct: true,
          breachComparison: true,
        },
      },
      positions: {
        where: { netContracts: { not: 0 } },
        select: {
          netContracts: true,
          unrealizedPnlCents: true,
        },
      },
    },
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const ruleOverrides = account.ruleOverrides as Partial<{
    total_drawdown_pct: number;
    daily_drawdown_pct: number;
  }>;

  const floorState = {
    startingBalanceCents: account.startingBalanceCents,
    highestEodBalanceCents: account.highestEodBalanceCents,
    highestEodEquityCents: account.highestEodEquityCents,
    dayStartEquityCents: account.dayStartEquityCents,
    ruleOverrides,
  };

  const floorConfig = {
    drawdownType: account.config.drawdownType,
    trailingReference: account.config.trailingReference,
    totalDrawdownPct: Number(account.config.totalDrawdownPct),
    dailyDrawdownPct:
      account.config.dailyDrawdownPct != null
        ? Number(account.config.dailyDrawdownPct)
        : null,
  };

  const openPositionsPnlCents = account.positions.reduce(
    (sum, p) => sum + p.unrealizedPnlCents,
    0n,
  );
  const equityCents = computeEquityFromStoredPnl(
    account.currentBalanceCents,
    account.positions,
  );
  const effectiveFloorCents = computeEffectiveFloor(floorState, floorConfig);
  const dailyFloorCents = computeDailyFloor(floorState, floorConfig);
  const isBreach = checkBreach(
    equityCents,
    effectiveFloorCents,
    account.config.breachComparison,
  );

  const distanceToFloorCents = equityCents - effectiveFloorCents;
  // Express distance as a percentage of the starting balance so the client
  // can render a "X% remaining" indicator without floating-point math.
  const distanceToFloorPct =
    account.startingBalanceCents > 0n
      ? Number((distanceToFloorCents * 10000n) / account.startingBalanceCents) / 100
      : 0;

  return bigintJson({
    accountId: account.id,
    status: account.status,
    balanceCents: account.currentBalanceCents,
    openPositionsPnlCents,
    equityCents,
    drawdownFloorCents: effectiveFloorCents,
    dailyFloorCents,
    distanceToFloorCents,
    distanceToFloorPct,
    isBreach,
  });
}
