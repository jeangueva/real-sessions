import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { FADE_MS, fadeValue } from "../src/design-system/hero-video";
import { pickMimeType, voiceSocketUrl } from "../src/lib/deepgram-input";

/**
 * The web package's own source, whichever directory the suite was started in.
 *
 * The root suite picks up `web/test/**` too, so `process.cwd()` is the repo
 * root there and the web package here. Resolving against it alone silently
 * pointed one of these tests at the server's source — where it found nothing
 * and passed for the wrong reason.
 */
function webSource(relative: string): string {
  const here = resolve(process.cwd(), relative);
  return existsSync(here) ? here : resolve(process.cwd(), "web", relative);
}

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
      "ws://localhost:5173/api/voice?language=en",
    );
  });

  it("carries the language, because the gateway picks the model from it", () => {
    // Nova-3 is English-only on this account: a Spanish interview sent to it
    // returns confident English rather than an error.
    expect(voiceSocketUrl({ protocol: "http:", host: "localhost:5173" }, "es")).toContain(
      "language=es",
    );
  });

  it("upgrades to wss on a secure page", () => {
    // A ws:// socket from an https:// page is blocked as mixed content.
    expect(voiceSocketUrl({ protocol: "https:", host: "realsessions.app" })).toContain(
      "wss://realsessions.app/api/voice",
    );
  });
});

describe("when the browser refuses to autoplay", () => {
  it("keeps the video mounted so its poster stays visible", () => {
    /**
     * iOS blocks autoplay outright in Low Power Mode, which is how a large
     * share of phones spend their day. The component used to treat that
     * refusal as a failure and tear the element out, leaving a dark gradient
     * where the one picture of what this product is should be.
     *
     * A refusal is not a load error. The element stays, the poster shows, and
     * `failed` now means only that the video could not be decoded — where
     * there is genuinely no frame to put up.
     */
    /**
     * Read as text, and worth saying why: the behaviour needs a real <video>
     * whose play() rejects, which this environment has no way to produce. So
     * this asserts the shape of the decision rather than the decision — it
     * will fail if somebody puts the flag back, and it would not catch a
     * different way of making the same mistake.
     */
    const source = readFileSync(
      webSource("src/design-system/hero-video.tsx"),
      "utf8",
    );
    // The play() rejection must not set the failed flag any more.
    expect(source).toMatch(/video\.play\(\)\.catch\(\(\) => undefined\)/);
    expect(source).not.toMatch(/play\(\)\.catch\(\(\) => setFailed\(true\)\)/);
    // And the error listener, which is a real load failure, still does.
    expect(source).toMatch(/onError = \(\) => setFailed\(true\)/);
  });
});
