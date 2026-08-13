import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 60000,
    // The e2e suite needs the dev server + Postgres, so it is opt-in via env:
    //   npm run test:e2e   (boots everything)
    //   npm run test:unit  (no DB required)
    env: {
      TEST_API_URL: process.env.TEST_API_URL ?? "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next.js build-time marker — a no-op outside the app router.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-stub.ts"),
    },
  },
});
