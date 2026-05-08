// Test helper: invoke a cron route handler directly with the right Bearer auth.
// Usage: tsx scripts/run-cron.ts <route> [secret]
//   route ∈ tick-all | eod

import { GET as healthRoute } from "../src/app/api/health/route";
import { GET as tickAllRoute } from "../src/app/api/cron/tick-all/route";
import { GET as eodRoute } from "../src/app/api/cron/eod/route";

async function main(): Promise<void> {
  const [, , routeName, secretOverride] = process.argv;
  const secret = secretOverride ?? process.env.CRON_SECRET ?? "";
  const path =
    routeName === "tick-all"
      ? "/api/cron/tick-all"
      : routeName === "eod"
        ? "/api/cron/eod"
        : routeName === "health"
          ? "/api/health"
          : null;
  if (!path) {
    console.error("usage: run-cron.ts <tick-all|eod|health> [secret]");
    process.exit(2);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (routeName !== "health") {
    headers["Authorization"] = `Bearer ${secret}`;
  }

  const req = new Request(`http://localhost${path}`, { method: "GET", headers });
  let res: Response;
  if (routeName === "health") res = await healthRoute();
  else if (routeName === "tick-all") res = await tickAllRoute(req);
  else res = await eodRoute(req);

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
