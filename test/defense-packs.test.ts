import { describe, expect, it } from "vitest";
import { createDefensePackStore, remainingCredits, unlocks } from "../src/defense-packs.js";

const pack = (grantedAt: string, credits = 5) => ({
  paymentId: grantedAt,
  kind: "sustentacion" as const,
  credits,
  grantedAt,
  expiresAt: "2099-01-01T00:00:00.000Z",
});

describe("remainingCredits", () => {
  it("is zero without a pack", () => {
    expect(remainingCredits([], ["2026-10-01T00:00:00Z"])).toBe(0);
  });

  it("counts only full defences started since the oldest pack in date", () => {
    const packs = [pack("2026-10-10T00:00:00.000Z")];
    const started = ["2026-10-01T00:00:00Z", "2026-10-11T00:00:00Z", "2026-10-12T00:00:00Z"];
    expect(remainingCredits(packs, started)).toBe(3);
  });

  it("adds a second pack's credits and never goes below zero", () => {
    const packs = [pack("2026-10-10T00:00:00.000Z"), pack("2026-10-20T00:00:00.000Z")];
    expect(remainingCredits(packs, Array(4).fill("2026-10-15T00:00:00Z"))).toBe(6);
    expect(remainingCredits([pack("2026-10-10T00:00:00.000Z", 1)], Array(3).fill("2026-10-15T00:00:00Z"))).toBe(0);
  });
});

describe("the pack store", () => {
  it("grants a payment once, however many times it is reported", async () => {
    const store = createDefensePackStore(null);
    expect(await store.grant("ana", "123")).toBe(true);
    expect(await store.grant("ana", "123")).toBe(false);
    expect(await store.active("ana")).toHaveLength(1);
  });
});

describe("what a pass unlocks", () => {
  it("opens the modes with the intensive pass and the group rehearsal only with the group one", async () => {
    const store = createDefensePackStore(null);
    await store.grant("ana", "1", "sustentacion");
    expect(unlocks(await store.active("ana"))).toEqual({ modes: false, group: false, mentor: false });
    await store.grant("ana", "2", "intensivo");
    expect(unlocks(await store.active("ana"))).toEqual({ modes: true, group: false, mentor: false });
    await store.grant("ana", "3", "grupal");
    expect(unlocks(await store.active("ana"))).toEqual({ modes: true, group: true, mentor: false });
    expect(remainingCredits(await store.active("ana"), [])).toBe(45);
  });

  it("includes the session with a teacher only in the top pack, with every mode", async () => {
    const store = createDefensePackStore(null);
    await store.grant("leo", "9", "docente");
    expect(unlocks(await store.active("leo"))).toEqual({ modes: true, group: false, mentor: true });
    expect(remainingCredits(await store.active("leo"), [])).toBe(20);
  });
});
