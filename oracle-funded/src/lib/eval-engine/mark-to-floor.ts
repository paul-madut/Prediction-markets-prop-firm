// Mark-to-floor close: when an account breaches, generate synthetic closing
// trades whose prices, in aggregate, cap the trader's loss at exactly the floor.
//
// Algorithm:
//   1. Mark each open position at currentBid (the real fair-value close).
//   2. Compute resulting balance after market close: B' = B + Σ (bid_i × N_i).
//   3. If B' < floor (we're in breach), increase the LAST closing trade's
//      price by the per-contract delta needed to bring B' up to floor exactly.
//   4. If B' ≥ floor, keep all closes at currentBid (the trader recovered
//      between submission and close — they get fair value, no firm subsidy).
//
// The "last position takes the adjustment" choice is documented in the MVP
// plan §6 and avoids the proportional-distribution rounding error that
// could leave a residual cent.

export interface PositionToClose {
  positionId: string;
  venue: string;
  externalMarketId: string;
  side: string;
  netContracts: number;
  avgEntryPriceCents: number;
  currentBidCents: number;
}

export interface ClosingTrade {
  positionId: string;
  venue: string;
  externalMarketId: string;
  side: string;
  contracts: number;
  /** May exceed 100 cents if floor adjustment was needed; clamped at 100 by caller. */
  closePriceCents: number;
  /** True when the price was bumped from currentBid to hit the floor exactly. */
  adjustedToFloor: boolean;
}

export interface MarkToFloorResult {
  trades: ClosingTrade[];
  /** Final balance after all closes; equals floor when adjustment was applied. */
  finalBalanceCents: bigint;
}

/**
 * Compute the synthetic closing trades that bring final balance to the floor.
 *
 * Preconditions:
 *   - Caller has confirmed equity < floor (we're truly in breach).
 *   - All positions have netContracts > 0 (no flat or short positions).
 */
export function planMarkToFloorClose(
  balanceCents: bigint,
  floorCents: bigint,
  positions: PositionToClose[],
): MarkToFloorResult {
  if (positions.length === 0) {
    return { trades: [], finalBalanceCents: balanceCents };
  }

  // Step 1+2: mark each position at current bid, sum the proceeds.
  let runningBalance = balanceCents;
  const trades: ClosingTrade[] = positions.map((p) => {
    runningBalance += BigInt(p.netContracts) * BigInt(p.currentBidCents);
    return {
      positionId: p.positionId,
      venue: p.venue,
      externalMarketId: p.externalMarketId,
      side: p.side,
      contracts: p.netContracts,
      closePriceCents: p.currentBidCents,
      adjustedToFloor: false,
    };
  });

  // Step 3: if balance landed below the floor, adjust the last close upward.
  if (runningBalance < floorCents) {
    const last = trades[trades.length - 1];
    const lastPosition = positions[positions.length - 1];
    const shortfall = floorCents - runningBalance;
    // Per-contract bump, rounded UP so we don't undershoot the floor by 1 cent.
    const bumpPerContract = Number(
      (shortfall + BigInt(lastPosition.netContracts) - 1n) /
        BigInt(lastPosition.netContracts),
    );
    last.closePriceCents += bumpPerContract;
    last.adjustedToFloor = true;
    runningBalance += BigInt(lastPosition.netContracts) * BigInt(bumpPerContract);
  }

  return { trades, finalBalanceCents: runningBalance };
}
