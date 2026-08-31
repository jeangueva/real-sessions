import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(here, "src") } },
  server: {
    // Keeps the provider key server-side: the browser only ever calls /api.
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
});
