// Test helper invoked by tests/phase-5-eval-engine.sh.
// Runs the EOD job and prints the outcome.

import { prisma } from "@webflux/db";
import { runEod } from "../src/lib/eval-engine/eod";

async function main(): Promise<void> {
  try {
    const result = await runEod();
    process.stdout.write(JSON.stringify(result));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
