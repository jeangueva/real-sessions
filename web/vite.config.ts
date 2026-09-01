import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(here, "src") } },
  test: {
    /**
     * happy-dom rather than jsdom: these tests render components and assert on
     * what a reader would see, and it is markedly faster for that. Anything
     * needing a real layout engine belongs in the browser, not here.
     *
     * `environmentMatchGlobs` keeps the pure ones — formatting, the fade maths,
     * speech parsing — in node, where they do not pay for a DOM they never use.
     */
    environment: "happy-dom",
    environmentMatchGlobs: [
      ["test/format.test.ts", "node"],
      ["test/voice.test.ts", "node"],
      ["test/speech-input.test.ts", "node"],
      ["test/use-voice.test.ts", "node"],
      ["test/hero-video.test.ts", "node"],
    ],
    setupFiles: ["./test/setup.ts"],
  },
  server: {
    // Keeps the provider key server-side: the browser only ever calls /api.
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
