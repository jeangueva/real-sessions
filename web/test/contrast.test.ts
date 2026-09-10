import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Contrast, computed rather than eyeballed.
 *
 * The light theme shipped with `cream-faint` at 2.7:1 against a card — below
 * the floor for body text, on the token that every hint, caption, placeholder
 * and metric label in the product wears. Nobody caught it by looking, because
 * near-black on off-white looks fine until you measure it.
 *
 * So this reads the real tokens out of `index.css` and `tailwind.config.js`
 * and does the arithmetic. It fails if someone softens a step for looks, which
 * is exactly how the first one got there.
 */

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const css = read("../src/index.css");
const config = read("../tailwind.config.js");

type RGB = [number, number, number];

/** WCAG 2.1 relative luminance. */
function luminance([r, g, b]: RGB): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: RGB, b: RGB): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Flattens a translucent ink onto an opaque ground, the way a browser does. */
function composite(ink: RGB, alpha: number, ground: RGB): RGB {
  return ink.map((c, i) =>
    Math.round(c * alpha + ground[i]! * (1 - alpha)),
  ) as RGB;
}

/** The `--x: 1 2 3` channel triples inside one `:root` block. */
function channels(block: string, name: string): RGB {
  const match = block.match(new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`));
  if (!match) throw new Error(`${name} not found`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** The alpha out of a `--x: rgba(r, g, b, a)` declaration. */
function lineAlpha(block: string, name: string): number {
  const match = block.match(new RegExp(`--${name}:\\s*rgba\\([^)]*?([\\d.]+)\\)`));
  if (!match) throw new Error(`${name} not found`);
  return Number(match[1]);
}

/** The alpha Tailwind gives an ink step, e.g. `dim: "rgb(var(--cream) / 0.85)"`. */
function inkAlpha(step: string): number {
  const match = config.match(
    new RegExp(`${step}:\\s*"rgb\\(var\\(--cream\\) / ([\\d.]+)\\)"`),
  );
  if (!match) throw new Error(`cream-${step} not found in tailwind.config.js`);
  return Number(match[1]);
}

/**
 * The dark palette is what `:root` declares; light is the override block.
 * Splitting on the override keeps each theme's values apart even though they
 * share variable names.
 */
const LIGHT_START = css.indexOf(':root[data-theme="light"]');
const DARK_BLOCK = css.slice(0, LIGHT_START);
const LIGHT_BLOCK = css.slice(LIGHT_START, css.indexOf("@layer components"));

function palette(block: string) {
  const ink = channels(block, "cream");
  const base = channels(block, "surface-base");
  const sunkenAlpha = Number(
    block.match(/--surface-sunken-alpha:\s*([\d.]+)/)?.[1] ?? "0",
  );
  const liftAlpha = Number(
    block.match(/--surface-lift-alpha:\s*([\d.]+)/)?.[1] ?? "0",
  );
  const card = channels(block, "surface-card");
  return {
    ink,
    bright: channels(block, "cream-bright"),
    lineStrong: lineAlpha(block, "line-strong"),
    surfaces: {
      "surface-base": base,
      "surface-raised": channels(block, "surface-raised"),
      "surface-card": card,
      "surface-deep": channels(block, "surface-deep"),
      // The two translucent surfaces, flattened onto what they sit on.
      "surface-sunken": composite(channels(block, "surface-sunken"), sunkenAlpha, base),
      "surface-lift": composite(channels(block, "surface-lift"), liftAlpha, card),
    },
  };
}

const THEMES = { dark: palette(DARK_BLOCK), light: palette(LIGHT_BLOCK) };

/**
 * Every type size in this product is normal weight and under 24px — the
 * scale tops out at 17px for body — so the large-text exemption never
 * applies and 4.5:1 is the floor for all of it.
 */
const TEXT = 4.5;
/** WCAG 1.4.11, for the border that says "this is a field". */
const NON_TEXT = 3;

describe.each(Object.entries(THEMES))("%s theme", (_name, theme) => {
  const inks = {
    "cream-bright": 1,
    cream: 1,
    "cream-dim": inkAlpha("dim"),
    "cream-faint": inkAlpha("faint"),
  };

  it.each(Object.entries(theme.surfaces))(
    "reads every ink step on %s",
    (_surface, ground) => {
      for (const [name, alpha] of Object.entries(inks)) {
        const base = name === "cream-bright" ? theme.bright : theme.ink;
        const ratio = contrast(composite(base, alpha, ground), ground);
        expect(ratio, `${name} — ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(TEXT);
      }
    },
  );

  it.each(Object.entries(theme.surfaces))(
    "outlines a control on %s",
    (_surface, ground) => {
      const ratio = contrast(
        composite(theme.ink, theme.lineStrong, ground),
        ground,
      );
      expect(ratio, `line-strong — ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
        NON_TEXT,
      );
    },
  );
});

describe("the tokens themselves", () => {
  it("keeps three distinguishable ink steps", () => {
    // Raising `faint` to clear the floor pushed it close to `dim`. If they
    // ever meet, the product has two ink levels wearing three names.
    const dim = inkAlpha("dim");
    const faint = inkAlpha("faint");
    expect(dim).toBeGreaterThan(faint);
    expect(dim - faint).toBeGreaterThanOrEqual(0.15);
    expect(dim).toBeLessThan(1);
  });

  it("keeps the divider softer than a control's border", () => {
    // `line` is decoration and carries no information, so it is exempt from
    // 1.4.11 and deliberately quieter. The test is that they stay different:
    // collapsing them would either shout every divider or hide every field.
    for (const [name, block] of [
      ["dark", DARK_BLOCK],
      ["light", LIGHT_BLOCK],
    ] as const) {
      expect(lineAlpha(block, "line-strong"), name).toBeGreaterThan(
        lineAlpha(block, "line"),
      );
    }
  });

  it("pins the dark palette on anything sitting over video", () => {
    // The hero's ground is black scrims in both themes. Without this block
    // the light theme flips its ink to near-black over near-black footage.
    // The rule, not the first mention of the name: a comment elsewhere that
    // explains what `.on-media` does would otherwise be what this reads.
    const island = css.slice(css.indexOf(".on-media {"));
    expect(island).toContain("--cream:");
    expect(island).toContain("--cream-bright:");
    expect(channels(island, "cream")).toEqual(THEMES.dark.ink);
    expect(channels(island, "cream-bright")).toEqual(THEMES.dark.bright);
  });
});

/**
 * The floating nav, which is a composite and not a token pair.
 *
 * This is the case the rest of this file structurally cannot catch. The nav's
 * ink and every surface token were individually correct; the bug was that a
 * fixed bar carrying `on-media` ink overhung the hero frame onto the page's
 * own paper, so cream landed on cream at 1.32:1 in light mode while measuring
 * 15:1 in dark. Nothing here compares an ink to a surface it was never paired
 * with in a token, so nothing here noticed.
 *
 * The pill's ground has to hold against whatever it overlaps — the footage,
 * or the paper above the frame — because which one it gets depends on scroll
 * position and on another component's padding.
 */
describe("the floating landing nav", () => {
  const alpha = Number(
    css.match(/\.nav-floating\s*\{[^}]*background:\s*rgb\(0 0 0 \/ ([\d.]+)\)/)?.[1],
  );
  // `on-media` fixes the ink regardless of theme, so it is read from there.
  const onMedia = css.slice(css.indexOf(".on-media {"));
  const ink = channels(onMedia, "cream");

  it("reads a real alpha out of the stylesheet", () => {
    expect(Number.isFinite(alpha)).toBe(true);
    expect(alpha).toBeGreaterThan(0);
  });

  it.each(Object.entries(THEMES))(
    "clears %s: the labels stand on the pill over either ground",
    (_name, theme) => {
      for (const under of [theme.surfaces["surface-base"], [0, 0, 0] as RGB]) {
        const ground = composite([0, 0, 0], alpha, under);
        // `text-cream-dim` is the label colour: the cream token at its own alpha.
        const label = composite(ink, inkAlpha("dim"), ground);
        expect(contrast(label, ground)).toBeGreaterThanOrEqual(TEXT);
      }
    },
  );
});
