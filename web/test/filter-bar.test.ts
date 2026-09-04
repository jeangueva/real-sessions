import { describe, expect, it } from "vitest";
import { MIN_PANEL, MIN_WIDTH, placeUnder } from "../src/platform/FilterBar";

/**
 * Where an options panel lands.
 *
 * Worth its own test because the first version got it wrong in a way that
 * looked fine in code: it flipped the panel above the trigger by subtracting a
 * guessed height from the trigger's top, and left it floating halfway up the
 * page, attached to nothing. Anchoring the flipped case by `bottom` is the
 * fix, and this is what checks it stays fixed.
 */

const trigger = (over: Partial<{ left: number; top: number; bottom: number; width: number }> = {}) => ({
  left: 400,
  top: 300,
  bottom: 340,
  width: 200,
  ...over,
});

describe("placeUnder", () => {
  it("opens below the trigger when there is room", () => {
    const at = placeUnder(trigger(), 1440, 900);
    expect(at.top).toBe(348);
    expect(at.bottom).toBeUndefined();
    expect(at.maxHeight).toBeGreaterThan(MIN_PANEL);
  });

  it("flips above when the space below is too small to be useful", () => {
    // A panel with forty pixels of room is not a panel.
    const at = placeUnder(trigger({ top: 700, bottom: 740 }), 1440, 800);
    expect(at.top).toBeUndefined();
    // Anchored by `bottom`, so the panel's own height never has to be guessed.
    expect(at.bottom).toBe(800 - 700 + 8);
  });

  it("stays below when below is tight but still the roomier side", () => {
    // Trigger near the top: flipping would give it less space, not more.
    const at = placeUnder(trigger({ top: 40, bottom: 80 }), 1440, 220);
    expect(at.top).toBe(88);
    expect(at.maxHeight).toBeGreaterThan(0);
  });

  it("never returns a height of zero, however cramped", () => {
    const at = placeUnder(trigger({ top: 10, bottom: 50 }), 1440, 60);
    expect(at.maxHeight).toBeGreaterThan(0);
  });

  it("is at least as wide as the minimum, however narrow the segment", () => {
    // A "Mode" segment is tiny; its options still need reading room.
    const at = placeUnder(trigger({ width: 90 }), 1440, 900);
    expect(at.width).toBe(MIN_WIDTH);
  });

  it("matches the segment when the segment is wider", () => {
    const at = placeUnder(trigger({ width: 420 }), 1440, 900);
    expect(at.width).toBe(420);
  });

  it("pulls left rather than running off the right edge", () => {
    // The bar reaches the edge of the screen on a laptop, and the last
    // segment is Company.
    const at = placeUnder(trigger({ left: 1380, width: 120 }), 1440, 900);
    expect(at.left + at.width).toBeLessThanOrEqual(1440);
    expect(at.left).toBeGreaterThanOrEqual(8);
  });

  it("never goes off the left edge either", () => {
    const at = placeUnder(trigger({ left: -50 }), 1440, 900);
    expect(at.left).toBeGreaterThanOrEqual(8);
  });
});
