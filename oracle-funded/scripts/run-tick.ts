// Test helper invoked by tests/phase-5-eval-engine.sh.
// Runs evalTick for a given account id and prints the outcome JSON.
// Lives inside oracle-funded so @prisma/client resolves through @webflux/db.

import { prisma } from "@webflux/db";
import { evalTick } from "../src/lib/eval-engine/tick";

async function main(): Promise<void> {
  const accountId = process.argv[2];
  if (!accountId) {
    console.error("usage: tsx oracle-funded/scripts/run-tick.ts <accountId>");
    process.exit(2);
  }
  try {
    const result = await evalTick(accountId);
    process.stdout.write(JSON.stringify(result, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
