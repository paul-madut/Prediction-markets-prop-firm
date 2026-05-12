// Atomic fill transaction. Implements the 9-step fill sequence from MVP plan §5.
//
// Quote source: fetchProviderQuote dispatches to the right venue. Polymarket
// uses live Gamma REST data; Kalshi falls back to deterministic mock prices
// until Phase 8 (Decision 20). When Upstash is provisioned, a Redis cache
// will sit in front of the venue calls — the call signature stays the same.
//
// Latency-arb prevention (MVP plan §5):
//   1. Minimum-age cushion: a fill cannot run until `submittedAt + 500ms`,
//      so traders can't race a price update by submitting on a hot signal.
//   2. In-lock quote re-read: the binding fill price is fetched AFTER the
//      account FOR UPDATE lock is acquired, not at submission time. The
//      pre-lock fetch is for early rejection only.

import type { PrismaClient } from '@webflux/db';
import {
  computeFillPrice,
  computePositionDelta,
  fetchProviderQuote,
  isMockVenue,
  type MarketVenue,
  type OrderAction,
  type Side,
} from '@webflux/utils';

export type FillResult =
  | { ok: true; tradeId: string; fillPriceCents: number }
  | { ok: false; reason: string };

export interface FillOrderOptions {
  /** Override the 500ms minimum-age cushion. Use 0 in tests to bypass the wait. */
  minAgeMs?: number;
}

const DEFAULT_MIN_AGE_MS = 500;

/**
 * Execute a fill for a pending market order.
 *
 * Returns { ok: false } without throwing if the order is not in 'pending' state,
 * the account is missing, the venue cannot price the market right now, or
 * an optimistic-locking conflict happens. Callers should log but not surface
 * these as 5xx — the order row stays in 'pending' for retry.
 */
export async function fillOrder(
  orderId: string,
  prisma: PrismaClient,
  options: FillOrderOptions = {},
): Promise<FillResult> {
  const minAgeMs = options.minAgeMs ?? DEFAULT_MIN_AGE_MS;

  // Pre-fetch the order outside the transaction (read-only, no lock needed).
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.status !== 'pending') return { ok: false, reason: 'order_not_pending' };

  const venue = order.venue as MarketVenue;

  // Pre-lock probe: cheap rejection if this market currently has no top of book.
  // The binding price is fetched again inside the transaction below.
  const probeQuote = await fetchProviderQuote(venue, order.externalMarketId);
  if (!probeQuote) return { ok: false, reason: 'no_quote_for_market' };
  if (computeFillPrice(probeQuote, order.side as Side, order.action as OrderAction) === null) {
    return { ok: false, reason: 'no_quote_for_side' };
  }

  // Firm-wide one-sided market filter. The trader UI hides these, but a
  // determined client could still POST to /api/orders directly. Check yes_ask
  // — since no_ask ≈ 100 - yes_bid, the YES leg captures both directions of
  // a one-sided market. threshold=0 disables the check.
  const firm = await prisma.firm.findUnique({
    where: { id: order.firmId },
    select: { oneSidedThresholdPct: true },
  });
  const threshold = firm?.oneSidedThresholdPct ?? 0;
  if (threshold > 0) {
    const yesAsk = probeQuote.yesAsk;
    if (yesAsk <= threshold || yesAsk >= 100 - threshold) {
      return { ok: false, reason: 'one_sided_market_blocked' };
    }
  }

  // Latency-arb cushion: don't fill faster than 500ms after submission.
  // This is a per-order wait, not a rate limit. Tests pass 0 to skip.
  if (minAgeMs > 0) {
    const ageMs = Date.now() - order.submittedAt.getTime();
    if (ageMs < minAgeMs) {
      await new Promise((r) => setTimeout(r, minAgeMs - ageMs));
    }
  }

  let tradeId: string;
  let boundFillPriceCents = 0;

  try {
    const txResult = await prisma.$transaction(async (tx) => {
      // ── Step 1: Lock the account row ────────────────────────────────────────
      await tx.$executeRaw`
        SELECT 1 FROM accounts WHERE id = ${order.accountId}::uuid FOR UPDATE
      `;

      // ── Step 2a: Re-fetch the live quote AFTER the lock ─────────────────────
      // This is the binding price; the pre-lock quote was a cheap rejection probe.
      const quote = await fetchProviderQuote(venue, order.externalMarketId);
      if (!quote) throw new Error('no_quote_for_market');
      const fillPriceCents = computeFillPrice(
        quote,
        order.side as Side,
        order.action as OrderAction,
      );
      if (fillPriceCents === null) throw new Error('no_quote_for_side');
      const currentBidCents = order.side === 'yes' ? quote.yesBid : quote.noBid;
      const quoteMeta: Record<string, number> = { ...quote };

      // ── Step 2b: Read account + position inside the locked transaction ──────
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

      const tradeMock = isMockVenue(venue);

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
          metadata: { mock: tradeMock, quote: quoteMeta },
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
      const updated = await tx.account.updateMany({
        where: { id: order.accountId, version: account.version },
        data: {
          currentBalanceCents: newBalanceCents,
          version: { increment: 1 },
          firstTradeAt: account.firstTradeAt ?? new Date(),
        },
      });
      if (updated.count === 0) {
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
            venue,
            mock: tradeMock,
          },
          metadata: { quote: quoteMeta },
        },
      });

      return { tradeId: trade.id, fillPriceCents };
    });
    tradeId = txResult.tradeId;
    boundFillPriceCents = txResult.fillPriceCents;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: msg };
  }

  return { ok: true, tradeId, fillPriceCents: boundFillPriceCents };
}
