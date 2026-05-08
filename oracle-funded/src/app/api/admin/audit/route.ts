// GET /api/admin/audit
//
// Audit-log search. Always firm-scoped. Filters via query params:
//   - action       — exact match, e.g. "account.freeze" or "checkout.session.created"
//   - actorUserId  — exact match (UUID)
//   - entityType   — exact match: "account" | "order" | "payment" | "firm_member" | …
//   - entityId     — exact match (UUID)
//   - since / until — ISO 8601 timestamps, inclusive lower / exclusive upper
//   - limit        — capped at 200, default 50
//   - cursor       — opaque ISO timestamp for keyset pagination
//
// Returns rows newest-first. Cursor for the next page is the createdAt of
// the last row returned; pass it as `cursor` on the next request.

import { NextResponse } from "next/server";
import { prisma } from "@webflux/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const ctx = guard.ctx;

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim() || undefined;
  const actorUserId = url.searchParams.get("actorUserId")?.trim() || undefined;
  const entityType = url.searchParams.get("entityType")?.trim() || undefined;
  const entityId = url.searchParams.get("entityId")?.trim() || undefined;
  const sinceRaw = url.searchParams.get("since");
  const untilRaw = url.searchParams.get("until");
  const cursorRaw = url.searchParams.get("cursor");
  const limitRaw = url.searchParams.get("limit");

  const since = parseDate(sinceRaw, "since");
  if (since instanceof Response) return since;
  const until = parseDate(untilRaw, "until");
  if (until instanceof Response) return until;
  const cursor = parseDate(cursorRaw, "cursor");
  if (cursor instanceof Response) return cursor;

  const limit = Math.min(200, Math.max(1, Number(limitRaw) || 50));

  const rows = await prisma.auditLog.findMany({
    where: {
      firmId: ctx.firmId,
      ...(action ? { action } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(until ? { createdAt: { ...(since ? { gte: since } : {}), lt: until } } : {}),
      ...(cursor ? { createdAt: { lt: cursor, ...(since ? { gte: since } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const nextCursor = rows.length === limit ? rows[rows.length - 1].createdAt.toISOString() : null;
  return NextResponse.json({ rows, nextCursor, count: rows.length });
}

function parseDate(s: string | null, name: string): Date | undefined | Response {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.valueOf())) {
    return NextResponse.json(
      { error: `${name} must be a valid ISO 8601 timestamp` },
      { status: 400 },
    );
  }
  return d;
}
