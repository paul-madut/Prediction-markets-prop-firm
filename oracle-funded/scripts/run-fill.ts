// Test helper invoked by tests/phase-4-order-engine.sh via tsx.
// Lives inside oracle-funded so @prisma/client resolves through the workspace.
//
// Imports the production fillOrder and runs a single order id with the 500ms
// minimum-age cushion bypassed (tests don't need to wait).
//
// Usage: tsx oracle-funded/scripts/run-fill.ts <orderId>
// Stdout: JSON-encoded FillResult.

// Use the workspace re-export so @prisma/client resolves through @webflux/db.
import { prisma } from "@webflux/db";
import { fillOrder } from "../src/lib/order-engine/fill-order";

async function main(): Promise<void> {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("usage: tsx oracle-funded/scripts/run-fill.ts <orderId>");
    process.exit(2);
  }

  try {
    const result = await fillOrder(orderId, prisma, { minAgeMs: 0 });
    process.stdout.write(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
