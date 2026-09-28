import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The two promises analytics has to keep.
 *
 * This product handles CVs and the transcripts of interviews, and the privacy
 * notice tells people exactly what each vendor receives. Both halves of that
 * are checked here against the source, because the failure is silent in the
 * browser: a default flipped back on still renders a working page, and the
 * first sign that something leaked would be finding it in PostHog.
 */
const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), "utf8");

const analytics = read("../src/lib/analytics.ts");
const legal = read("../src/legal/content.ts");

describe("analytics", () => {
  // Every one of these reads the page itself rather than an event we wrote,
  // which on the report screen is the feedback and on the transcript is what
  // the candidate said.
  it("keeps every capture-the-page default off", () => {
    for (const setting of [
      "autocapture: false",
      "capture_dead_clicks: false",
      "disable_session_recording: true",
      "capture_pageview: false",
    ]) {
      expect(analytics, `${setting} is not set`).toContain(setting);
    }
  });

  it("stores nothing on the device and honours do-not-track", () => {
    expect(analytics).toContain('persistence: "memory"');
    expect(analytics).toContain("respect_dnt: true");
    // A profile for someone who never signed in would be a person record for
    // an anonymous visitor.
    expect(analytics).toContain('person_profiles: "identified_only"');
  });

  it("reports from production only", () => {
    expect(analytics).toMatch(/PRODUCTION\s*=\s*\/.*getmockio/);
    expect(analytics).toContain("PRODUCTION.test(window.location.hostname)");
  });

  // The write-only project key belongs in the bundle; a personal key would
  // read the account's data and must never appear here.
  it("carries a write-only project key and nothing else", () => {
    expect(analytics).toMatch(/phc_[A-Za-z0-9]+/);
    expect(analytics).not.toMatch(/phx_|posthog.*personal/i);
  });
});

describe("the privacy notice", () => {
  /**
   * A vendor that receives data has to be named in all three published
   * languages. The notice is the promise; adding a processor without adding
   * the line is what makes the promise false.
   */
  it("names PostHog in English, Spanish and Portuguese", () => {
    expect(legal.match(/PostHog/g) ?? []).toHaveLength(3);
  });
});
