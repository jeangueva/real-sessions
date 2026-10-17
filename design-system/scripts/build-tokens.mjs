/**
 * tokens.css → tokens.json and theme.css.
 *
 * tokens.css is the source. Two files are generated from it, for consumers
 * that cannot use it directly:
 *
 *   tokens.json   the W3C Design Tokens (DTCG) format, for tools that do not
 *                 read CSS (design tools, Lunagraph, Style Dictionary). Each
 *                 token carries its CSS variable and both themes' values.
 *   theme.css     a Tailwind v4 stylesheet: both themes' variables plus an
 *                 `@theme inline` block that gives them the same utility names
 *                 the v3 preset does, for v4 projects and shadcn-style tools.
 *                 The names come from tailwind-preset.js, so the two versions
 *                 cannot drift apart.
 *
 *   node scripts/build-tokens.mjs           write both
 *   node scripts/build-tokens.mjs --check   fail if either is out of date
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keyframeRules, readPreset, readTokens, rulesToCss, themeVariables } from "./token-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { dark, light } = readTokens(root);
const preset = await readPreset(root);

// ── tokens.json ─────────────────────────────────────────────────────────────

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

const tokensJson = JSON.stringify(out, null, 2) + "\n";

// ── theme.css ───────────────────────────────────────────────────────────────

const declarations = (map) => [...map].map(([name, value]) => `  ${name}: ${value};`);
const theme = themeVariables(preset, dark);
const namespaces = [...new Set(theme.map(([name]) => name.split("-")[0]))];

const themeCss = [
  "/**",
  " * Mockio theme for Tailwind CSS v4 and shadcn-style tools.",
  " *",
  " * GENERATED by scripts/build-tokens.mjs from src/tokens/tokens.css (the",
  " * values) and src/tokens/tailwind-preset.js (the names). Edit those and run",
  " * `npm run tokens`; `npm run check` fails while this file is stale.",
  " *",
  " * Import it after Tailwind, and point Tailwind at the components:",
  " *",
  ' *   @import "tailwindcss";',
  ' *   @import "@mockio/design-system/theme.css";',
  ' *   @source "../node_modules/@mockio/design-system/src";',
  " *",
  " * The classes are the ones the v3 preset makes — bg-surface-card,",
  " * text-cream-dim, border-line, rounded-card, shadow-lift, ease-press,",
  " * text-title — so a component reads the same under either version.",
  " *",
  " * Dark is the default, on :root. Light applies with data-theme=\"light\" on",
  " * <html> or on any subtree. `.dark` / data-theme=\"dark\" bring dark back",
  " * inside a light page, and `.light` mirrors data-theme=\"light\", for tools",
  " * that toggle a class rather than an attribute.",
  " *",
  " * Colours are RGB channels (\"94 92 230\") so `rgb(var(--accent) / 0.5)`",
  " * works in hand-written CSS; the @theme block wraps them in rgb().",
  " *",
  " * The component classes (focus-ring, liquid-glass, field-control, on-media)",
  " * live in src/styles.css, which is written for Tailwind v3.",
  " */",
  "",
  "/* Dark: the default. :host so the variables also reach a shadow root. */",
  ":root,",
  ":host,",
  '[data-theme="dark"],',
  ".dark {",
  ...declarations(dark),
  "}",
  "",
  '/* Light: data-theme="light" on <html>, or on any subtree. */',
  ':root[data-theme="light"],',
  '[data-theme="light"],',
  ".light {",
  ...declarations(light),
  "}",
  "",
  "/*",
  " * Utilities. `inline` so each class reads the variable where it is used:",
  " * a subtree with data-theme=\"light\" re-themes without new classes.",
  " */",
  "@theme inline {",
  ...namespaces.flatMap((namespace, index) => [
    ...(index > 0 ? [""] : []),
    ...theme.filter(([name]) => name.split("-")[0] === namespace).map(([name, value]) => `  --${name}: ${value};`),
  ]),
  "",
  ...rulesToCss(keyframeRules(preset), 2),
  "}",
  "",
].join("\n");

// ── write or check ──────────────────────────────────────────────────────────

const targets = [
  ["src/tokens/tokens.json", tokensJson],
  ["src/tokens/theme.css", themeCss],
];

if (process.argv.includes("--check")) {
  const stale = targets.filter(([file, text]) => {
    const target = path.join(root, file);
    return !existsSync(target) || readFileSync(target, "utf8") !== text;
  });
  if (stale.length > 0) {
    console.error(`${stale.map(([file]) => file).join(" and ")} out of date: run npm run tokens`);
    process.exit(1);
  }
  console.log(`tokens.json and theme.css up to date (${dark.size} variables)`);
} else {
  for (const [file, text] of targets) writeFileSync(path.join(root, file), text);
  console.log(`tokens.json: ${dark.size} variables; theme.css: ${theme.length} theme variables`);
}
