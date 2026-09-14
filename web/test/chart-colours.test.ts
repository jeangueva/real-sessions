import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Charts draw with theme tokens, never with literal colours.
 *
 * `TrendChart` shipped with the dark palette written into it — `#DEDBC8` for
 * the line, `rgba(222,219,200,…)` for the grid and the axis labels — so on the
 * light theme the line and its labels all but vanished into the card. The
 * tokens flip with the theme and `contrast.test.ts` measures them; a literal
 * does neither, and nothing else would notice it coming back.
 *
 * The path is joined from this file's directory rather than written as
 * `new URL("../src/….tsx", import.meta.url)`: Vite rewrites that literal
 * pattern into a module URL, which is not a file path, and the root suite
 * runs this file from a different working directory.
 */
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../src/design-system/chart.tsx"), "utf8");

describe("the chart colours", () => {
  it("uses no literal colour", () => {
    expect(source.match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) ?? []).toEqual([]);
  });
});
