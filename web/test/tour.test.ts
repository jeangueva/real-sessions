import { describe, expect, it } from "vitest";
import { TOUR_STEPS, stepsPresent } from "../src/lib/tour";
import { CARD_HEIGHT, cardPosition, clampSpot, type Spot } from "../src/platform/Tour";

/**
 * The first-run walkthrough.
 *
 * Two things can go wrong here and both are the reason people dismiss tours
 * on sight: a step that points at an element which is not on the page, and a
 * card that lands off the bottom of the screen with the Next button on it.
 */

const spot = (over: Partial<Spot> = {}): Spot => ({
  top: 200,
  left: 300,
  width: 400,
  height: 60,
  ...over,
});

describe("stepsPresent", () => {
  it("keeps the steps whose target is on the page", () => {
    const kept = stepsPresent(TOUR_STEPS, () => true);
    expect(kept).toHaveLength(TOUR_STEPS.length);
  });

  it("drops a step that points at nothing", () => {
    // The bar hides controls on the free plan and the sidebar collapses on a
    // phone. A spotlight on an absent element is an arrow into empty space.
    const kept = stepsPresent(TOUR_STEPS, (selector) => !selector.includes("progress"));
    expect(kept.map((s) => s.id)).not.toContain("progress");
    expect(kept.length).toBe(TOUR_STEPS.length - 1);
  });

  it("can drop everything, which the caller reads as no tour", () => {
    expect(stepsPresent(TOUR_STEPS, () => false)).toEqual([]);
  });

  it("numbers every step distinctly", () => {
    expect(new Set(TOUR_STEPS.map((s) => s.id)).size).toBe(TOUR_STEPS.length);
  });
});

describe("cardPosition", () => {
  it("sits below the spotlight when there is room", () => {
    const at = cardPosition(spot(), 1440, 900);
    expect(at.top).toBe(200 + 60 + 16);
    expect(at.bottom).toBeUndefined();
  });

  it("flips above when the spotlight is near the bottom", () => {
    // Anchored by `bottom`, so the card's own height never has to be guessed.
    const at = cardPosition(spot({ top: 800, height: 60 }), 1440, 900);
    expect(at.top).toBeUndefined();
    expect(at.bottom).toBe(900 - 800 + 16);
  });

  it("pins to the bottom when neither side has room", () => {
    // The phone case. The setup bar stacks to four hundred pixels there,
    // leaving nowhere to put the card — and the first version put it below
    // regardless, off the bottom of the screen with the Next button on it.
    // An overlapping card can at least be read and pressed.
    const at = cardPosition(spot({ top: 100, height: 450 }), 500, 674);
    expect(at.top).toBeUndefined();
    expect(at.bottom).toBe(12);
  });

  it("goes above when only the space above fits it", () => {
    const at = cardPosition(spot({ top: 400, height: 100 }), 1440, 560);
    expect(at.bottom).toBe(560 - 400 + 16);
  });

  it("pulls left rather than running off the right edge", () => {
    const at = cardPosition(spot({ left: 1380 }), 1440, 900, 340);
    expect(at.left + 340).toBeLessThanOrEqual(1440);
    expect(at.left).toBeGreaterThanOrEqual(12);
  });

  it("never goes off the left edge either", () => {
    expect(cardPosition(spot({ left: -80 }), 1440, 900).left).toBeGreaterThanOrEqual(12);
  });

  it("needs a card's worth of room, not a sliver", () => {
    // Just under the threshold has to flip; just over must not.
    const tight = cardPosition(spot({ top: 40, height: 40 }), 1440, 40 + 40 + CARD_HEIGHT);
    expect(tight.top).toBeUndefined();
  });
});

describe("clampSpot", () => {
  it("keeps the ring inside the viewport", () => {
    // The mobile bar is fixed to the bottom edge, and the eight pixels of
    // padding pushed the ring past it.
    const clamped = clampSpot({ top: 600, left: 10, width: 100, height: 90 }, 674);
    expect(clamped.top + clamped.height).toBeLessThanOrEqual(674);
  });

  it("does not let a target above the fold go negative", () => {
    const clamped = clampSpot({ top: -20, left: 10, width: 100, height: 60 }, 674);
    expect(clamped.top).toBe(0);
  });

  it("leaves a spotlight that already fits alone", () => {
    const original = { top: 100, left: 10, width: 100, height: 60 };
    expect(clampSpot(original, 674)).toEqual(original);
  });

});
