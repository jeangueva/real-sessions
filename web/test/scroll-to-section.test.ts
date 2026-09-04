import { describe, expect, it, vi } from "vitest";
import {
  SCROLL_MS,
  ease,
  scrollPosition,
  scrollToSection,
  sectionId,
} from "../src/lib/scroll-to-section";

/**
 * The landing nav's glide to a section.
 *
 * What matters here is the fallback. The handler cancels the browser's own
 * navigation only when it has actually scrolled something; get that backwards
 * and a link to a section that lives on another page becomes a link that does
 * nothing at all.
 */

describe("sectionId", () => {
  it("reads the id out of the shapes these links actually take", () => {
    expect(sectionId("#pricing")).toBe("pricing");
    expect(sectionId("/#pricing")).toBe("pricing");
    expect(sectionId("https://real-sessions.onrender.com/#pricing")).toBe("pricing");
  });

  it("returns null when there is no fragment to scroll to", () => {
    expect(sectionId("/signin")).toBeNull();
    expect(sectionId("#")).toBeNull();
    expect(sectionId("")).toBeNull();
  });
});

describe("scrollPosition", () => {
  it("starts where it is and ends where it was asked to", () => {
    expect(scrollPosition(0, 3000, 0)).toBe(0);
    expect(scrollPosition(0, 3000, SCROLL_MS)).toBe(3000);
  });

  it("clamps past the end, so a late frame cannot overshoot", () => {
    expect(scrollPosition(0, 3000, SCROLL_MS * 3)).toBe(3000);
  });

  it("eases in and out rather than travelling at a constant rate", () => {
    // A linear scroll starts and stops abruptly. The first and last tenths
    // should cover less ground than the middle.
    const first = scrollPosition(0, 1000, SCROLL_MS * 0.1);
    const middle =
      scrollPosition(0, 1000, SCROLL_MS * 0.55) - scrollPosition(0, 1000, SCROLL_MS * 0.45);
    expect(first).toBeLessThan(middle);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.5)).toBeCloseTo(0.5);
  });

  it("scrolls upwards as happily as down", () => {
    expect(scrollPosition(3000, 0, SCROLL_MS)).toBe(0);
    expect(scrollPosition(3000, 0, SCROLL_MS / 2)).toBeLessThan(3000);
  });
});

/** A document stub: only `getElementById` and `defaultView` are used. */
function docWith(ids: string[]): Document {
  return {
    defaultView: view(),
    getElementById: (id: string) =>
      ids.includes(id)
        ? ({ getBoundingClientRect: () => ({ top: 100 }) } as unknown as HTMLElement)
        : null,
  } as unknown as Document;
}

/**
 * A window stub that plays the animation out.
 *
 * Timestamps have to advance, and the frame count has to be bounded: the real
 * loop schedules the next frame from inside the current one, so a stub that
 * calls back synchronously at a frozen clock recurses until the stack gives
 * out.
 */
function view(frames = 40, stepMs = 20) {
  const scrolls: number[] = [];
  let clock = performance.now();
  let left = frames;
  return {
    scrollY: 0,
    scrollTo: (_x: number, y: number) => scrolls.push(y),
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      if (left-- <= 0) return 0;
      clock += stepMs;
      cb(clock);
      return 1;
    },
    scrolls,
  } as unknown as Window & { scrolls: number[] };
}

describe("scrollToSection", () => {
  it("drives the scroll itself rather than asking the browser to", () => {
    // The CSS property is switched off under reduced motion, so the glide
    // cannot come from there. Animating here keeps it, and keeps the duration
    // and easing ours.
    const win = view() as Window & { scrolls: number[] };
    const doc = {
      defaultView: win,
      getElementById: () =>
        ({ getBoundingClientRect: () => ({ top: 100 }) }) as unknown as HTMLElement,
    } as unknown as Document;

    expect(scrollToSection("#pricing", doc, false)).toBe(true);
    // Many positions, not one jump — and it arrives at the target.
    expect(win.scrolls.length).toBeGreaterThan(5);
    expect(win.scrolls[0]).toBeLessThan(100);
    expect(win.scrolls.at(-1)).toBe(100);
  });

  it("declines when the section is not on this page", () => {
    // The caller reads false as "let the browser navigate". Returning true
    // here would cancel a link that goes somewhere real.
    expect(scrollToSection("#elsewhere", docWith(["pricing"]), false)).toBe(false);
  });

  it("declines a link with no fragment at all", () => {
    expect(scrollToSection("/signin", docWith(["pricing"]), false)).toBe(false);
  });
});
