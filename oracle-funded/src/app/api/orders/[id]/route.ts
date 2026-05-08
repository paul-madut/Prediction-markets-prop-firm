import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@webflux/db';
import { enrichSupabaseAuth } from '@webflux/auth';

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}

/**
 * GET /api/orders/[id]
 *
 * Returns a single order with its associated trades.
 * Traders may only fetch their own orders. Admins may fetch any order in the firm.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) {
    return NextResponse.json({ error: 'No firm membership found' }, { status: 403 });
  }

  const isAdmin = ctx.role === 'admin' || ctx.role === 'owner';

  const order = await prisma.order.findFirst({
    where: {
      id,
      firmId: ctx.firmId,
      ...(!isAdmin ? { account: { userId: ctx.userId } } : {}),
    },
    include: { trades: { orderBy: { executedAt: 'desc' } } },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return bigintJson(order);
}
