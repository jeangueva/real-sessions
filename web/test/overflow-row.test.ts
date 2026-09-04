import { describe, expect, it } from "vitest";
import { countThatFit } from "../src/platform/OverflowRow";

/**
 * How many options a row shows before the rest go behind "See all".
 *
 * Worth its own test because it is the whole behaviour and it is exactly the
 * kind of arithmetic that is wrong by one for months: an off-by-one here is a
 * pill clipped in half, or a "See all" button that wraps onto its own line and
 * doubles the height of every field on the screen.
 */

const GAP = 8;
const SEE_ALL = 104;

describe("countThatFit", () => {
  it("shows everything when everything fits", () => {
    // 3 × 100 + 2 gaps = 316. No button, because nothing is hidden — a
    // "See all" beside three visible options is a lie about there being more.
    expect(countThatFit([100, 100, 100], 400, SEE_ALL, GAP)).toBe(3);
  });

  it("uses the full width when there is nothing to hide", () => {
    // Exactly 316 available for exactly 316 of content.
    expect(countThatFit([100, 100, 100], 316, SEE_ALL, GAP)).toBe(3);
  });

  it("makes room for the button once anything is hidden", () => {
    // Four items need 424. In 400 the first three fit (316) — but with a
    // fourth hidden the button must fit too, and 316 + 8 + 104 = 428 > 400.
    // So one more comes off.
    expect(countThatFit([100, 100, 100, 100], 400, SEE_ALL, GAP)).toBe(2);
  });

  it("keeps at least one option visible", () => {
    // A row that is only a button says nothing about what the field holds.
    expect(countThatFit([300, 300, 300], 120, SEE_ALL, GAP)).toBe(1);
    expect(countThatFit([300, 300], 10, SEE_ALL, GAP)).toBe(1);
  });

  it("handles an empty list", () => {
    expect(countThatFit([], 500, SEE_ALL, GAP)).toBe(0);
  });

  it("counts gaps between items, not before the first", () => {
    // Two 100s need 208, not 216. Charging a leading gap loses an option at
    // every width that lands on the boundary.
    expect(countThatFit([100, 100], 208, SEE_ALL, GAP)).toBe(2);
    expect(countThatFit([100, 100], 207, SEE_ALL, GAP)).toBe(1);
  });

  it("copes with options of different widths", () => {
    // "Mercado Libre" is twice "Meta", and the row has to stop at whichever
    // one actually runs out of space.
    const widths = [60, 180, 60, 240];
    expect(countThatFit(widths, 1000, SEE_ALL, GAP)).toBe(4);
    // 60 + 8 + 180 = 248 fits; adding 60 makes 316, plus the button is 428.
    expect(countThatFit(widths, 400, SEE_ALL, GAP)).toBe(2);
  });

  it("never returns more than it was given", () => {
    expect(countThatFit([10, 10], 100_000, SEE_ALL, GAP)).toBe(2);
  });
});
