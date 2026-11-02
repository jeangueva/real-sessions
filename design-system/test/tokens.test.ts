import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * One palette, not two. The product's stylesheet (web/src/index.css) and the
 * system's tokens.css must declare the same variables with the same values,
 * and tokens.json must describe them. A colour changed in one place and not
 * the others is how a design system quietly stops being the truth.
 */

const ROOT = path.resolve(__dirname, "..");
const WEB_CSS = path.resolve(ROOT, "../web/src/index.css");

function variables(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) return new Map();
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "");
  const map = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map.set(match[1]!, match[2]!.replace(/\s+/g, " ").trim());
  return map;
}

const tokens = readFileSync(path.join(ROOT, "src/tokens/tokens.css"), "utf8");

describe("tokens", () => {
  it.runIf(existsSync(WEB_CSS))("match the product stylesheet, in both themes", () => {
    const web = readFileSync(WEB_CSS, "utf8");
    for (const selector of [":root {", ':root[data-theme="light"] {']) {
      expect(Object.fromEntries(variables(tokens, selector)), selector).toEqual(Object.fromEntries(variables(web, selector)));
    }
  });

  // styles.css is what the previews and the documentation site render with.
  // It promises to be the product stylesheet under a three-line header; a
  // stale copy shows every component in an old palette while tokens pass.
  it.runIf(existsSync(WEB_CSS))("ship the product stylesheet unchanged in styles.css", () => {
    const styles = readFileSync(path.join(ROOT, "src/styles.css"), "utf8");
    const body = styles.split("\n").slice(3).join("\n");
    expect(body === readFileSync(WEB_CSS, "utf8"), "src/styles.css differs from web/src/index.css below its header").toBe(true);
  });

  it("declare the same variables in dark and light", () => {
    const dark = [...variables(tokens, ":root {").keys()].filter((k) => !k.startsWith("--ease"));
    const light = [...variables(tokens, ':root[data-theme="light"] {').keys()];
    expect(light.sort()).toEqual(dark.sort());
  });

  // figma-map.js pairs each Figma variable with a CSS variable. A colour the
  // code has and Figma does not is a token designers cannot pick; a pairing
  // with a variable that is gone is a Figma token pointing at nothing.
  it("are all paired with a Figma variable, and only real ones", async () => {
    const { COLORS } = await import("../src/tokens/figma-map.js");
    const declared = variables(tokens, ":root {");
    const isColor = (name: string) => !/^--(shadow|ease)|-alpha$/.test(name);
    const paired = new Set(COLORS.flatMap((entry) => [entry.css, typeof entry.alpha === "string" ? entry.alpha : ""]));
    for (const name of declared.keys()) if (isColor(name)) expect(paired.has(name), `${name} has no Figma variable`).toBe(true);
    for (const entry of COLORS) expect(declared.has(entry.css), `${entry.figma} → ${entry.css}`).toBe(true);
    expect(new Set(COLORS.map((entry) => entry.figma)).size, "Figma names are unique").toBe(COLORS.length);
  });

  it("are all described in tokens.json", () => {
    const json = JSON.parse(readFileSync(path.join(ROOT, "src/tokens/tokens.json"), "utf8")) as Record<string, unknown>;
    const flat = JSON.stringify(json);
    for (const name of variables(tokens, ":root {").keys()) expect(flat, name).toContain(name);
  });
});
