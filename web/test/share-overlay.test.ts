import { describe, expect, it } from "vitest";
import {
  layoutOverlay,
  overlayOnlySize,
  overlayOrigin,
  TONES,
} from "../src/lib/share-overlay";

/**
 * The stat block's measurements and where it is allowed to sit.
 *
 * The clamp is the part worth holding down: a card that hangs off the bottom
 * of a story is cropped by the app it is posted to, and the person who made it
 * finds out from whoever replies.
 */
const STORY = { width: 810, height: 1440 };
const STATS = [
  { value: "6", label: "weeks in a row" },
  { value: "124", label: "minutes speaking English" },
];

describe("measuring the block", () => {
  it("scales with the frame rather than using fixed pixels", () => {
    const small = layoutOverlay({ width: 400, height: 400 }, STATS);
    const large = layoutOverlay({ width: 1440, height: 1440 }, STATS);
    // The preview and the export are the same card at different sizes; type
    // in absolute pixels would look right in exactly one of them.
    expect(large.valueSize / small.valueSize).toBeCloseTo(1440 / 400);
  });

  it("never measures wider than the frame it is drawn on", () => {
    const wordy = [
      { value: "124", label: "a label considerably longer than any real one here" },
    ];
    const layout = layoutOverlay({ width: 400, height: 400 }, wordy);
    expect(layout.width).toBeLessThanOrEqual(400);
  });

  it("grows with the size control", () => {
    const normal = layoutOverlay(STORY, STATS, 1);
    const big = layoutOverlay(STORY, STATS, 1.4);
    expect(big.height).toBeGreaterThan(normal.height);
    expect(big.valueSize).toBeCloseTo(normal.valueSize * 1.4);
  });

  it("stacks rows without overlapping them", () => {
    const layout = layoutOverlay(STORY, STATS);
    const [first, second] = layout.rows;
    // The second value's baseline sits below the first label's.
    expect(second!.valueY).toBeGreaterThan(first!.labelY);
    // And the wordmark sits below everything.
    expect(layout.brandY).toBeGreaterThan(second!.labelY);
  });
});

describe("measuring the text that is actually drawn", () => {
  it("measures the label upper-cased, the way it is painted", () => {
    // The bug this exists for: labels are drawn through `toUpperCase`, and
    // the width was taken from the original string. Upper-case is wider, so
    // the scrim came out narrower than the words inside it and the
    // transparent export clipped them — invisible to every test here, because
    // no test draws. Found by rendering the card and looking at it.
    const seen: string[] = [];
    layoutOverlay({ width: 4000, height: 4000 }, STATS, 1, (text) => {
      seen.push(text);
      return 10;
    });
    expect(seen).toContain("WEEKS IN A ROW");
    expect(seen).not.toContain("weeks in a row");
  });

  it("uses the measured width rather than the estimate when it can", () => {
    const wide = layoutOverlay({ width: 4000, height: 4000 }, STATS, 1, () => 900);
    const estimated = layoutOverlay({ width: 4000, height: 4000 }, STATS, 1);
    expect(wide.width).toBe(900);
    expect(wide.width).not.toBeCloseTo(estimated.width);
  });

  it("reserves room below the wordmark's baseline", () => {
    const layout = layoutOverlay(STORY, STATS);
    // The scrim is drawn to `height`. Stopping at the baseline left "mockio"
    // outside the shade that exists to make it readable.
    expect(layout.height).toBeGreaterThan(layout.brandY);
  });
});

describe("where the block sits", () => {
  it("keeps the whole block inside the frame at the extremes", () => {
    const layout = layoutOverlay(STORY, STATS);
    for (const position of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      // Past the ends, which is what a fast drag produces before the clamp.
      { x: 9, y: -9 },
    ]) {
      const origin = overlayOrigin(STORY, layout, position);
      expect(origin.x).toBeGreaterThanOrEqual(0);
      expect(origin.y).toBeGreaterThanOrEqual(0);
      expect(origin.x + layout.width).toBeLessThanOrEqual(STORY.width);
      expect(origin.y + layout.height).toBeLessThanOrEqual(STORY.height);
    }
  });

  it("holds a position across a change of crop", () => {
    /**
     * The position is a fraction of the room the card has, not of the frame —
     * and those are different, because the block's height scales with the
     * frame's WIDTH. A square 1440 across holds a much taller block than a
     * 810-wide story does, so the same fraction cannot land at the same
     * fraction of total height, and asserting that it does would be asserting
     * the wrong model.
     *
     * What survives a recrop is the relationship: low stays low, high stays
     * high, and neither escapes the frame.
     */
    const square = { width: 1440, height: 1440 };
    for (const frame of [square, STORY]) {
      const layout = layoutOverlay(frame, STATS);
      const low = overlayOrigin(frame, layout, { x: 0.04, y: 0.78 });
      const high = overlayOrigin(frame, layout, { x: 0.04, y: 0.1 });
      expect(low.y).toBeGreaterThan(high.y);
      expect(low.y + layout.height).toBeLessThanOrEqual(frame.height);
    }
  });
});

describe("the transparent export", () => {
  it("is tight to the block, not the shape of the photo", () => {
    const layout = layoutOverlay(STORY, STATS);
    const size = overlayOnlySize(layout);
    // A PNG padded out to a photograph's shape is one somebody has to crop
    // before they can place it on a video.
    expect(size.height).toBeLessThan(STORY.height);
    expect(size.width).toBeGreaterThan(layout.width);
    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
  });
});

describe("the tones", () => {
  it("offers light ink for dark photos and dark ink for bright ones", () => {
    // Not a palette decision — a legibility one. Both cases have to exist.
    expect(TONES.cream.ink).toBe("#ece9d8");
    expect(TONES.ink.ink).toBe("#17181c");
    expect(Object.keys(TONES).length).toBe(3);
  });
});
