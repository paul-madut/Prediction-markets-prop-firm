// /api/payouts — trader-facing payout request + listing.
//
// GET: traders see their own payout history; admins see all firm payouts.
// POST: trader requests a payout from a funded account. The requested
//   amount must be ≤ profit (currentBalance − startingBalance), and the
//   account's balance is debited up-front (held in escrow until reviewed).
//   Trader receives `requested × profit_split_pct`; the firm keeps the rest.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma, type Prisma } from "@webflux/db";
import { enrichSupabaseAuth } from "@webflux/auth";

function bigintJson(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

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

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;

    const account = await tx.account.findFirst({
      where: { id: accountId, firmId: ctx.firmId, userId: ctx.userId },
      include: { config: { select: { profitSplitPct: true } } },
    });
    if (!account) throw new Error("not_found");
    if (account.status !== "funded") throw new Error(`account_not_funded:${account.status}`);

    const profit = account.currentBalanceCents - account.startingBalanceCents;
    if (profit <= 0n) throw new Error("no_profit");
    if (requestedCents > profit) throw new Error("requested_exceeds_profit");

    // Trader take = requested × profit_split_pct (basis-point math, matches eval engine).
    const splitBps = BigInt(Math.round(Number(account.config.profitSplitPct) * 100));
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
        profitSplitPct: account.config.profitSplitPct,
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
  });

  return bigintJson(result, 201);
}
