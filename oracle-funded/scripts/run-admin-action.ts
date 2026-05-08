// Test helper for Phase 7 — invoke an admin route handler directly.
//
// Usage: tsx oracle-funded/scripts/run-admin-action.ts <handler> <accountId> [bodyJson]
// where <handler> ∈ override | force-breach | reset | force-close | audit-search
//
// Skips the requireAdmin() guard's session-based auth by short-circuiting
// the supabase server client when SKIP_ADMIN_GUARD_FOR_TEST is set. This
// is the only file that touches the guard's internals.

import { POST as overrideRoute } from "../src/app/api/admin/accounts/[id]/override/route";
import { POST as forceBreachRoute } from "../src/app/api/admin/accounts/[id]/force-breach/route";
import { POST as resetRoute } from "../src/app/api/admin/accounts/[id]/reset/route";
import { POST as forceCloseRoute } from "../src/app/api/admin/accounts/[id]/force-close/route";
import { GET as auditRoute } from "../src/app/api/admin/audit/route";

async function main(): Promise<void> {
  const [, , handler, accountId, bodyJson, queryStr] = process.argv;
  if (!handler) {
    console.error("usage: run-admin-action.ts <handler> <accountId> [bodyJson] [queryString]");
    process.exit(2);
  }

  const url =
    handler === "audit-search"
      ? `http://localhost/api/admin/audit${queryStr ?? ""}`
      : `http://localhost/api/admin/accounts/${accountId}/${handler}`;

  const req = new Request(url, {
    method: handler === "audit-search" ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: handler === "audit-search" ? undefined : bodyJson ?? "{}",
  });

  const params = Promise.resolve({ id: accountId ?? "" });
  let res: Response;
  switch (handler) {
    case "override":
      res = await overrideRoute(req, { params });
      break;
    case "force-breach":
      res = await forceBreachRoute(req, { params });
      break;
    case "reset":
      res = await resetRoute(req, { params });
      break;
    case "force-close":
      res = await forceCloseRoute(req, { params });
      break;
    case "audit-search":
      res = await auditRoute(req);
      break;
    default:
      console.error(`unknown handler: ${handler}`);
      process.exit(2);
  }

  const body = await res.text();
  process.stdout.write(JSON.stringify({ status: res.status, body: tryParse(body) }));
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
