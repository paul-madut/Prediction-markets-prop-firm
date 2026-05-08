// POST /api/admin/accounts/[id]/force-close
//
// Close all open positions on an account at the current bid (real fair-value
// market close, not mark-to-floor). Account status is unchanged — this is a
// "stand the trader down without breaching them" tool. Common uses: news
// event imminent, trader requested vacation hold, admin discipline measure.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { fetchProviderQuote, type MarketVenue } from "@webflux/utils";
import { requireAdmin } from "@/lib/admin-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const account = await prisma.account.findFirst({
    where: { id, firmId: ctx.firmId },
    include: { positions: { where: { netContracts: { not: 0 } } } },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.positions.length === 0) {
    return NextResponse.json({ ok: true, closed: 0 });
  }

  // Pre-fetch quotes outside the lock.
  type CloseRow = { positionId: string; venue: string; externalMarketId: string; side: string; netContracts: number; bidCents: number };
  const closes: CloseRow[] = [];
  for (const p of account.positions) {
    const quote = await fetchProviderQuote(p.venue as MarketVenue, p.externalMarketId);
    if (!quote) {
      return NextResponse.json(
        { error: `no live quote for ${p.venue}/${p.externalMarketId}; retry` },
        { status: 503 },
      );
    }
    closes.push({
      positionId: p.id,
      venue: p.venue,
      externalMarketId: p.externalMarketId,
      side: p.side,
      netContracts: p.netContracts,
      bidCents: p.side === "yes" ? quote.yesBid : quote.noBid,
    });
  }

  const out = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${id}::uuid FOR UPDATE`;

    const fresh = await tx.account.findUniqueOrThrow({
      where: { id },
      select: { currentBalanceCents: true, version: true },
    });

    let proceeds = 0n;
    for (const c of closes) {
      proceeds += BigInt(c.netContracts) * BigInt(c.bidCents);
      await tx.trade.create({
        data: {
          firmId: ctx.firmId,
          accountId: id,
          orderId: null,
          venue: c.venue,
          externalMarketId: c.externalMarketId,
          side: c.side,
          sizeContracts: c.netContracts,
          priceCents: c.bidCents,
          feesCents: 0,
          isOpening: false,
          metadata: { system: "admin_force_close", reason } as Prisma.InputJsonValue,
        },
      });
      await tx.position.update({
        where: { id: c.positionId },
        data: { netContracts: 0, unrealizedPnlCents: 0n },
      });
    }

    const newBalance = fresh.currentBalanceCents + proceeds;
    const updated = await tx.account.updateMany({
      where: { id, version: fresh.version },
      data: { currentBalanceCents: newBalance, version: { increment: 1 } },
    });
    if (updated.count === 0) throw new Error("version_conflict");

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.force_close",
        entityType: "account",
        entityId: id,
        afterState: {
          positionsClosed: closes.length,
          proceedsCents: proceeds.toString(),
          newBalanceCents: newBalance.toString(),
        } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { closed: closes.length, proceedsCents: proceeds.toString() };
  });

  return NextResponse.json({ ok: true, ...out });
}
