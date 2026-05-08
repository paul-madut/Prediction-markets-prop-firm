import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@webflux/db';
import { enrichSupabaseAuth } from '@webflux/auth';
import { validateOrder } from '@webflux/utils';
import { fillMockOrder } from '@/lib/order-engine/fill-mock-order';

// BigInt fields don't serialize via JSON.stringify by default.
function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/orders?accountId=<uuid>
 *
 * Returns the most recent 100 orders for an account.
 * Traders must supply their own accountId. Admins may omit it to list all
 * firm orders, or supply one to scope to a specific account.
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) {
    return NextResponse.json({ error: 'No firm membership found' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId')?.trim() || null;
  const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';

  if (!isAdmin && !accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // Traders must own the account they're querying
  if (!isAdmin && accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, firmId: ctx.firmId, userId: ctx.userId },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      firmId: ctx.firmId,
      ...(accountId ? { accountId } : {}),
      ...(!isAdmin ? { account: { userId: ctx.userId } } : {}),
    },
    orderBy: { submittedAt: 'desc' },
    take: 100,
  });

  return bigintJson(orders);
}

/**
 * POST /api/orders
 *
 * Submits a market order. Runs the full validation chain, then persists the
 * order as 'pending' (valid) or 'rejected' (invalid). The fill execution —
 * computing fill price, inserting trade, updating position and balance — is
 * performed by the order engine (Phase 4 task 2: mock order execution).
 *
 * Only market orders are accepted; limit orders return 422 with reason
 * 'limit_orders_not_supported'.
 *
 * Body: {
 *   accountId: string;           // UUID of the trading account
 *   venue: "kalshi"|"polymarket";
 *   externalMarketId: string;    // venue's market identifier
 *   externalMarketTicker: string;
 *   side: "yes"|"no";
 *   action: "buy"|"sell";
 *   sizeContracts: number;       // positive integer
 *   idempotencyKey: string;      // client-generated UUID; replays return original order
 * }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) {
    return NextResponse.json({ error: 'No firm membership found' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // ── Parse + shape-validate input ──────────────────────────────────────────

  const accountId = typeof b.accountId === 'string' ? b.accountId.trim() : '';
  const venue = typeof b.venue === 'string' ? b.venue.trim() : '';
  const externalMarketId =
    typeof b.externalMarketId === 'string' ? b.externalMarketId.trim() : '';
  const externalMarketTicker =
    typeof b.externalMarketTicker === 'string' ? b.externalMarketTicker.trim() : '';
  const side = typeof b.side === 'string' ? b.side.trim() : '';
  const action = typeof b.action === 'string' ? b.action.trim() : '';
  const sizeContracts =
    typeof b.sizeContracts === 'number' ? b.sizeContracts : -1;
  const idempotencyKey =
    typeof b.idempotencyKey === 'string' ? b.idempotencyKey.trim() : '';

  if (!accountId || !venue || !externalMarketId || !externalMarketTicker) {
    return NextResponse.json(
      {
        error:
          'accountId, venue, externalMarketId, and externalMarketTicker are required',
      },
      { status: 400 },
    );
  }
  if (side !== 'yes' && side !== 'no') {
    return NextResponse.json(
      { error: 'side must be "yes" or "no"' },
      { status: 400 },
    );
  }
  if (action !== 'buy' && action !== 'sell') {
    return NextResponse.json(
      { error: 'action must be "buy" or "sell"' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(sizeContracts) || sizeContracts <= 0) {
    return NextResponse.json(
      { error: 'sizeContracts must be a positive integer' },
      { status: 400 },
    );
  }
  if (!idempotencyKey || !UUID_RE.test(idempotencyKey)) {
    return NextResponse.json(
      { error: 'idempotencyKey must be a valid UUID v4' },
      { status: 400 },
    );
  }

  // ── Idempotency: replay returns the original order ────────────────────────

  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    // Guard against cross-firm key reuse (should never happen with UUIDs)
    if (existing.firmId !== ctx.firmId) {
      return NextResponse.json(
        { error: 'Idempotency key conflict' },
        { status: 409 },
      );
    }
    return bigintJson(existing);
  }

  // ── Fetch account + config + firm venues ─────────────────────────────────

  const account = await prisma.account.findFirst({
    where: { id: accountId, firmId: ctx.firmId },
    select: {
      id: true,
      userId: true,
      status: true,
      config: {
        select: {
          maxContractsPerOrder: true,
          maxPositionsPerMarket: true,
          maxPositionsTotal: true,
        },
      },
      firm: {
        select: { enabledVenues: true },
      },
    },
  });
  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Traders can only submit orders for their own accounts
  const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';
  if (!isAdmin && account.userId !== ctx.userId) {
    return NextResponse.json(
      { error: 'Forbidden: not your account' },
      { status: 403 },
    );
  }

  // ── Gather position state ─────────────────────────────────────────────────

  const [existingPosition, openPositionsCount] = await Promise.all([
    prisma.position.findFirst({
      where: { accountId, venue, externalMarketId, side },
      select: { netContracts: true },
    }),
    prisma.position.count({
      where: { accountId, netContracts: { gt: 0 } },
    }),
  ]);

  // ── Check news cooldown ───────────────────────────────────────────────────

  const now = new Date();
  const activeCooldown = await prisma.newsEvent.findFirst({
    where: {
      OR: [{ firmId: ctx.firmId }, { firmId: null }],
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { endsAt: 'desc' },
    select: { endsAt: true, cooldownMinutes: true },
  });
  const cooldownEndsAt = activeCooldown
    ? new Date(
        activeCooldown.endsAt.getTime() + activeCooldown.cooldownMinutes * 60_000,
      )
    : null;

  // ── Run validation chain ──────────────────────────────────────────────────

  const validation = validateOrder({
    action: action as 'buy' | 'sell',
    side: side as 'yes' | 'no',
    venue: venue as 'kalshi' | 'polymarket',
    sizeContracts,
    accountStatus: account.status,
    accountUserId: account.userId,
    requestingUserId: ctx.userId,
    enabledVenues: account.firm.enabledVenues,
    maxContractsPerOrder: account.config.maxContractsPerOrder,
    maxPositionsPerMarket: account.config.maxPositionsPerMarket,
    maxPositionsTotal: account.config.maxPositionsTotal,
    existingPositionContracts: existingPosition?.netContracts ?? 0,
    openPositionsCount,
    newsCooldownActiveUntil: cooldownEndsAt,
  });

  // ── Persist and return ────────────────────────────────────────────────────

  const orderData = {
    firmId: ctx.firmId,
    accountId,
    venue,
    externalMarketId,
    externalMarketTicker,
    side,
    action,
    sizeContracts,
    orderType: 'market',
    idempotencyKey,
  } as const;

  if (!validation.ok) {
    const rejected = await prisma.order.create({
      data: { ...orderData, status: 'rejected', rejectedReason: validation.reason },
    });
    await prisma.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: 'order.rejected',
        entityType: 'order',
        entityId: rejected.id,
        afterState: {
          accountId,
          venue,
          externalMarketId,
          side,
          action,
          sizeContracts,
          rejectedReason: validation.reason,
        },
      },
    });
    return bigintJson({ ...rejected, validationError: validation.reason }, 422);
  }

  const order = await prisma.order.create({
    data: { ...orderData, status: 'pending' },
  });
  await prisma.auditLog.create({
    data: {
      firmId: ctx.firmId,
      actorUserId: ctx.userId,
      action: 'order.submitted',
      entityType: 'order',
      entityId: order.id,
      afterState: { accountId, venue, externalMarketId, side, action, sizeContracts },
    },
  });

  // Immediately execute mock fill (no real venue API in Phase 4).
  const fill = await fillMockOrder(order.id, prisma);

  if (!fill.ok) {
    // Fill failed — order stays 'pending'; surface the reason so callers can debug.
    return bigintJson({ ...order, fillError: fill.reason }, 201);
  }

  // Re-fetch so the response reflects the 'filled' status and filledAt timestamp.
  const filledOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  return bigintJson({ ...filledOrder, tradeId: fill.tradeId, fillPriceCents: fill.fillPriceCents }, 201);
}
