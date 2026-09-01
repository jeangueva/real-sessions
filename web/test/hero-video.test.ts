import { describe, expect, it } from "vitest";
import {
  FADE_MS,
  FADE_OUT_AT,
  fadeValue,
  shouldStartFadeOut,
} from "../src/design-system/hero-video";
import { pickMimeType, voiceSocketUrl } from "../src/lib/deepgram-input";

describe("shouldStartFadeOut", () => {
  it("holds until the last moments of the clip", () => {
    expect(shouldStartFadeOut(10, 5)).toBe(false);
    expect(shouldStartFadeOut(10, 10 - FADE_OUT_AT - 0.01)).toBe(false);
  });

  it("fires once the seam is close", () => {
    // Asserted just inside the window rather than exactly on it: the boundary
    // is not a contract, and `10 - 0.55` is not exactly 9.45 in binary floats.
    // timeupdate fires at arbitrary times anyway, never on the threshold.
    expect(shouldStartFadeOut(10, 10 - FADE_OUT_AT + 0.01)).toBe(true);
    expect(shouldStartFadeOut(10, 9.9)).toBe(true);
    expect(shouldStartFadeOut(10, 10)).toBe(true);
  });

  it("does nothing while the duration is unknown", () => {
    // A streaming video reports Infinity, and NaN before metadata arrives.
    // Either would otherwise satisfy the comparison and fade out immediately.
    expect(shouldStartFadeOut(Infinity, 3)).toBe(false);
    expect(shouldStartFadeOut(Number.NaN, 3)).toBe(false);
    expect(shouldStartFadeOut(0, 0)).toBe(false);
  });
});

describe("fadeValue", () => {
  it("runs from start to target across the fade", () => {
    expect(fadeValue(0, 1, 0)).toBe(0);
    expect(fadeValue(0, 1, FADE_MS / 2)).toBeCloseTo(0.5, 5);
    expect(fadeValue(0, 1, FADE_MS)).toBe(1);
  });

  it("resumes from a partial opacity rather than snapping", () => {
    // A fade-in interrupted at 0.3 has to continue from 0.3, or the seam
    // shows a visible jump to full before fading again.
    expect(fadeValue(0.3, 0, 0)).toBe(0.3);
    expect(fadeValue(0.3, 0, FADE_MS)).toBe(0);
  });

  it("clamps past the end so a late frame cannot overshoot", () => {
    expect(fadeValue(0, 1, FADE_MS * 3)).toBe(1);
    expect(fadeValue(0, 1, -50)).toBe(0);
  });
});

describe("pickMimeType", () => {
  it("prefers opus in webm, which is what Deepgram takes directly", () => {
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("falls through to a container the browser does support", () => {
    expect(pickMimeType((type) => type === "audio/ogg;codecs=opus")).toBe(
      "audio/ogg;codecs=opus",
    );
  });

  it("returns null when none of them record", () => {
    expect(pickMimeType(() => false)).toBeNull();
  });
});

describe("voiceSocketUrl", () => {
  it("follows the page's own scheme and host", () => {
    expect(voiceSocketUrl({ protocol: "http:", host: "localhost:5173" })).toBe(
      "ws://localhost:5173/api/voice",
    );
  });

  it("upgrades to wss on a secure page", () => {
    // A ws:// socket from an https:// page is blocked as mixed content.
    expect(voiceSocketUrl({ protocol: "https:", host: "realsessions.app" })).toBe(
      "wss://realsessions.app/api/voice",
    );
  });
});
