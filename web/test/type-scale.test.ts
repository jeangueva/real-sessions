import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

/**
 * Nothing smaller than the scale allows.
 *
 * The scale is already lifted off Tailwind's defaults — `xs` is 14px and `sm`
 * is 16px — because most small text in this product is either a control
 * somebody has to hit or copy they read while nervous, often on a phone, in a
 * language that is not their first.
 *
 * What kept slipping through was the arbitrary value: `text-[11px]` on the
 * radar's labels, `text-[0.6875rem]` on the mobile tab bar that every
 * signed-in screen carries, `text-[0.65rem]` on the pricing badge. Each was
 * written by somebody — me, twice — who wanted one element a little smaller,
 * and each landed below the floor the scale exists to hold.
 *
 * There is also a concrete bug underneath it: iOS Safari zooms the page when
 * a form field with text under 16px is focused. That is why inputs belong on
 * `sm`, not on `xs`.
 */

/**
 * Resolved from the working directory rather than from `import.meta.url`.
 *
 * Under happy-dom that URL is not a `file:` one, and `fileURLToPath` refuses
 * it before a single assertion runs — which is a confusing way to learn that
 * a test never executed.
 */
const root = resolve(process.cwd(), "src");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** `text-[13px]`, `text-[0.8rem]` and friends — anything hand-set. */
const ARBITRARY = /text-\[([0-9.]+)(px|rem|em)\]/g;

/** `<input>`, `<textarea>` and `<select>`, attributes and all. */
const FIELDS = /<(input|textarea|select)\b[^>]*?>/gs;

describe("the type scale", () => {
  it("never sets a form field below 16px", () => {
    /**
     * iOS Safari zooms the whole page when a field with text under 16px is
     * focused, and then leaves it zoomed. On a sign-up form that is somebody
     * typing their password into a page that has just jumped sideways.
     *
     * `sm` is 16px and `xs` is 14, so the rule is: fields never wear `xs`.
     * None do today — this is here so none start.
     */
    const small: string[] = [];
    for (const file of sources(root)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(FIELDS)) {
        if (/\btext-xs\b/.test(match[0])) {
          small.push(`${file.replace(root, "src")}: ${match[0].slice(0, 70)}`);
        }
      }
    }
    expect(small).toEqual([]);
  });

  it("has no text smaller than 14px anywhere in the interface", () => {
    const tooSmall: string[] = [];
    for (const file of sources(root)) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(ARBITRARY)) {
        const [, raw, unit] = match;
        const px =
          unit === "px" ? Number(raw) : Number(raw) * 16;
        // 14px is the floor. `xs` is exactly that, so an arbitrary value at or
        // above it is merely redundant; below it is the bug.
        if (px < 14) {
          tooSmall.push(`${file.replace(root, "src")}: ${match[0]} (${px}px)`);
        }
      }
    }
    expect(tooSmall).toEqual([]);
  });
});
