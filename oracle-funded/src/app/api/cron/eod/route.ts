// POST/GET /api/cron/eod
//
// Daily end-of-day job. Wired to a 00:01 UTC Vercel Cron in vercel.json
// (one minute after midnight UTC to avoid clock-skew on a 00:00:00 firing).
//
// Idempotent via accounts.last_eod_run_at; same-day re-runs return 0 advanced.

import { NextResponse } from "next/server";
import { runEod } from "@/lib/eval-engine/eod";
import { logger } from "@/lib/logger";
import { checkCronAuth } from "@/lib/cron-auth";

export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request): Promise<Response> {
  const denial = checkCronAuth(req);
  if (denial) return denial;

  const startedAt = Date.now();
  const result = await runEod();
  const elapsedMs = Date.now() - startedAt;
  logger.info({ ...result, elapsedMs }, "eod complete");
  return NextResponse.json({ ok: true, ...result, elapsedMs });
}
