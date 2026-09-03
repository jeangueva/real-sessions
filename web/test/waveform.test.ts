import { describe, expect, it } from "vitest";
import {
  BARS,
  RESTING,
  barHeight,
  ease,
  targetFor,
} from "../src/design-system/waveform";

/**
 * The shape of the animation, tested away from the browser.
 *
 * The loop that drives it needs `requestAnimationFrame`, which a hidden tab
 * never runs — so the arithmetic lives in these three functions and the loop
 * only composes them. What is pinned here is what the bars claim: that they
 * track the meter, that silence and speech look different, and that reduced
 * motion drops the decoration without dropping the reading.
 */

const state = (over: Partial<Parameters<typeof targetFor>[0]> = {}) => ({
  active: true,
  measured: true,
  reduced: false,
  level: 0.5,
  elapsed: 0,
  ...over,
});

describe("targetFor", () => {
  it("falls to zero when this side is not talking", () => {
    expect(targetFor(state({ active: false }))).toBe(0);
  });

  it("follows the meter while talking", () => {
    expect(targetFor(state({ level: 0.3 }))).toBeCloseTo(0.3);
    expect(targetFor(state({ level: 0.8 }))).toBeCloseTo(0.8);
  });

  it("never drops below resting mid-sentence", () => {
    // A meter that bottoms out during a pause for breath reads as a dropped
    // connection rather than as a quiet moment.
    expect(targetFor(state({ level: 0 }))).toBe(RESTING);
  });

  it("breathes when there is nothing to measure", () => {
    const early = targetFor(state({ measured: false, elapsed: 0 }));
    const later = targetFor(state({ measured: false, elapsed: 400 }));
    expect(early).not.toBeCloseTo(later);
  });

  it("holds steady instead of breathing under reduced motion", () => {
    // An invented rhythm is exactly the decoration the setting asks to lose.
    const a = targetFor(state({ measured: false, reduced: true, elapsed: 0 }));
    const b = targetFor(state({ measured: false, reduced: true, elapsed: 800 }));
    expect(a).toBe(b);
  });

  it("still reads the meter under reduced motion", () => {
    // The level is information — how a candidate knows the mic still hears
    // them — so it survives the setting that removes the effects.
    expect(targetFor(state({ reduced: true, level: 0.7 }))).toBeCloseTo(0.7);
  });
});

describe("ease", () => {
  it("rises faster than it falls", () => {
    const up = ease(0.2, 0.8) - 0.2;
    const down = 0.8 - ease(0.8, 0.2);
    expect(up).toBeGreaterThan(down);
  });

  it("converges on the target", () => {
    let value = 0;
    for (let i = 0; i < 40; i += 1) value = ease(value, 0.6);
    expect(value).toBeCloseTo(0.6, 3);
  });

  it("never overshoots", () => {
    expect(ease(0, 1)).toBeLessThanOrEqual(1);
    expect(ease(1, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("barHeight", () => {
  const shape = { measured: true, reduced: true, elapsed: 0 };

  it("peaks at the centre and tapers to the edges", () => {
    const heights = Array.from({ length: BARS }, (_, i) => barHeight(i, 1, shape));
    const centre = heights[(BARS - 1) / 2]!;
    expect(centre).toBe(Math.max(...heights));
    expect(heights[0]).toBeLessThan(centre);
    expect(heights[BARS - 1]).toBeLessThan(centre);
  });

  it("is symmetric", () => {
    for (let i = 0; i < BARS; i += 1) {
      expect(barHeight(i, 1, shape)).toBeCloseTo(barHeight(BARS - 1 - i, 1, shape));
    }
  });

  it("sits at resting when the level is zero", () => {
    for (let i = 0; i < BARS; i += 1) {
      expect(barHeight(i, 0, shape)).toBe(RESTING);
    }
  });

  it("stays inside the container however loud it gets", () => {
    for (let i = 0; i < BARS; i += 1) {
      expect(barHeight(i, 5, shape)).toBeLessThanOrEqual(1);
    }
  });

  it("ripples between neighbours only when motion is allowed", () => {
    const moving = { measured: true, reduced: false, elapsed: 300 };
    // With motion, neighbouring bars are out of phase; without it, the two
    // bars either side of centre are identical because only the shape is left.
    const stillLeft = barHeight(3, 0.8, shape);
    const stillRight = barHeight(5, 0.8, shape);
    expect(stillLeft).toBeCloseTo(stillRight);
    expect(barHeight(3, 0.8, moving)).not.toBeCloseTo(barHeight(5, 0.8, moving));
  });
});
