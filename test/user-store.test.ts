import { describe, expect, it, beforeEach } from "vitest";
import {
  createUserStore,
  readPreferences,
  DEFAULT_PREFERENCES,
  type UserStore,
  type CompletedSession,
} from "../src/user-store.js";
import { SAMPLE_EVALUATION } from "./fixtures.js";

function record(id: string, score = 60): CompletedSession {
  return {
    id,
    company: "Stripe",
    role: "Senior Product Designer",
    stage: "Behavioral",
    completedAt: new Date().toISOString(),
    score,
    evaluation: SAMPLE_EVALUATION,
  };
}

describe("user store", () => {
  let store: UserStore;
  beforeEach(() => {
    store = createUserStore(null);
  });

  it("lists newest first", async () => {
    await store.recordSession("me", record("a"));
    await store.recordSession("me", record("b"));
    const list = await store.listSessions("me");
    expect(list.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("keeps the evaluation out of the list payload", async () => {
    await store.recordSession("me", record("a"));
    const [summary] = await store.listSessions("me");
    // The list view only needs the headline; shipping every evaluation body
    // makes the page heavier the longer someone practises.
    expect(summary).not.toHaveProperty("evaluation");
    expect(summary?.score).toBe(60);
  });

  it("returns the full evaluation for one session", async () => {
    await store.recordSession("me", record("a"));
    const full = await store.getSession("me", "a");
    expect(full?.evaluation.overall_score_percentage).toBe(
      SAMPLE_EVALUATION.overall_score_percentage,
    );
  });

  it("scopes history to its owner", async () => {
    await store.recordSession("me", record("a"));
    expect(await store.listSessions("someone-else")).toEqual([]);
    // Another identity's id must read as missing, not forbidden.
    expect(await store.getSession("someone-else", "a")).toBeNull();
  });

  it("returns defaults for an identity with no preferences", async () => {
    expect(await store.getPreferences("new")).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips preferences", async () => {
    await store.setPreferences("me", {
      defaultRole: "Backend Engineer",
      defaultCompany: "Amazon",
      interviewLength: 5,
    });
    expect((await store.getPreferences("me")).defaultRole).toBe("Backend Engineer");
  });
});

describe("readPreferences", () => {
  it("clamps interview length to what the prompt supports", () => {
    expect(readPreferences({ interviewLength: 99 }).interviewLength).toBe(7);
    expect(readPreferences({ interviewLength: 1 }).interviewLength).toBe(5);
  });

  it("falls back to defaults for junk input", () => {
    expect(readPreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences({ defaultRole: "   ", interviewLength: "abc" })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it("caps free text so a client cannot store an essay", () => {
    const long = "x".repeat(500);
    expect(readPreferences({ defaultRole: long }).defaultRole).toHaveLength(120);
  });
});
