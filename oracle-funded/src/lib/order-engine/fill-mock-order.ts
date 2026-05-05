// Atomic fill transaction for mock order execution (Phase 4).
// No real venue API — prices come from getMockMarketQuote().
// Implements the 9-step fill sequence from MVP plan §5.

import type { PrismaClient } from '@webflux/db';
import {
  computeFillPrice,
  computePositionDelta,
  getMockMarketQuote,
  type OrderAction,
  type Side,
} from '@webflux/utils';

export type FillResult =
  | { ok: true; tradeId: string; fillPriceCents: number }
  | { ok: false; reason: string };

/**
 * Execute a mock fill for a pending market order.
 *
 * The entire fill is a single Prisma interactive transaction:
 *   1. Lock the account row (FOR UPDATE prevents concurrent eval-loop conflicts)
 *   2. Re-read position state inside the transaction
 *   3. Generate and compute mock fill price
 *   4. Insert trade row
 *   5. Upsert position row
 *   6. Update account balance + version + first_trade_at
 *   7. Mark order filled
 *   8. Write audit log
 *
 * Returns { ok: false } without throwing if the order is not in 'pending' state
 * or the account cannot be found; callers should log but not surface these as 5xx.
 */
export async function fillMockOrder(
  orderId: string,
  prisma: PrismaClient,
): Promise<FillResult> {
  // Pre-fetch the order (outside the transaction — read-only, no lock needed).
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.status !== 'pending') return { ok: false, reason: 'order_not_pending' };

  // Mock quote — deterministic per market, always "fresh".
  const quote = getMockMarketQuote(order.externalMarketId);
  // Spread to Record<string, number> so Prisma's InputJsonValue constraint is satisfied
  // (MarketQuote lacks an index signature that Prisma's Json type requires).
  const quoteMeta: Record<string, number> = { ...quote };

  const fillPriceCents = computeFillPrice(
    quote,
    order.side as Side,
    order.action as OrderAction,
  );
  if (fillPriceCents === null) return { ok: false, reason: 'no_quote_for_side' };

  // The bid price used for conservative unrealized PnL mark.
  const currentBidCents = order.side === 'yes' ? quote.yesBid : quote.noBid;

  let tradeId: string;

  try {
    tradeId = await prisma.$transaction(async (tx) => {
      // ── Step 1: Lock the account row ────────────────────────────────────────
      // FOR UPDATE ensures the eval loop and concurrent fills wait for us.
      await tx.$executeRaw`
        SELECT 1 FROM accounts WHERE id = ${order.accountId}::uuid FOR UPDATE
      `;

      // ── Step 2: Read account + position inside the locked transaction ────────
      const account = await tx.account.findUniqueOrThrow({
        where: { id: order.accountId },
        select: {
          id: true,
          firmId: true,
          status: true,
          currentBalanceCents: true,
          version: true,
          firstTradeAt: true,
        },
      });

      // Re-validate account is still tradeable (state may have changed since submission).
      if (account.status !== 'active' && account.status !== 'funded') {
        throw new Error(`account_not_tradeable:${account.status}`);
      }

      const existingPosition = await tx.position.findFirst({
        where: {
          accountId: order.accountId,
          venue: order.venue,
          externalMarketId: order.externalMarketId,
          side: order.side,
        },
        select: { netContracts: true, avgEntryPriceCents: true },
      });

      // ── Step 3: Compute position delta ──────────────────────────────────────
      const delta = computePositionDelta(
        order.action as OrderAction,
        order.sizeContracts,
        fillPriceCents,
        0, // no fees in MVP
        existingPosition?.netContracts ?? 0,
        existingPosition?.avgEntryPriceCents ?? 0,
        currentBidCents,
      );

      const newBalanceCents = account.currentBalanceCents + delta.balanceChangeCents;

      // ── Step 4: Insert trade row ─────────────────────────────────────────────
      const trade = await tx.trade.create({
        data: {
          firmId: order.firmId,
          accountId: order.accountId,
          orderId: order.id,
          venue: order.venue,
          externalMarketId: order.externalMarketId,
          side: order.side,
          sizeContracts: order.sizeContracts,
          priceCents: fillPriceCents,
          feesCents: 0,
          realizedPnlCents: delta.realizedPnlCents,
          isOpening: delta.isOpening,
          metadata: { mock: true, quote: quoteMeta },
        },
        select: { id: true },
      });

      // ── Step 5: Upsert position row ──────────────────────────────────────────
      await tx.position.upsert({
        where: {
          accountId_venue_externalMarketId_side: {
            accountId: order.accountId,
            venue: order.venue,
            externalMarketId: order.externalMarketId,
            side: order.side,
          },
        },
        create: {
          firmId: order.firmId,
          accountId: order.accountId,
          venue: order.venue,
          externalMarketId: order.externalMarketId,
          side: order.side,
          netContracts: delta.netContracts,
          avgEntryPriceCents: delta.avgEntryPriceCents,
          unrealizedPnlCents: delta.unrealizedPnlCents,
          lastPricedAt: new Date(),
        },
        update: {
          netContracts: delta.netContracts,
          avgEntryPriceCents: delta.avgEntryPriceCents,
          unrealizedPnlCents: delta.unrealizedPnlCents,
          lastPricedAt: new Date(),
        },
      });

      // ── Step 6: Update account balance + version + first_trade_at ───────────
      // Optimistic lock via version check inside the same locked transaction.
      const updated = await tx.account.updateMany({
        where: { id: order.accountId, version: account.version },
        data: {
          currentBalanceCents: newBalanceCents,
          version: { increment: 1 },
          firstTradeAt: account.firstTradeAt ?? new Date(),
        },
      });
      if (updated.count === 0) {
        // Version conflict — another writer modified the account concurrently.
        throw new Error('version_conflict');
      }

      // ── Step 7: Mark order filled ────────────────────────────────────────────
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'filled', filledAt: new Date() },
      });

      // ── Step 8: Audit log ────────────────────────────────────────────────────
      await tx.auditLog.create({
        data: {
          firmId: order.firmId,
          action: 'order.filled',
          entityType: 'order',
          entityId: orderId,
          afterState: {
            tradeId: trade.id,
            fillPriceCents,
            sizeContracts: order.sizeContracts,
            balanceChangeCents: delta.balanceChangeCents.toString(),
            newBalanceCents: newBalanceCents.toString(),
            mock: true,
          },
          metadata: { quote: quoteMeta },
        },
      });

      return trade.id;
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }

  return { ok: true, tradeId, fillPriceCents };
}
