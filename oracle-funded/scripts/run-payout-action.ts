// Test helper: invoke a payout admin route directly.
// Usage: tsx scripts/run-payout-action.ts <approve|reject|mark-paid> <payoutId> [bodyJson]

import { POST as approveRoute } from "../src/app/api/admin/payouts/[id]/approve/route";
import { POST as rejectRoute } from "../src/app/api/admin/payouts/[id]/reject/route";
import { POST as markPaidRoute } from "../src/app/api/admin/payouts/[id]/mark-paid/route";

async function main(): Promise<void> {
  const [, , handler, payoutId, bodyJson] = process.argv;
  const url = `http://localhost/api/admin/payouts/${payoutId}/${handler}`;
  const req = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyJson ?? "{}",
  });
  const params = Promise.resolve({ id: payoutId });

  let res: Response;
  switch (handler) {
    case "approve": res = await approveRoute(req, { params }); break;
    case "reject": res = await rejectRoute(req, { params }); break;
    case "mark-paid": res = await markPaidRoute(req, { params }); break;
    default: console.error("usage: <approve|reject|mark-paid>"); process.exit(2);
  }
  const body = await res.text();
  process.stdout.write(JSON.stringify({ status: res.status, body: tryParse(body) }));
}
function tryParse(s: string): unknown { try { return JSON.parse(s); } catch { return s; } }
main().catch((e) => { console.error(e); process.exit(1); });
