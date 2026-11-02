/**
 * tokens.css → tokens.json and theme.css.
 *
 * tokens.css is the source. Three files are generated from it, for consumers
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
 *   figma.json    the values the Figma library must hold, paired by
 *                 src/tokens/figma-map.js (see docs/guides/figma.md).
 *
 *   node scripts/build-tokens.mjs           write all three
 *   node scripts/build-tokens.mjs --check   fail if any is out of date
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
  headline: { $type: "dimension", $value: "clamp(2rem, 4.6vw, 4rem)", $extensions: { "com.mockio": { lineHeight: "1.04", letterSpacing: "-0.04em", fontWeight: "300", tailwind: "text-headline" } } },
  display: { $type: "dimension", $value: "clamp(3rem, 9vw, 8rem)", $extensions: { "com.mockio": { lineHeight: "0.95", letterSpacing: "-0.045em", fontWeight: "300", tailwind: "text-display" } } },
  family: { $type: "fontFamily", $value: ["Inter Tight", "Inter", "-apple-system", "BlinkMacSystemFont", "Almarai", "system-ui", "sans-serif"] },
  mono: { $type: "fontFamily", $value: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"], $extensions: { "com.mockio": { tailwind: "font-mono", use: "Labels, chips, tabs and figures, uppercase with a little tracking." } } },
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

// ── figma.json ──────────────────────────────────────────────────────────────
//
// What the Figma library must hold, resolved from figma-map.js against the
// same tokens.css and preset. An agent pushes it into the file and reads the
// file back against it (docs/guides/figma.md); neither side is edited by hand.

const figmaMap = await import(pathToFileURL(path.join(root, "src/tokens/figma-map.js")).href);

/** "246 183 51" or "rgba(46, 45, 42, 0.11)" → [r, g, b, a]. */
function channels(value) {
  if (/^\d+ \d+ \d+$/.test(value)) return [...value.split(" ").map(Number), 1];
  const m = value.match(/^rgba?\(([^)]+)\)$/);
  if (!m) throw new Error(`figma.json: cannot read colour "${value}"`);
  const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
  return [Number(r), Number(g), Number(b), Number(a)];
}
const hex = ([r, g, b, a]) =>
  `#${[r, g, b, Math.round(a * 255)].map((n) => n.toString(16).padStart(2, "0")).join("").toUpperCase()}`;

function resolveColor(entry, theme) {
  if (!theme.has(entry.css)) throw new Error(`figma-map.js: ${entry.figma} names ${entry.css}, which tokens.css does not declare`);
  const color = channels(theme.get(entry.css));
  if (typeof entry.alpha === "number") color[3] = entry.alpha;
  else if (entry.alpha) color[3] = Number(theme.get(entry.alpha));
  return hex(color);
}

const rem = (value) => Math.round(parseFloat(value) * (value.endsWith("rem") ? 16 : 1) * 100) / 100;
const em = (value) => (value ? parseFloat(value) : 0);
const family = (name) => preset.theme.extend.fontFamily[name][0].replace(/"/g, "");

function textStyles(style) {
  const [size, extra = {}] = style.preset ? [].concat(preset.theme.extend.fontSize[style.preset]) : [`${style.px}px`];
  const base = {
    family: family(style.family),
    weight: style.weight ?? Number(extra.fontWeight ?? 400),
    lineHeight: Number(style.lineHeight ?? extra.lineHeight ?? 1.5),
    letterSpacing: em(style.letterSpacing ?? extra.letterSpacing),
    uppercase: Boolean(style.uppercase),
    tailwind: style.tailwind,
  };
  const clamp = size.match(/^clamp\(([^,]+),[^,]+,([^)]+)\)$/);
  if (!clamp) return [{ name: style.figma, size: rem(size), ...base }];
  return [
    { name: `Desktop/${style.figma}`, size: rem(clamp[2].trim()), ...base },
    { name: `Mobile/${style.figma}`, size: rem(clamp[1].trim()), ...base },
  ];
}

/** "0 0 0 1px rgba(…), 0 12px 32px rgba(…)" → [{ x, y, blur, spread, color }]. */
const shadows = (value) =>
  value.split(/,(?![^(]*\))/).map((layer) => {
    const color = layer.match(/rgba?\([^)]+\)/)[0];
    const [x, y, blur = 0, spread = 0] = layer.replace(color, "").trim().split(/\s+/).map((n) => parseFloat(n));
    return { x, y, blur, spread, color: hex(channels(color)) };
  });

const figmaJson =
  JSON.stringify(
    {
      $description:
        "What the Figma library must hold. Generated from src/tokens/figma-map.js, tokens.css and the preset by scripts/build-tokens.mjs — edit those, not this file. Colours are #RRGGBBAA.",
      file: figmaMap.FIGMA_FILE,
      colors: figmaMap.COLORS.map((entry) => ({
        name: entry.figma,
        css: entry.alpha ? `${entry.css} @ ${entry.alpha}` : entry.css,
        tailwind: entry.tailwind,
        scopes: entry.scopes,
        light: resolveColor(entry, light),
        dark: resolveColor(entry, dark),
      })),
      radii: figmaMap.RADII.map((entry) => ({
        name: entry.figma,
        px: entry.px ?? rem(preset.theme.extend.borderRadius[entry.preset]),
        tailwind: entry.tailwind,
      })),
      spacing: figmaMap.SPACING.map((entry) => ({ name: entry.figma, px: entry.px, tailwind: entry.tailwind })),
      textStyles: figmaMap.TEXT_STYLES.flatMap(textStyles),
      effectStyles: figmaMap.SHADOWS.flatMap((entry) =>
        [
          ["Light", light],
          ["Dark", dark],
        ].map(([mode, theme]) => ({ name: `${entry.figma}/${mode}`, css: entry.css, tailwind: entry.tailwind, shadows: shadows(theme.get(entry.css)) })),
      ),
    },
    null,
    2,
  ) + "\n";

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
  ["src/tokens/figma.json", figmaJson],
];

if (process.argv.includes("--check")) {
  const stale = targets.filter(([file, text]) => {
    const target = path.join(root, file);
    return !existsSync(target) || readFileSync(target, "utf8") !== text;
  });
  if (stale.length > 0) {
    console.error(`${stale.map(([file]) => file).join(", ")} out of date: run npm run tokens`);
    process.exit(1);
  }
  console.log(`tokens.json, theme.css and figma.json up to date (${dark.size} variables)`);
} else {
  for (const [file, text] of targets) writeFileSync(path.join(root, file), text);
  console.log(`tokens.json: ${dark.size} variables; theme.css: ${theme.length} theme variables; figma.json: ${JSON.parse(figmaJson).colors.length} colours`);
}
