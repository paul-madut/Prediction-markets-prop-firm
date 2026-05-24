// Shared provisioning + refund logic. Both the Authorize.net and the
// NOWPayments webhook handlers funnel into these two functions, so the
// account-creation / refund-effects path lives in exactly one place.
//
// Provisioning is wrapped in a Prisma $transaction by the caller. Idempotency
// is enforced via the `stripeEventId` unique column — replays return the
// sentinel error "already_processed" which the route handler converts to
// a 200 ack so the provider doesn't keep retrying.

import type { Prisma } from "@webflux/db";

export interface ProvisionArgs {
  /** Active Prisma transaction client. */
  tx: Prisma.TransactionClient;
  /** Our payment row, looked up by external session reference. */
  payment: {
    id: string;
    firmId: string;
    userId: string;
    configId: string;
    status: string;
  };
  /** Unique provider event id — written to stripeEventId for idempotency. */
  externalEventId: string;
  /** Human label for audit logs (e.g. "authnet txn 12345"). */
  externalRef: string;
}

/**
 * Flip a pending payment to "paid" and create the trader's account in the
 * same transaction. Throws "already_processed" if the event was seen before.
 */
export async function provisionAccountFromPayment(args: ProvisionArgs): Promise<void> {
  const { tx, payment, externalEventId, externalRef } = args;

  const existing = await tx.payment.findUnique({
    where: { stripeEventId: externalEventId },
    select: { id: true },
  });
  if (existing) throw new Error("already_processed");

  if (payment.status === "paid") {
    // Provisioned via a different code path already. Stamp event id and exit.
    await tx.payment.update({
      where: { id: payment.id },
      data: { stripeEventId: externalEventId },
    });
    return;
  }

  const config = await tx.challengeConfig.findFirst({
    where: { id: payment.configId, firmId: payment.firmId, isActive: true },
    include: {
      phases: { orderBy: { phaseNumber: "asc" }, take: 1, select: { id: true } },
    },
  });
  if (!config || config.phases.length === 0) {
    throw new Error(`config ${payment.configId} not found or has no phases`);
  }
  const firstPhase = config.phases[0];

  const startingBalance = config.accountSizeCents;
  const drawdownBps = BigInt(Math.round(Number(config.totalDrawdownPct) * 100));
  const drawdownAmount = (startingBalance * drawdownBps) / 10000n;
  const drawdownFloor = startingBalance - drawdownAmount;

  const account = await tx.account.create({
    data: {
      firmId: payment.firmId,
      userId: payment.userId,
      configId: config.id,
      currentPhaseId: firstPhase.id,
      status: "active",
      startingBalanceCents: startingBalance,
      currentBalanceCents: startingBalance,
      highestEodBalanceCents: startingBalance,
      highestEodEquityCents: startingBalance,
      drawdownFloorCents: drawdownFloor,
      dayStartEquityCents: startingBalance,
    },
    select: { id: true },
  });

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      paidAt: new Date(),
      stripeEventId: externalEventId,
      accountId: account.id,
    },
  });

  await tx.accountStateLog.create({
    data: {
      firmId: payment.firmId,
      accountId: account.id,
      fromStatus: null,
      toStatus: "active",
      reason: `provisioned via ${externalRef}`,
    },
  });

  await tx.auditLog.create({
    data: {
      firmId: payment.firmId,
      actorUserId: payment.userId,
      action: "account.provision",
      entityType: "account",
      entityId: account.id,
      afterState: {
        configId: config.id,
        externalRef,
        externalEventId,
        startingBalanceCents: startingBalance.toString(),
      },
    },
  });
}

export interface RefundArgs {
  tx: Prisma.TransactionClient;
  externalSessionId: string;
  externalEventId: string;
  externalRef: string;
}

/**
 * Mark a payment as refunded and, if the config says so, disable the
 * provisioned account. Idempotent on externalEventId.
 */
export async function applyRefund(args: RefundArgs): Promise<void> {
  const { tx, externalSessionId, externalEventId, externalRef } = args;

  const dup = await tx.payment.findUnique({
    where: { stripeEventId: externalEventId },
    select: { id: true },
  });
  if (dup) throw new Error("already_processed");

  const payment = await tx.payment.findFirst({
    where: { stripeSessionId: externalSessionId },
    include: { config: { select: { refundDisablesAccount: true } } },
  });
  if (!payment) return;

  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: "refunded",
      refundedAt: new Date(),
      stripeEventId: externalEventId,
    },
  });

  if (payment.config.refundDisablesAccount && payment.accountId) {
    const before = await tx.account.findUnique({
      where: { id: payment.accountId },
      select: { status: true },
    });
    if (before && before.status !== "disabled") {
      await tx.account.update({
        where: { id: payment.accountId },
        data: { status: "disabled", version: { increment: 1 } },
      });
      await tx.accountStateLog.create({
        data: {
          firmId: payment.firmId,
          accountId: payment.accountId,
          fromStatus: before.status,
          toStatus: "disabled",
          reason: `disabled by refund (${externalRef})`,
        },
      });
    }
  }

  await tx.auditLog.create({
    data: {
      firmId: payment.firmId,
      action: "payment.refunded",
      entityType: "payment",
      entityId: payment.id,
      afterState: {
        externalRef,
        externalEventId,
        accountDisabled: payment.config.refundDisablesAccount,
      },
    },
  });
}
