// Cron route auth. Two flavours of caller:
//   1. Vercel Cron — sends `Authorization: Bearer <CRON_SECRET>` automatically
//      when CRON_SECRET is set in Vercel project env.
//   2. Manual / external trigger — same Bearer header, same secret.
//
// Returns the matching response when auth fails so callers can early-return.

import { NextResponse } from "next/server";

export function checkCronAuth(req: Request): Response | null {
  const expected = process.env.CRON_SECRET;
  // If CRON_SECRET is unset (e.g. local dev without the env), allow the call —
  // never deploy to production without setting CRON_SECRET.
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    return null;
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
