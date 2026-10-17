/**
 * Reads the two token sources — src/tokens/tokens.css (the values, both
 * themes) and src/tokens/tailwind-preset.js (the names Tailwind gives them) —
 * for the scripts that generate from them:
 *
 *   build-tokens.mjs     tokens.json and theme.css
 *   build-registry.ts    the theme item's cssVars and css in registry.json
 *
 * One reader, so the three generated views of the palette cannot disagree on
 * which variables exist or what they are called.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DARK_SELECTOR = ":root {";
export const LIGHT_SELECTOR = ':root[data-theme="light"] {';

/** The body of the first rule whose text starts with `selector`, braces balanced. */
export function cssBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(open + 1, i);
  }
  return "";
}

/** Custom properties declared in a rule body, comments stripped, whitespace collapsed. */
export function cssVariables(body) {
  const map = new Map();
  for (const m of body.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1], m[2].replace(/\s+/g, " ").trim());
  }
  return map;
}

/** Both themes from tokens.css: `dark` is :root (the default), `light` is data-theme="light". */
export function readTokens(root) {
  const css = readFileSync(path.join(root, "src/tokens/tokens.css"), "utf8");
  return {
    dark: cssVariables(cssBlock(css, DARK_SELECTOR)),
    light: cssVariables(cssBlock(css, LIGHT_SELECTOR)),
  };
}

/** The v3 preset, as the object it exports. */
export async function readPreset(root) {
  const module = await import(pathToFileURL(path.join(root, "src/tokens/tailwind-preset.js")).href);
  return module.default;
}

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/**
 * The preset's theme as Tailwind v4 theme variables: [name, value] pairs
 * without the leading "--", in the preset's own order, grouped by namespace.
 *
 * The names are chosen so a class means the same thing under both versions:
 * `bg-surface-card`, `text-cream-dim`, `rounded-card`, `shadow-lift`,
 * `ease-press`, `text-title`, `animate-live`. The only rewrite is the v3
 * `<alpha-value>` placeholder — v4 applies opacity modifiers itself, with
 * color-mix(), so `rgb(var(--cream) / <alpha-value>)` becomes
 * `rgb(var(--cream))` and `bg-cream/50` still works.
 *
 * `runtime` is the :root variable map from tokens.css, used to pin v4 defaults
 * whose names collide with a Mockio variable.
 */
export function themeVariables(preset, runtime = new Map()) {
  const theme = preset.theme.extend;
  const out = [];

  for (const [name, stack] of Object.entries(theme.fontFamily ?? {})) {
    out.push([`font-${name}`, stack.join(", ")]);
  }
  for (const [name, value] of Object.entries(theme.fontSize ?? {})) {
    const [size, extra = {}] = Array.isArray(value) ? value : [value];
    out.push([`text-${name}`, size]);
    if (extra.lineHeight) out.push([`text-${name}--line-height`, extra.lineHeight]);
    if (extra.letterSpacing) out.push([`text-${name}--letter-spacing`, extra.letterSpacing]);
    if (extra.fontWeight) out.push([`text-${name}--font-weight`, extra.fontWeight]);
  }
  for (const [name, value] of Object.entries(theme.colors ?? {})) {
    const shades = typeof value === "string" ? { DEFAULT: value } : value;
    for (const [shade, color] of Object.entries(shades)) {
      const key = shade === "DEFAULT" ? `color-${name}` : `color-${name}-${shade}`;
      out.push([key, color.replace(/\s*\/\s*<alpha-value>\s*\)/, ")")]);
    }
  }
  for (const [name, value] of Object.entries(theme.borderRadius ?? {})) out.push([`radius-${name}`, value]);
  for (const [name, value] of Object.entries(theme.boxShadow ?? {})) out.push([`shadow-${name}`, value]);
  for (const [name, value] of Object.entries(theme.transitionTimingFunction ?? {})) out.push([`ease-${name}`, value]);
  // tokens.css declares a runtime --ease-out (the UI curve, for hand-written
  // rules). v4's own `ease-out` class reads var(--ease-out), so without a pin
  // it would pick up Mockio's curve and differ from the same class under v3.
  if (runtime.has("--ease-out") && !out.some(([name]) => name === "ease-out")) {
    out.push(["ease-out", "cubic-bezier(0, 0, 0.2, 1)"]);
  }
  for (const [name, value] of Object.entries(theme.animation ?? {})) out.push([`animate-${name}`, value]);
  return out;
}

/**
 * The preset's keyframes as nested objects ({ "@keyframes fadeRise": { from:
 * { opacity: "0" } } }) — the shape a shadcn registry item's `css` field takes.
 */
export function keyframeRules(preset) {
  const rules = {};
  for (const [name, frames] of Object.entries(preset.theme.extend.keyframes ?? {})) {
    const steps = {};
    for (const [step, declarations] of Object.entries(frames)) {
      steps[step.replace(/\s*,\s*/g, ", ")] = Object.fromEntries(
        Object.entries(declarations).map(([property, value]) => [kebab(property), String(value)]),
      );
    }
    rules[`@keyframes ${name}`] = steps;
  }
  return rules;
}

/** Nested rule objects as CSS text, indented by `indent` spaces. */
export function rulesToCss(rules, indent = 0) {
  const pad = " ".repeat(indent);
  const lines = [];
  for (const [selector, body] of Object.entries(rules)) {
    lines.push(`${pad}${selector} {`);
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") lines.push(`${pad}  ${key}: ${value};`);
      else lines.push(...rulesToCss({ [key]: value }, indent + 2));
    }
    lines.push(`${pad}}`);
  }
  return lines;
}
