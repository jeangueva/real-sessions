import { describe, expect, it } from "vitest";
import {
  INACTIVE_DAYS,
  JOBS,
  isDue,
  lifecycleEmailEnabled,
  unsubscribeToken,
  unsubscribeTokenValid,
  unsubscribeUrl,
} from "../src/lifecycle.js";

describe("when a scheduled job is due", () => {
  const HOUR = 60 * 60 * 1000;

  it("runs a job that has never run", () => {
    // So a first deploy sends what is pending instead of waiting a full period.
    expect(isDue(null, 24 * HOUR)).toBe(true);
  });

  it("runs a job whose stored timestamp is unreadable", () => {
    // A NaN date is what a bad column value parses to. Treating it as never-run
    // is the safe direction: a duplicate mail is recoverable, a job that never
    // runs again is silent forever.
    expect(isDue(new Date("nonsense"), 24 * HOUR)).toBe(true);
  });

  it("does not run again inside the period", () => {
    const now = new Date("2026-09-12T12:00:00.000Z");
    const ranAnHourAgo = new Date("2026-09-12T11:00:00.000Z");
    expect(isDue(ranAnHourAgo, 24 * HOUR, now)).toBe(false);
  });

  it("runs once the period has elapsed exactly", () => {
    const now = new Date("2026-09-12T12:00:00.000Z");
    const dayAgo = new Date("2026-09-11T12:00:00.000Z");
    expect(isDue(dayAgo, 24 * HOUR, now)).toBe(true);
  });

  it("declares a cadence for every job and no duplicate ids", () => {
    expect(JOBS.length).toBeGreaterThan(0);
    for (const job of JOBS) {
      expect(job.everyMs, job.job).toBeGreaterThan(0);
    }
    expect(new Set(JOBS.map((j) => j.job)).size).toBe(JOBS.length);
  });

  it("waits long enough to call someone lapsed", () => {
    // A week away from an interview tool is an ordinary week.
    expect(INACTIVE_DAYS).toBeGreaterThanOrEqual(14);
  });
});

describe("the unsubscribe token", () => {
  it("accepts the token it issued", () => {
    const email = "someone@example.com";
    expect(unsubscribeTokenValid(email, unsubscribeToken(email))).toBe(true);
  });

  it("is bound to the address", () => {
    // Otherwise one leaked link would unsubscribe anybody.
    expect(unsubscribeTokenValid("other@example.com", unsubscribeToken("a@b.com"))).toBe(
      false,
    );
  });

  it("refuses garbage without throwing", () => {
    // These arrive from a query string, so every one of them is reachable.
    for (const bad of ["", "zz", "not-hex", "0".repeat(63), "0".repeat(65), "☃"]) {
      expect(unsubscribeTokenValid("a@b.com", bad), bad).toBe(false);
    }
  });

  it("puts a usable link in the mail", () => {
    const url = new URL(unsubscribeUrl("https://www.getmockio.com", "a+tag@b.com"));
    expect(url.pathname).toBe("/unsubscribe");
    // Round-trips through the query string, plus sign and all.
    expect(url.searchParams.get("e")).toBe("a+tag@b.com");
    expect(unsubscribeTokenValid("a+tag@b.com", url.searchParams.get("t")!)).toBe(true);
  });
});


describe("whether this deployment may send on a timer", () => {
  it("is off unless asked for", () => {
    // The default matters more than the switch: a developer's .env points at
    // the same Postgres as production and usually has a live mail provider, so
    // an on-by-default scheduler mails real customers from a laptop.
    const before = process.env.REALSESSIONS_LIFECYCLE_EMAIL;
    try {
      delete process.env.REALSESSIONS_LIFECYCLE_EMAIL;
      expect(lifecycleEmailEnabled()).toBe(false);
      process.env.REALSESSIONS_LIFECYCLE_EMAIL = "0";
      expect(lifecycleEmailEnabled()).toBe(false);
      process.env.REALSESSIONS_LIFECYCLE_EMAIL = "true";
      // Only the exact opt-in counts, so a half-set value fails closed.
      expect(lifecycleEmailEnabled()).toBe(false);
      process.env.REALSESSIONS_LIFECYCLE_EMAIL = "1";
      expect(lifecycleEmailEnabled()).toBe(true);
    } finally {
      if (before === undefined) delete process.env.REALSESSIONS_LIFECYCLE_EMAIL;
      else process.env.REALSESSIONS_LIFECYCLE_EMAIL = before;
    }
  });
});
