import preset from "./src/tokens/tailwind-preset.js";

/** The docs site uses the system's own preset — it is a consumer like any other. */
export default {
  presets: [preset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
};
