// Test helper: insert a payout request directly via Prisma (the production
// /api/payouts POST does the same writes; this skips its session auth so
// the smoke test can drive the full lifecycle without a real cookie).
//
// Usage: tsx scripts/insert-payout.ts <accountId> <userId> <requestedCents>

import { prisma } from "@webflux/db";

async function main(): Promise<void> {
  const [, , accountId, userId, requestedRaw] = process.argv;
  if (!accountId || !userId || !requestedRaw) {
    console.error("usage: insert-payout.ts <accountId> <userId> <requestedCents>");
    process.exit(2);
  }
  const requestedCents = BigInt(requestedRaw);

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { config: { select: { profitSplitPct: true } } },
    });
    if (!account) {
      process.stdout.write(JSON.stringify({ error: "no_account" }));
      return;
    }

    const splitBps = BigInt(Math.round(Number(account.config.profitSplitPct) * 100));
    const traderAmountCents = (requestedCents * splitBps) / 10000n;

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT 1 FROM accounts WHERE id = ${accountId}::uuid FOR UPDATE`;
      const a = await tx.account.findUniqueOrThrow({
        where: { id: accountId },
        select: { firmId: true, currentBalanceCents: true, version: true },
      });
      await tx.account.update({
        where: { id: accountId },
        data: {
          currentBalanceCents: a.currentBalanceCents - requestedCents,
          version: { increment: 1 },
        },
      });
      const p = await tx.payout.create({
        data: {
          firmId: a.firmId,
          accountId,
          userId,
          requestedCents,
          profitSplitPct: account.config.profitSplitPct,
          traderAmountCents,
          status: "requested",
        },
      });
      return {
        id: p.id,
        requestedCents: requestedCents.toString(),
        traderAmountCents: traderAmountCents.toString(),
      };
    });

    process.stdout.write(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
