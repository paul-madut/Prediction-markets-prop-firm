// Eval tick — single-account state evaluation.
//
// Re-marks open positions to live bids, writes a drawdown snapshot, detects
// breaches, runs mark-to-floor close on breach, and handles phase transitions
// (passed phase / funded). Idempotent: running the tick on a breached or
// disabled account is a no-op that returns the current state.
//
// Called from:
//   - fillOrder()         — after every fill so price-driven breaches surface
//                           immediately when a trade actually clears
//   - POST /api/admin/eval/[accountId]/tick — manual trigger
//   - the EOD job          — once per day per active account
//   - the worker poll loop (Phase 3.5, when Upstash arrives) — 1Hz per account

import {
  checkBreach,
  computeEffectiveFloor,
  computeEquityFromPrices,
  computeUnrealizedPnl,
  fetchProviderQuote,
  type MarketVenue,
  type PositionWithPrice,
} from "@webflux/utils";
import { prisma, type Prisma } from "@webflux/db";
import {
  planMarkToFloorClose,
  type PositionToClose,
} from "./mark-to-floor";

export type EvalTickOutcome =
  | { kind: "no_op"; reason: string }
  | {
      kind: "ok";
      equityCents: bigint;
      effectiveFloorCents: bigint;
      isBreach: false;
      transition: "none" | "passed_phase" | "funded";
    }
  | {
      kind: "ok";
      equityCents: bigint;
      effectiveFloorCents: bigint;
      isBreach: true;
      breachEventId: string;
      closingTradesWritten: number;
    };

const NEAR_BREACH_BPS = 200n; // 2% — used for snapshot-recording cadence later

/**
 * Run one eval tick for a single account.
 *
 * Side effects (all in one Prisma interactive transaction with FOR UPDATE):
 *   - positions.unrealizedPnlCents updated to fresh marks
 *   - drawdown_snapshots row inserted
 *   - on breach: account.status='breached', breach_at, breach_event_id;
 *     synthetic closing trades inserted; positions zeroed
 *   - on passed phase: account advances to next phase or status='funded'
 *   - account.version always incremented
 *
 * Returns a summary that callers (test harness, API routes) can act on.
 */
