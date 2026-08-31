import { defineConfig } from "vitest/config";

/**
 * One command runs both suites. Root vitest already picked up `web/test`
 * through directory traversal, which worked but only by accident — this makes
 * the scope deliberate so nobody "fixes" it and silently drops the voice tests.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "web/test/**/*.test.ts"],
  },
});
