// End-of-day job. Updates trailing high-water marks, resets the daily
// drawdown anchor, and increments trading_days_count for accounts that
// transacted today.
//
// Idempotent via accounts.last_eod_run_at — running the job twice on the
// same UTC day is a no-op for any account already advanced.
//
// Triggers (when scheduled infrastructure arrives):
//   - 00:01 UTC cron from Vercel Cron or Railway scheduler
//   - manual trigger via POST /api/admin/eval/eod (admin only)
//
// For now: callable by tests + can be wired to a Vercel Cron after deploy.

import { prisma, type Prisma } from "@webflux/db";
import { computeEquityFromStoredPnl } from "@webflux/utils";

export interface EodOutcome {
  accountsScanned: number;
  accountsAdvanced: number;
  accountsAlreadyAdvanced: number;
  accountsSkipped: number;
}

/**
 * Run the EOD adjustment for every active or funded account.
 *
 * For each account:
 *   1. Skip if last_eod_run_at is on or after `asOfUtc` (idempotent).
 *   2. Compute current equity from stored unrealized P&L.
 *   3. Update highest_eod_balance/equity high-water marks.
 *   4. Set day_start_equity to the closing equity (anchors next day's daily floor).
 *   5. Increment trading_days_count if the account had any trade today.
 *   6. Stamp last_eod_run_at = asOfUtc.
 *
 * `asOfUtc` defaults to "now"; tests pass an explicit time to bench-mark.
 */
export async function runEod(asOfUtc: Date = new Date()): Promise<EodOutcome> {
  const accounts = await prisma.account.findMany({
    where: { status: { in: ["active", "funded"] } },
    select: {
      id: true,
      firmId: true,
      currentBalanceCents: true,
      highestEodBalanceCents: true,
      highestEodEquityCents: true,
      dayStartEquityCents: true,
      tradingDaysCount: true,
      lastEodRunAt: true,
      version: true,
      positions: {
        where: { netContracts: { not: 0 } },
        select: {
          netContracts: true,
          avgEntryPriceCents: true,
          unrealizedPnlCents: true,
        },
      },
    },
  });

  let advanced = 0;
  let alreadyAdvanced = 0;
  let skipped = 0;

  for (const a of accounts) {
    // Idempotency: same-day re-runs are a no-op.
    if (a.lastEodRunAt && a.lastEodRunAt >= floorToUtcMidnight(asOfUtc)) {
      alreadyAdvanced += 1;
      continue;
    }

    const equityCents = computeEquityFromStoredPnl(a.currentBalanceCents, a.positions);
    const newHighestBalance =
      a.currentBalanceCents > a.highestEodBalanceCents
        ? a.currentBalanceCents
        : a.highestEodBalanceCents;
    const newHighestEquity =
      equityCents > a.highestEodEquityCents ? equityCents : a.highestEodEquityCents;

    // Did the account trade today? Use the trades table, not first_trade_at,
    // since that flag never resets.
    const tradedToday = await prisma.trade.count({
      where: {
        accountId: a.id,
        executedAt: { gte: floorToUtcMidnight(asOfUtc) },
      },
    });

    const result = await prisma.account.updateMany({
      where: { id: a.id, version: a.version },
      data: {
        highestEodBalanceCents: newHighestBalance,
        highestEodEquityCents: newHighestEquity,
        dayStartEquityCents: equityCents,
        tradingDaysCount: tradedToday > 0 ? a.tradingDaysCount + 1 : a.tradingDaysCount,
        lastEodRunAt: asOfUtc,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      skipped += 1;
      continue;
    }

    await prisma.auditLog.create({
      data: {
        firmId: a.firmId,
        action: "account.eod",
        entityType: "account",
        entityId: a.id,
        afterState: {
          equityCents: equityCents.toString(),
          highestEodBalanceCents: newHighestBalance.toString(),
          highestEodEquityCents: newHighestEquity.toString(),
          tradedToday: tradedToday > 0,
        } as Prisma.InputJsonValue,
      },
    });

    advanced += 1;
  }

  return {
    accountsScanned: accounts.length,
    accountsAdvanced: advanced,
    accountsAlreadyAdvanced: alreadyAdvanced,
    accountsSkipped: skipped,
  };
}

function floorToUtcMidnight(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
