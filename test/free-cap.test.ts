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
    expect(capabilitiesFor("free").monthlySessions).toBe(3);
    // Null rather than a large number: a cap of 9999 is still a cap, and the
    // server branches on null to skip the count entirely.
    expect(capabilitiesFor("premium").monthlySessions).toBeNull();
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
    const limit = capabilitiesFor("free").monthlySessions!;
    for (let i = 0; i < limit; i++) {
      expect(await store.sessionsSince(owner, monthStart())).toBeLessThan(limit);
      await seed(store, owner);
    }
    expect(await store.sessionsSince(owner, monthStart())).toBe(limit);
  });
});
