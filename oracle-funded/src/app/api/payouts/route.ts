// /api/payouts — trader-facing payout request + listing.
//
// GET: traders see their own payout history; admins see all firm payouts.
// POST: trader requests a payout from a funded account. The requested
//   amount must be ≤ profit (currentBalance − startingBalance), and the
//   account's balance is debited up-front (held in escrow until reviewed).
//   Trader receives `requested × profit_split_pct`; the firm keeps the rest.
//
// Eligibility gates (B3): besides the account being funded with profit, the
// trader must clear (a) a minimum hold time since first becoming funded, and
// (b) a cooldown since the most recent payout request; the request itself must
// meet a minimum amount. Defaults are firm-agnostic constants below;
// per-config knobs can be added later without changing this contract.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, type Prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";
import { effectiveRules } from "@webflux/utils";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

// ── Payout eligibility constants ─────────────────────────────────────────────
// These were inlined here (rather than ChallengeConfig columns) to keep the
// migration footprint small for the first pass. When the business asks to
// vary them per firm or per config, lift them onto ChallengeConfig.

/** Smallest accepted payout request, in cents. */
const MIN_PAYOUT_CENTS = 5000n; // $50
/** Trader must have been funded at least this long before requesting. */
const MIN_DAYS_FUNDED = 7;
/** Min days between two consecutive payout requests. */
const PAYOUT_COOLDOWN_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) return NextResponse.json({ error: "No firm membership found" }, { status: 403 });

  const isAdmin = ctx.role === "admin" || ctx.role === "owner";
  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || undefined;

  const rows = await prisma.payout.findMany({
    where: {
      firmId: ctx.firmId,
      ...(isAdmin ? {} : { userId: ctx.userId }),
      ...(status ? { status } : {}),
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
  return bigintJson(rows);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const ctx = await enrichSupabaseAuth(data.claims, prisma);
  if (!ctx) return NextResponse.json({ error: "No firm membership found" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Partial<{
    accountId: string;
    requestedCents: number | string;
    paymentMethod: string;
    paymentDestination: string;
  }>;
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : "";
  if (!accountId) return NextResponse.json({ error: "accountId is required" }, { status: 400 });

  let requestedCents: bigint;
  try {
    const raw = typeof body.requestedCents === "string" ? BigInt(body.requestedCents) : BigInt(body.requestedCents ?? 0);
    requestedCents = raw;
  } catch {
    return NextResponse.json({ error: "requestedCents must be an integer" }, { status: 400 });
  }
  if (requestedCents <= 0n) {
    return NextResponse.json({ error: "requestedCents must be > 0" }, { status: 400 });
  }
  if (requestedCents < MIN_PAYOUT_CENTS) {
    return NextResponse.json(
      {
        error: `Minimum payout is ${MIN_PAYOUT_CENTS} cents`,
        code: "below_min_payout",
        minPayoutCents: MIN_PAYOUT_CENTS.toString(),
      },
      { status: 422 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;

    const account = await tx.account.findFirst({
      where: { id: accountId, firmId: ctx.firmId, userId: ctx.userId },
      include: {
        config: {
          select: {
            profitSplitPct: true,
            totalDrawdownPct: true,
            dailyDrawdownPct: true,
            maxPositionsPerMarket: true,
            maxPositionsTotal: true,
            maxContractsPerOrder: true,
            minTradingDays: true,
          },
        },
      },
    });
    if (!account) throw new Error("not_found");
    if (account.status !== "funded") throw new Error(`account_not_funded:${account.status}`);

    const profit = account.currentBalanceCents - account.startingBalanceCents;
    if (profit <= 0n) throw new Error("no_profit");
    if (requestedCents > profit) throw new Error("requested_exceeds_profit");

    // ── Funded-since gate ─────────────────────────────────────────────────
    // Use the earliest transition into "funded" status as the funded-since
    // anchor. firstTradeAt isn't suitable because it captures the very first
    // trade in evaluation phases, not when the trader was promoted.
    const fundedSince = await tx.accountStateLog.findFirst({
      where: { accountId, toStatus: "funded" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (!fundedSince) {
      // Defensive: status is "funded" but no log row. Block until ops investigate.
      throw new Error("funded_anchor_missing");
    }
    const now = new Date();
    const daysFunded =
      (now.getTime() - fundedSince.createdAt.getTime()) / MS_PER_DAY;
    if (daysFunded < MIN_DAYS_FUNDED) {
      throw new Error(
        `min_funded_days_not_met:${MIN_DAYS_FUNDED}:${daysFunded.toFixed(2)}`,
      );
    }

    // ── Cooldown gate ─────────────────────────────────────────────────────
    const lastPayout = await tx.payout.findFirst({
      where: { accountId },
      orderBy: { requestedAt: "desc" },
      select: { requestedAt: true },
    });
    if (lastPayout) {
      const daysSinceLast =
        (now.getTime() - lastPayout.requestedAt.getTime()) / MS_PER_DAY;
      if (daysSinceLast < PAYOUT_COOLDOWN_DAYS) {
        throw new Error(
          `cooldown_active:${PAYOUT_COOLDOWN_DAYS}:${daysSinceLast.toFixed(2)}`,
        );
      }
    }

    // Profit split honors per-account overrides (B2 fix): an admin who lifted
    // a single trader's split via /override should see that take effect here.
    const rules = effectiveRules({
      config: {
        totalDrawdownPct: Number(account.config.totalDrawdownPct),
        dailyDrawdownPct:
          account.config.dailyDrawdownPct != null
            ? Number(account.config.dailyDrawdownPct)
            : null,
        profitSplitPct: Number(account.config.profitSplitPct),
        maxPositionsPerMarket: account.config.maxPositionsPerMarket,
        maxPositionsTotal: account.config.maxPositionsTotal,
        maxContractsPerOrder: account.config.maxContractsPerOrder,
        minTradingDays: account.config.minTradingDays,
      },
      ruleOverrides: account.ruleOverrides as Record<string, unknown> | null,
      overrideExpiresAt: account.overrideExpiresAt,
      now,
    });

    // Trader take = requested × profit_split_pct (basis-point math, matches eval engine).
    const splitBps = BigInt(Math.round(rules.profitSplitPct * 100));
    const traderAmountCents = (requestedCents * splitBps) / 10000n;

    // Debit the requested amount from the account immediately so the same
    // profit can't be double-requested. Refund on rejection.
    const updated = await tx.account.updateMany({
      where: { id: accountId, version: account.version },
      data: {
        currentBalanceCents: account.currentBalanceCents - requestedCents,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new Error("version_conflict");

    const payout = await tx.payout.create({
      data: {
        firmId: ctx.firmId,
        accountId,
        userId: ctx.userId,
        requestedCents,
        // Record the EFFECTIVE split that produced traderAmountCents, not the
        // raw config — so a per-account override is reflected in payout history.
        profitSplitPct: rules.profitSplitPct.toString(),
        traderAmountCents,
        status: "requested",
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : null,
        paymentDestination: typeof body.paymentDestination === "string" ? body.paymentDestination : null,
      },
    });

    await tx.auditLog.create({
      data: {
        firmId: ctx.firmId,
        actorUserId: ctx.userId,
        action: "payout.requested",
        entityType: "payout",
        entityId: payout.id,
        afterState: {
          requestedCents: requestedCents.toString(),
          traderAmountCents: traderAmountCents.toString(),
          accountId,
        } as Prisma.InputJsonValue,
      },
    });

    return payout;
  }).catch((err: unknown): { __error: string } => {
    // Surface domain errors thrown above as structured HTTP responses below.
    const msg = err instanceof Error ? err.message : String(err);
    return { __error: msg };
  });

  if ("__error" in result) {
    const msg = result.__error;
    if (msg === "not_found") {
      return NextResponse.json(
        { error: "Account not found", code: "not_found" },
        { status: 404 },
      );
    }
    if (msg.startsWith("account_not_funded:")) {
      return NextResponse.json(
        { error: msg, code: "account_not_funded" },
        { status: 422 },
      );
    }
    if (msg === "no_profit") {
      return NextResponse.json(
        { error: "Account has no profit to withdraw", code: "no_profit" },
        { status: 422 },
      );
    }
    if (msg === "requested_exceeds_profit") {
      return NextResponse.json(
        { error: "Requested amount exceeds available profit", code: "requested_exceeds_profit" },
        { status: 422 },
      );
    }
    if (msg === "funded_anchor_missing") {
      // Server-side data integrity issue, not a user error.
      return NextResponse.json(
        {
          error: "Account is missing a 'funded' state log row; contact support",
          code: "funded_anchor_missing",
        },
        { status: 500 },
      );
    }
    if (msg.startsWith("min_funded_days_not_met:")) {
      const [, required, actual] = msg.split(":");
      return NextResponse.json(
        {
          error: `Must be funded for at least ${required} days before requesting a payout`,
          code: "min_funded_days_not_met",
          minDaysFunded: Number(required),
          daysFunded: Number(actual),
        },
        { status: 422 },
      );
    }
    if (msg.startsWith("cooldown_active:")) {
      const [, required, actual] = msg.split(":");
      return NextResponse.json(
        {
          error: `Must wait ${required} days between payout requests`,
          code: "payout_cooldown_active",
          cooldownDays: Number(required),
          daysSinceLast: Number(actual),
        },
        { status: 422 },
      );
    }
    if (msg === "version_conflict") {
      return NextResponse.json(
        { error: "Account changed during request, please retry", code: "version_conflict" },
        { status: 409 },
      );
    }
    // Unmapped — keep it loud rather than silently 200.
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return bigintJson(result, 201);
}
