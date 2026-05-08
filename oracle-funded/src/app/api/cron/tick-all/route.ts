// POST /api/cron/tick-all
//
// Runs evalTick for every active or funded account. Wired to a Vercel Cron
// schedule (see vercel.json) at 1-minute cadence so price-driven breaches
// surface even when traders aren't filling orders.
//
// On a multi-instance Vercel deployment, only one cron invocation fires per
// schedule tick — no need for distributed locking.
//
// Heartbeats Redis on every successful sweep so /api/health can confirm the
// eval engine is alive.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import { evalTick } from "@/lib/eval-engine/tick";
import { getRedis, REDIS_KEY_WORKER_HEARTBEAT } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export async function POST(req: Request) {
  const denial = checkCronAuth(req);
  if (denial) return denial;
  return runTickAll();
}

// Vercel Cron uses GET. Allow either verb to make manual triggering easy.
export async function GET(req: Request) {
  const denial = checkCronAuth(req);
  if (denial) return denial;
  return runTickAll();
}

async function runTickAll(): Promise<Response> {
  const startedAt = Date.now();

  const accounts = await prisma.account.findMany({
    where: { status: { in: ["active", "funded"] } },
    select: { id: true },
  });

  let succeeded = 0;
  let breached = 0;
  let failed = 0;
  for (const a of accounts) {
    try {
      const outcome = await evalTick(a.id);
      if (outcome.kind === "ok" && outcome.isBreach) breached += 1;
      succeeded += 1;
    } catch (err) {
      failed += 1;
      logger.error(
        { accountId: a.id, err: err instanceof Error ? err.message : String(err) },
        "tick-all: evalTick failed",
      );
    }
  }

  const elapsedMs = Date.now() - startedAt;

  const redis = getRedis();
  if (redis) {
    try {
      // 5-minute TTL so a dead cron leaves the heartbeat to expire naturally.
      await redis.set(REDIS_KEY_WORKER_HEARTBEAT, String(Date.now()), { ex: 300 });
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "tick-all: heartbeat write failed",
      );
    }
  }

  logger.info(
    { scanned: accounts.length, succeeded, breached, failed, elapsedMs },
    "tick-all complete",
  );

  return NextResponse.json({
    ok: true,
    scanned: accounts.length,
    succeeded,
    breached,
    failed,
    elapsedMs,
  });
}
