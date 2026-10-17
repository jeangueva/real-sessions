/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * The internal documentation site (app/) and the test runner.
 *
 * The site is a plain Vite SPA: it imports components, contracts, previews
 * and Markdown straight from src/ with import.meta.glob, so a component added
 * to src/components appears on the site with nothing to register.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@ds": path.resolve(here, "src") } },
  base: "./",
  test: {
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
  },
});
