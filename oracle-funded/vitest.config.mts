import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// API-route contract tests for oracle-funded. Node environment (no DOM).
// `vite-tsconfig-paths` resolves the `@/*` alias the same way Next does.
// Tests are co-located with the routes they cover (e.g. `route.test.ts`).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The Next.js test types validator inside .next/types isn't part of test
    // runs; explicit exclude keeps vitest off any stale generated files.
    exclude: ["node_modules", ".next"],
  },
});
