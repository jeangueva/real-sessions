/**
 * tokens.css → tokens.json, in the W3C Design Tokens (DTCG) format.
 *
 * tokens.css is the source; this file is generated so tools that do not read
 * CSS (design tools, Lunagraph, Style Dictionary) get the same palette. Each
 * token carries its CSS variable and both themes' values.
 *
 *   node scripts/build-tokens.mjs           write src/tokens/tokens.json
 *   node scripts/build-tokens.mjs --check   fail if it is out of date
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(root, "src/tokens/tokens.css"), "utf8");

function block(selector) {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  return "";
}

function vars(body) {
  const map = new Map();
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].replace(/\s+/g, " ").trim());
  }
  return map;
}

const dark = vars(block(":root {"));
const light = vars(block(':root[data-theme="light"] {'));

const asColor = (value) => (/^\d+ \d+ \d+$/.test(value) ? `rgb(${value})` : value);

const GROUPS = [
  ["ink", /^--cream/],
  ["surface", /^--surface|^--scrim/],
  ["line", /^--line/],
  ["role", /^--(accent|grow|step|premium)/],
  ["shadow", /^--shadow/],
  ["easing", /^--ease/],
];

const out = {
  $description:
    "Mockio design tokens. Generated from src/tokens/tokens.css by scripts/build-tokens.mjs — edit the CSS, not this file. Dark is the default theme; light applies with data-theme=\"light\" on <html>.",
};
for (const [name, value] of dark) {
  const group = GROUPS.find(([, re]) => re.test(name))?.[0] ?? "other";
  const key = name.replace(/^--/, "");
  const type = group === "shadow" ? "shadow" : group === "easing" ? "cubicBezier" : group === "other" ? "string" : "color";
  out[group] ??= {};
  out[group][key] = {
    $type: type,
    $value: type === "color" ? asColor(value) : value,
    $extensions: {
      "com.mockio": {
        cssVariable: name,
        tailwind: /^\d+ \d+ \d+$/.test(value) ? `rgb(var(${name}) / <alpha-value>)` : `var(${name})`,
        dark: type === "color" ? asColor(value) : value,
        ...(light.has(name) ? { light: type === "color" ? asColor(light.get(name)) : light.get(name) } : {}),
      },
    },
  };
}
out.typography = {
  $description: "The type scale from the Tailwind preset. Nothing in the interface is smaller than 14px.",
  xs: { $type: "dimension", $value: "0.875rem", $extensions: { "com.mockio": { lineHeight: "1.5", tailwind: "text-xs" } } },
  sm: { $type: "dimension", $value: "1rem", $extensions: { "com.mockio": { lineHeight: "1.55", tailwind: "text-sm" } } },
  base: { $type: "dimension", $value: "1.0625rem", $extensions: { "com.mockio": { lineHeight: "1.6", tailwind: "text-base" } } },
  title: { $type: "dimension", $value: "clamp(1.25rem, 2vw, 1.75rem)", $extensions: { "com.mockio": { lineHeight: "1.18", letterSpacing: "-0.018em", tailwind: "text-title" } } },
  headline: { $type: "dimension", $value: "clamp(2rem, 4.6vw, 4rem)", $extensions: { "com.mockio": { lineHeight: "1.04", letterSpacing: "-0.032em", tailwind: "text-headline" } } },
  display: { $type: "dimension", $value: "clamp(3rem, 9vw, 8rem)", $extensions: { "com.mockio": { lineHeight: "0.95", letterSpacing: "-0.045em", tailwind: "text-display" } } },
  family: { $type: "fontFamily", $value: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Inter", "Almarai", "system-ui", "sans-serif"] },
};
out.radius = {
  pill: { $type: "dimension", $value: "9999px", $extensions: { "com.mockio": { tailwind: "rounded-full" } } },
  card: { $type: "dimension", $value: "1.25rem", $extensions: { "com.mockio": { tailwind: "rounded-card" } } },
  inset: { $type: "dimension", $value: "1.75rem", $extensions: { "com.mockio": { tailwind: "rounded-inset" } } },
};
out.motion = {
  press: { $type: "cubicBezier", $value: [0.23, 1, 0.32, 1], $extensions: { "com.mockio": { tailwind: "ease-press", use: "Every UI response: press, popover, focus halo." } } },
  drawer: { $type: "cubicBezier", $value: [0.32, 0.72, 0, 1], $extensions: { "com.mockio": { tailwind: "ease-drawer", use: "Sheets sliding from an edge." } } },
  cinematic: { $type: "cubicBezier", $value: [0.16, 1, 0.3, 1], $extensions: { "com.mockio": { tailwind: "ease-cinematic", use: "Page-level entrances." } } },
  "duration-press": { $type: "duration", $value: "75ms" },
  "duration-ui": { $type: "duration", $value: "150ms" },
  "duration-enter": { $type: "duration", $value: "200ms" },
};

const json = JSON.stringify(out, null, 2) + "\n";
const target = path.join(root, "src/tokens/tokens.json");
if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");
  if (current !== json) {
    console.error("tokens.json is out of date: run node scripts/build-tokens.mjs");
    process.exit(1);
  }
} else {
  writeFileSync(target, json);
  console.log(`tokens.json: ${dark.size} variables`);
}
