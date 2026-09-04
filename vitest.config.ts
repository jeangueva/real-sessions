import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * One command runs both suites. Root vitest already picked up `web/test`
 * through directory traversal, which worked but only by accident — this makes
 * the scope deliberate so nobody "fixes" it and silently drops the voice tests.
 */
export default defineConfig({
  // The web tests import their own modules by the `@` alias the app uses. Root
  // vitest has no vite config of its own, so without this a web test that
  // reaches for `@/lib/api` fails to collect — and a file that fails to
  // collect reports as zero tests, which is easy to mistake for a smaller
  // suite rather than a broken one.
  resolve: { alias: { "@": path.resolve(here, "web/src") } },
  test: {
    include: ["test/**/*.test.ts", "web/test/**/*.test.ts"],
  },
});
