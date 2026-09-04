import { describe, expect, it } from "vitest";
import { TOUR_STEPS, stepsPresent } from "../src/lib/tour";
import { cardPosition, type Spot } from "../src/platform/Tour";

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

  it("stays below when the spotlight is near the top, however tight", () => {
    // Flipping there would put the card off the top instead, which is worse:
    // the buttons are at the bottom of the card.
    const at = cardPosition(spot({ top: 20, height: 40 }), 1440, 300);
    expect(at.top).toBe(20 + 40 + 16);
  });

  it("pulls left rather than running off the right edge", () => {
    const at = cardPosition(spot({ left: 1380 }), 1440, 900, 340);
    expect(at.left + 340).toBeLessThanOrEqual(1440);
    expect(at.left).toBeGreaterThanOrEqual(12);
  });

  it("never goes off the left edge either", () => {
    expect(cardPosition(spot({ left: -80 }), 1440, 900).left).toBeGreaterThanOrEqual(12);
  });
});
