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

/**
 * GET /api/trades?accountId=<uuid>
 *
 * Returns the most recent 100 trades for an account, newest first.
 * Traders must supply their own accountId. Admins may omit it to list all
 * firm trades, or supply one to scope to a specific account.
 */
export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId')?.trim() || null;
  const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';

  if (!isAdmin && !accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }

  // Traders must own the account they're querying.
  if (!isAdmin && accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, firmId: ctx.firmId, userId: ctx.userId },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
  }

  const trades = await prisma.trade.findMany({
    where: {
      firmId: ctx.firmId,
      ...(accountId ? { accountId } : {}),
      ...(!isAdmin ? { account: { userId: ctx.userId } } : {}),
    },
    orderBy: { executedAt: 'desc' },
    take: 100,
  });

  return bigintJson(trades);
}
