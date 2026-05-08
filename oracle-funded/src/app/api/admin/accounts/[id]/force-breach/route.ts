// POST /api/admin/accounts/[id]/force-breach
//
// Manually mark an account as breached without an equity check. Used when
// an admin discovers a rule violation outside the eval engine's scope
// (e.g., gaming, latency arb caught in review). The handler runs the same
// mark-to-floor close path the eval tick uses, so positions are closed and
// balance lands on the floor exactly.

import { NextResponse } from "next/server";
import { prisma, type Prisma } from "@webflux/db";
import { fetchProviderQuote, type MarketVenue } from "@webflux/utils";
import { requireAdmin } from "@/lib/admin-guard";
import { planMarkToFloorClose, type PositionToClose } from "@/lib/eval-engine/mark-to-floor";

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

  // Pre-fetch live quotes for each open position before opening the
  // transaction — the round-trip latency is too long to hold the FOR UPDATE
  // lock through, and admin force-breach is acceptable to bind to a quote
  // taken seconds before the write (the position is being forcibly closed).
  const account = await prisma.account.findFirst({
    where: { id, firmId: ctx.firmId },
    include: { positions: { where: { netContracts: { not: 0 } } } },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (account.status === "breached") {
    return NextResponse.json({ error: "Account already breached" }, { status: 409 });
  }

  // Live-mark each position so mark-to-floor uses real prices.
  const closables: PositionToClose[] = [];
  for (const p of account.positions) {
    const quote = await fetchProviderQuote(p.venue as MarketVenue, p.externalMarketId);
    const bid = quote ? (p.side === "yes" ? quote.yesBid : quote.noBid) : p.avgEntryPriceCents;
    closables.push({
      positionId: p.id,
      venue: p.venue,
      externalMarketId: p.externalMarketId,
      side: p.side,
      netContracts: p.netContracts,
      avgEntryPriceCents: p.avgEntryPriceCents,
      currentBidCents: bid,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${id}::uuid FOR UPDATE`;

    const fresh = await tx.account.findUniqueOrThrow({
      where: { id },
      select: {
        currentBalanceCents: true,
        drawdownFloorCents: true,
        status: true,
        version: true,
      },
    });
    if (fresh.status === "breached") throw new Error("already_breached");

    const plan = planMarkToFloorClose(
      fresh.currentBalanceCents,
      fresh.drawdownFloorCents,
      closables,
    );

    const breachEvent = await tx.breachEvent.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        breachType: "rule_violation",
        equityAtBreachCents: fresh.currentBalanceCents,
        floorAtBreachCents: fresh.drawdownFloorCents,
        closeBehavior: "mark_to_floor",
        metadata: { adminForced: true, reason } as Prisma.InputJsonValue,
      },
    });

    let tradesWritten = 0;
    for (const t of plan.trades) {
      await tx.trade.create({
        data: {
          firmId: ctx.firmId,
          accountId: id,
          orderId: null,
          venue: t.venue,
          externalMarketId: t.externalMarketId,
          side: t.side,
          sizeContracts: t.contracts,
          priceCents: t.closePriceCents,
          feesCents: 0,
          realizedPnlCents: BigInt(t.contracts) * BigInt(t.closePriceCents),
          isOpening: false,
          metadata: {
            system: "admin_force_breach",
            breachEventId: breachEvent.id,
            adjustedToFloor: t.adjustedToFloor,
          } as Prisma.InputJsonValue,
        },
      });
      await tx.position.update({
        where: { id: t.positionId },
        data: { netContracts: 0, unrealizedPnlCents: 0n },
      });
      tradesWritten += 1;
    }

    await tx.account.updateMany({
      where: { id, version: fresh.version },
      data: {
        status: "breached",
        currentBalanceCents: plan.finalBalanceCents,
        breachAt: new Date(),
        breachEventId: breachEvent.id,
        version: { increment: 1 },
      },
    });

    await tx.accountStateLog.create({
      data: {
        firmId: ctx.firmId,
        accountId: id,
        fromStatus: fresh.status,
        toStatus: "breached",
        reason: `admin force-breach: ${reason}`,
        actorUserId: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "account.force_breach",
        entityType: "account",
        entityId: id,
        afterState: {
          breachEventId: breachEvent.id,
          finalBalanceCents: plan.finalBalanceCents.toString(),
          tradesWritten,
        } as Prisma.InputJsonValue,
        metadata: { reason },
      },
    });

    return { breachEventId: breachEvent.id, tradesWritten };
  });

  return NextResponse.json({ ok: true, ...result });
}
