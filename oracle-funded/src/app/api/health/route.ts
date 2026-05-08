// GET /api/health
//
// Liveness + readiness probe. Returns 200 if the app can serve traffic
// (DB reachable + Redis reachable, if configured). Returns 503 if any
// critical subsystem is failing — BetterStack should alert on 503.
//
// Worker heartbeat is *informational*, not load-bearing for the health
// status: a stale worker means the eval cron probably hasn't run, but
// the user-facing app still works (orders fill, payments process, etc.).
// The response includes worker status so on-call can see it at a glance.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import { getRedis, REDIS_KEY_WORKER_HEARTBEAT } from "@/lib/redis";

const WORKER_STALE_MS = 5 * 60_000; // 5 min — generous; tighten when worker runs continuously

interface HealthCheck {
  ok: boolean;
  reason?: string;
  ageMs?: number;
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {};

  // ── DB: a trivial round-trip proves Postgres is reachable ──
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = { ok: true };
  } catch (err) {
    checks.db = { ok: false, reason: err instanceof Error ? err.message : "unknown" };
  }

  // ── Redis: ping if configured (Upstash REST returns "PONG") ──
  const redis = getRedis();
  if (!redis) {
    checks.redis = { ok: false, reason: "not_configured" };
  } else {
    try {
      const reply = await redis.ping();
      checks.redis = { ok: reply === "PONG" };
    } catch (err) {
      checks.redis = { ok: false, reason: err instanceof Error ? err.message : "unknown" };
    }
  }

  // ── Worker heartbeat (informational — does NOT fail health) ──
  let worker: HealthCheck = { ok: false, reason: "no_redis_or_no_heartbeat" };
  if (redis) {
    try {
      const lastRaw = await redis.get<string>(REDIS_KEY_WORKER_HEARTBEAT);
      if (lastRaw == null) {
        worker = { ok: false, reason: "no_heartbeat" };
      } else {
        const last = Number(lastRaw);
        const ageMs = Date.now() - last;
        worker = { ok: ageMs < WORKER_STALE_MS, ageMs };
      }
    } catch {
      worker = { ok: false, reason: "heartbeat_read_failed" };
    }
  }

  // Health is determined by DB + Redis. Worker is reported but not load-bearing.
  // (A stale worker means the eval cron is delayed; the app itself still serves.)
  const ok = checks.db.ok && checks.redis.ok;

  return NextResponse.json(
    {
      ok,
      checks,
      worker,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