export async function evalTick(accountId: string): Promise<EvalTickOutcome> {
  return prisma.$transaction(async (tx) => {
    // FOR UPDATE serializes against fillOrder + concurrent ticks for this account.
    await tx.$executeRaw`
      SELECT 1 FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE
    `;

    const account = await tx.account.findUnique({
      where: { id: accountId },
      include: {
        config: true,
        currentPhase: true,
        positions: {
          where: { netContracts: { not: 0 } },
        },
      },
    });
    if (!account) return { kind: "no_op" as const, reason: "account_not_found" };

    if (account.status !== "active" && account.status !== "funded") {
      return { kind: "no_op" as const, reason: `not_evaluable:${account.status}` };
    }

    // ── Re-mark open positions against live quotes ────────────────────────
    const positionsWithPrices: (PositionWithPrice & {
      id: string;
      venue: string;
      externalMarketId: string;
      side: string;
      avgEntryPriceCents: number;
    })[] = [];

    for (const p of account.positions) {
      const venue = p.venue as MarketVenue;
      const quote = await fetchProviderQuote(venue, p.externalMarketId);
      const bid =
        quote == null
          ? // No live price right now — fall back to last avgEntry so we don't
            // induce a false breach. Worker tick will retry next cycle.
            p.avgEntryPriceCents
          : p.side === "yes"
            ? quote.yesBid
            : quote.noBid;

      const newUnrealized = computeUnrealizedPnl(
        p.netContracts,
        p.avgEntryPriceCents,
        bid,
      );

      await tx.position.update({
        where: { id: p.id },
        data: { unrealizedPnlCents: newUnrealized, lastPricedAt: new Date() },
      });

      positionsWithPrices.push({
        id: p.id,
        venue: p.venue,
        externalMarketId: p.externalMarketId,
        side: p.side,
        netContracts: p.netContracts,
        avgEntryPriceCents: p.avgEntryPriceCents,
        currentBidCents: bid,
      });
    }

    // ── Equity + floor ─────────────────────────────────────────────────────
    const equityCents = computeEquityFromPrices(
      account.currentBalanceCents,
      positionsWithPrices,
    );

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
    const effectiveFloorCents = computeEffectiveFloor(floorState, floorConfig);
    const dailyFloorCents =
      account.config.dailyDrawdownPct != null
        ? account.dayStartEquityCents -
          (account.dayStartEquityCents *
            BigInt(Math.round(Number(account.config.dailyDrawdownPct) * 100))) /
            10000n
        : null;

    // Always write a snapshot — cheap, valuable for post-incident forensics.
    await tx.drawdownSnapshot.create({
      data: {
        firmId: account.firmId,
        accountId,
        equityCents,
        balanceCents: account.currentBalanceCents,
        floorCents: effectiveFloorCents,
        dailyFloorCents,
      },
    });

    const isBreach = checkBreach(
      equityCents,
      effectiveFloorCents,
      account.config.breachComparison,
    );

    // ── Breach path ────────────────────────────────────────────────────────
    if (isBreach) {
      // Mark-to-floor close — generate synthetic closing trades.
      const closables: PositionToClose[] = positionsWithPrices.map((p) => ({
        positionId: p.id,
        venue: p.venue,
        externalMarketId: p.externalMarketId,
        side: p.side,
        netContracts: p.netContracts,
        avgEntryPriceCents: p.avgEntryPriceCents,
        currentBidCents: p.currentBidCents,
      }));
      const plan = planMarkToFloorClose(
        account.currentBalanceCents,
        effectiveFloorCents,
        closables,
      );

      // Open the breach event first so the FK on accounts.breach_event_id resolves.
      // Decide whether the daily floor or the total floor was breached.
      // (When daily isn't configured, dailyFloorCents is null and equity < base floor.)
      const breachType =
        dailyFloorCents != null && equityCents < dailyFloorCents
          ? "daily_drawdown"
          : "total_drawdown";

      const breachEvent = await tx.breachEvent.create({
        data: {
          firmId: account.firmId,
          accountId,
          breachType,
          equityAtBreachCents: equityCents,
          floorAtBreachCents: effectiveFloorCents,
          closeBehavior:
            account.config.breachCloseBehavior === "mark_to_floor"
              ? "mark_to_floor"
              : "close_at_market",
        },
      });

      // Insert one synthetic trade per closing trade in the plan.
      let tradesWritten = 0;
      for (const t of plan.trades) {
        await tx.trade.create({
          data: {
            firmId: account.firmId,
            accountId,
            // No order — these are system-generated trades.
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
              system: "mark_to_floor",
              breachEventId: breachEvent.id,
              adjustedToFloor: t.adjustedToFloor,
            } as Prisma.InputJsonValue,
          },
        });
        // Zero the position.
        await tx.position.update({
          where: { id: t.positionId },
          data: { netContracts: 0, unrealizedPnlCents: 0n },
        });
        tradesWritten += 1;
      }

      // Set account to breached.
      await tx.account.updateMany({
        where: { id: accountId, version: account.version },
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
          firmId: account.firmId,
          accountId,
          fromStatus: account.status,
          toStatus: "breached",
          reason: `equity ${equityCents} < floor ${effectiveFloorCents}`,
        },
      });

      await tx.auditLog.create({
        data: {
          firmId: account.firmId,
          action: "account.breach",
          entityType: "account",
          entityId: accountId,
          afterState: {
            equityCents: equityCents.toString(),
            floorCents: effectiveFloorCents.toString(),
            finalBalanceCents: plan.finalBalanceCents.toString(),
            tradesWritten,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        kind: "ok" as const,
        equityCents,
        effectiveFloorCents,
        isBreach: true as const,
        breachEventId: breachEvent.id,
        closingTradesWritten: tradesWritten,
      };
    }

    // ── Phase transition (no breach) ───────────────────────────────────────
    // Passed when equity ≥ startingBalance × (1 + profitTargetPct/100)
    // AND tradingDaysCount >= phase.minTradingDays.
    const profitTargetPct = Number(account.currentPhase.profitTargetPct);
    const targetEquityCents =
      account.startingBalanceCents +
      (account.startingBalanceCents *
        BigInt(Math.round(profitTargetPct * 100))) /
        10000n;

    let transition: "none" | "passed_phase" | "funded" = "none";
    if (
      account.status === "active" &&
      equityCents >= targetEquityCents &&
      account.tradingDaysCount >= account.currentPhase.minTradingDays
    ) {
      const nextPhase = await tx.challengePhase.findFirst({
        where: {
          configId: account.configId,
          phaseNumber: { gt: account.currentPhase.phaseNumber },
        },
        orderBy: { phaseNumber: "asc" },
        select: { id: true },
      });

      if (nextPhase) {
        transition = "passed_phase";
        await tx.account.updateMany({
          where: { id: accountId, version: account.version },
          data: {
            status: "passed_phase",
            currentPhaseId: nextPhase.id,
            version: { increment: 1 },
          },
        });
      } else {
        transition = "funded";
        await tx.account.updateMany({
          where: { id: accountId, version: account.version },
          data: { status: "funded", version: { increment: 1 } },
        });
      }
      await tx.accountStateLog.create({
        data: {
          firmId: account.firmId,
          accountId,
          fromStatus: account.status,
          toStatus: transition === "funded" ? "funded" : "passed_phase",
          reason: `equity ${equityCents} ≥ target ${targetEquityCents}, days ${account.tradingDaysCount}`,
        },
      });
    } else {
      // Bump version so callers' optimistic locks don't stale-read.
      await tx.account.updateMany({
        where: { id: accountId, version: account.version },
        data: { version: { increment: 1 } },
      });
    }

    return {
      kind: "ok" as const,
      equityCents,
      effectiveFloorCents,
      isBreach: false as const,
      transition,
    };
  });
}
