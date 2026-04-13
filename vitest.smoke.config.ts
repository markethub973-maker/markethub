import { defineConfig } from "vitest/config";

// Dedicated smoke config — targets the live deployment. Separate from the
// unit-test config so regular `npm test` stays offline.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/smoke/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
