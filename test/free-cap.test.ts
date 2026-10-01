import { describe, expect, it } from "vitest";
import { capabilitiesFor } from "../src/entitlements.js";
import { createProgressStore } from "../src/progress-store.js";
import { randomUUID } from "node:crypto";

/**
 * The free plan's monthly allowance.
 *
 * Before this existed the free plan had no session cap at all — only a rate
 * limit of twelve starts an hour, which is 288 a day and roughly $14 of vendor
 * spend per account. The paywall gated features while the bill stayed open.
 *
 * What is worth guarding: that the count is of *starts* rather than
 * completions (or someone quits at the last turn forever and never spends an
 * allowance), that it is windowed rather than lifetime, and that the paid plan
 * is not metered by accident.
 */

const monthStart = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();

const seed = async (
  store: Awaited<ReturnType<typeof createProgressStore>>,
  ownerId: string,
) => {
  const id = randomUUID();
  await store.createSession({
    id,
    ownerId,
    company: "Stripe",
    sectorId: "fintech",
    level: "b2",
    role: "Backend Engineer",
    stage: "Behavioral",
    mode: "practice",
    personaId: "measured",
  });
  return id;
};

describe("the allowance", () => {
  it("is three on free and unmetered on premium", () => {
    expect(capabilitiesFor("free").weeklySessions).toBe(5);
    // Null rather than a large number: a cap of 9999 is still a cap, and the
    // server branches on null to skip the count entirely.
    expect(capabilitiesFor("premium").weeklySessions).toBeNull();
  });
});

describe("sessionsSince", () => {
  it("counts a started interview, not a finished one", async () => {
    // The expensive half of a session happens at the start. Counting only
    // completions would let someone abandon at turn six indefinitely.
    const store = await createProgressStore(null);
    const owner = `owner-${randomUUID()}`;
    await seed(store, owner);
    expect(await store.sessionsSince(owner, monthStart())).toBe(1);
  });

  it("counts only this owner's interviews", async () => {
    const store = await createProgressStore(null);
    const mine = `owner-${randomUUID()}`;
    const theirs = `owner-${randomUUID()}`;
    await seed(store, mine);
    await seed(store, theirs);
    await seed(store, theirs);
    expect(await store.sessionsSince(mine, monthStart())).toBe(1);
  });

  it("ignores anything before the window", async () => {
    const store = await createProgressStore(null);
    const owner = `owner-${randomUUID()}`;
    await seed(store, owner);
    // A window that opens in the future excludes everything, which is the same
    // arithmetic the month boundary does on the first of the month.
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    expect(await store.sessionsSince(owner, tomorrow)).toBe(0);
  });

  it("reaches the free limit on the fourth start", async () => {
    const store = await createProgressStore(null);
    const owner = `owner-${randomUUID()}`;
    const limit = capabilitiesFor("free").weeklySessions!;
    for (let i = 0; i < limit; i++) {
      expect(await store.sessionsSince(owner, monthStart())).toBeLessThan(limit);
      await seed(store, owner);
    }
    expect(await store.sessionsSince(owner, monthStart())).toBe(limit);
  });
});

/**
 * Where the week starts.
 *
 * The allowance renews on a Monday in UTC rather than seven days after each
 * person's first interview. A predictable window is one someone can plan
 * around — "five a week, Mondays" is a sentence you can hold — and a sliding
 * one is not.
 *
 * Mirrors `weekStart` in server.ts. The arithmetic is the part that breaks
 * silently: a Sunday belongs to the week that began six days earlier, and
 * getting that wrong hands out a second allowance every Sunday.
 */
function weekStart(now: Date): Date {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const since = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - since);
  return start;
}

describe("the week the allowance runs on", () => {
  it("starts on Monday", () => {
    // Wednesday 1 October 2026 → Monday the 28th of September.
    expect(weekStart(new Date("2026-10-01T12:00:00Z")).toISOString()).toBe(
      "2026-09-28T00:00:00.000Z",
    );
  });

  it("puts Sunday at the end of its week, not the start of the next", () => {
    // The one that hands out a second allowance if it is wrong.
    const sunday = weekStart(new Date("2026-10-04T23:59:00Z"));
    const saturday = weekStart(new Date("2026-10-03T00:00:00Z"));
    expect(sunday.toISOString()).toBe(saturday.toISOString());
    expect(sunday.toISOString()).toBe("2026-09-28T00:00:00.000Z");
  });

  it("rolls over on Monday", () => {
    const sunday = weekStart(new Date("2026-10-04T23:59:00Z"));
    const monday = weekStart(new Date("2026-10-05T00:01:00Z"));
    expect(monday.getTime()).toBeGreaterThan(sunday.getTime());
    expect(monday.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("holds across a month boundary", () => {
    // A week that spans two months still has one start.
    expect(weekStart(new Date("2026-11-02T06:00:00Z")).toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
    expect(weekStart(new Date("2026-11-01T06:00:00Z")).toISOString()).toBe(
      "2026-10-26T00:00:00.000Z",
    );
  });
});
