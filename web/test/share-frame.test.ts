import { describe, expect, it } from "vitest";
import {
  clampPan,
  clampZoom,
  MAX_ZOOM,
  frameFor,
  panLimit,
  placeCover,
  previewSize,
  ratioFor,
} from "../src/lib/share-frame";

/**
 * The crop, as arithmetic.
 *
 * Worth testing at this level because the failure mode is not an exception —
 * it is a transparent wedge down one side of the picture, which exports as a
 * black bar in every app that flattens a PNG, and which nobody notices until
 * it is on their Instagram story.
 */
const PORTRAIT = { width: 3000, height: 4000 };
const LANDSCAPE = { width: 4000, height: 3000 };

describe("the frame a crop means", () => {
  it("keeps the photo's own proportions on original", () => {
    expect(ratioFor("original", PORTRAIT, { width: 1, height: 1 })).toBeCloseTo(0.75);
  });

  it("exports even dimensions", () => {
    // Odd dimensions put text on half-pixel centres, which reads as faintly
    // blurred on a card whose entire content is text.
    for (const crop of ["1:1", "9:16", "16:9", "4:3", "4:5"] as const) {
      const frame = frameFor(ratioFor(crop, PORTRAIT, { width: 1, height: 1 }));
      expect(frame.width % 2).toBe(0);
      expect(frame.height % 2).toBe(0);
    }
  });

  it("survives a custom ratio of zero", () => {
    // The number field clamps, but a ratio of 0 or NaN reaching this would
    // produce a frame of zero pixels and a blank export.
    expect(frameFor(ratioFor("custom", PORTRAIT, { width: 0, height: 5 }))).toEqual({
      width: 1440,
      height: 1440,
    });
  });
});

describe("placing the photo", () => {
  it("covers the frame rather than fitting inside it", () => {
    const frame = frameFor(9 / 16);
    const at = placeCover(frame, LANDSCAPE, { x: 0, y: 0 });
    // A letterboxed photo with bars down the side is the clearest possible
    // sign that something was made by a tool rather than composed.
    expect(at.width).toBeGreaterThanOrEqual(frame.width);
    expect(at.height).toBeGreaterThanOrEqual(frame.height);
  });

  it("centres the overflow when nothing has been dragged", () => {
    const frame = frameFor(1);
    const at = placeCover(frame, LANDSCAPE, { x: 0, y: 0 });
    expect(at.x).toBeCloseTo((frame.width - at.width) / 2);
    expect(at.y).toBeCloseTo(0);
  });

  it("never lets an edge of the photo inside the frame", () => {
    const frame = frameFor(1);
    const drawn = placeCover(frame, LANDSCAPE, { x: 0, y: 0 });
    // A drag far past the limit, which is what a fast flick on a phone is.
    const at = placeCover(frame, LANDSCAPE, { x: 99_999, y: 99_999 });
    expect(at.x).toBeLessThanOrEqual(0);
    expect(at.x + at.width).toBeGreaterThanOrEqual(frame.width);
    expect(at.y).toBeLessThanOrEqual(0);
    expect(at.y + at.height).toBeGreaterThanOrEqual(frame.height);
    expect(drawn.width).toBe(at.width);
  });

  it("allows no drag along an axis the photo exactly fills", () => {
    const frame = frameFor(0.75);
    const scale = frame.width / PORTRAIT.width;
    const drawn = { width: PORTRAIT.width * scale, height: PORTRAIT.height * scale };
    const limit = panLimit(frame, drawn);
    expect(limit.x).toBeCloseTo(0);
    expect(limit.y).toBeCloseTo(0);
    expect(clampPan({ x: 40, y: -40 }, frame, drawn)).toEqual({ x: 0, y: -0 });
  });
});

describe("zooming in", () => {
  it("never goes below covering the frame", () => {
    // The floor is the whole safety property: under it the photo stops filling
    // the crop and a transparent wedge appears, which flattens to a black bar.
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(-5)).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it("stops at the ceiling", () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
  });

  it("still covers the frame at every zoom", () => {
    const frame = frameFor(9 / 16);
    for (const zoom of [1, 1.5, 2.7, MAX_ZOOM]) {
      const at = placeCover(frame, LANDSCAPE, { x: 0, y: 0 }, zoom);
      expect(at.width).toBeGreaterThanOrEqual(frame.width);
      expect(at.height).toBeGreaterThanOrEqual(frame.height);
    }
  });

  it("makes the photo larger, not the frame", () => {
    const frame = frameFor(1);
    const near = placeCover(frame, LANDSCAPE, { x: 0, y: 0 }, 2);
    const far = placeCover(frame, LANDSCAPE, { x: 0, y: 0 }, 1);
    expect(near.width).toBeCloseTo(far.width * 2);
  });

  it("clamps the drag against the zoomed size, not the original", () => {
    const frame = frameFor(1);
    // Zoomed in, there is more room to drag; the limit has to grow with it or
    // the photo locks in place the moment somebody zooms.
    const at = placeCover(frame, LANDSCAPE, { x: 99_999, y: 99_999 }, 3);
    expect(at.x).toBeLessThanOrEqual(0);
    expect(at.x + at.width).toBeGreaterThanOrEqual(frame.width);
    expect(at.y + at.height).toBeGreaterThanOrEqual(frame.height);
  });
});

describe("the preview", () => {
  it("scales the export geometry rather than being its own layout", () => {
    const frame = frameFor(9 / 16);
    const shown = previewSize(frame, { width: 420, height: 560 });
    // What somebody drags has to be what they get, which only holds if the
    // preview is the same rectangle at a different size.
    expect(shown.width / shown.height).toBeCloseTo(frame.width / frame.height);
    expect(shown.height).toBeLessThanOrEqual(560);
  });

  it("does not enlarge a frame smaller than the space available", () => {
    expect(previewSize({ width: 100, height: 100 }, { width: 420, height: 560 })).toEqual({
      width: 100,
      height: 100,
    });
  });
});
