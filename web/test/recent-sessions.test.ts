import { describe, expect, it } from "vitest";
import {
  RECENT_LIMIT,
  companyLabel,
  recentFirst,
  shortDate,
} from "../src/platform/RecentSessions";
import type { SessionSummary } from "../src/lib/api";

/**
 * The row of past interviews under the setup bar.
 *
 * The ordering is the whole feature: "the last few" is useless if it is
 * whatever order the API happened to return, and a rail that leads with a
 * three-week-old attempt is one nobody presses.
 */

const session = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "s1",
  company: "Stripe",
  sectorId: "fintech",
  role: "Backend Engineer",
  stage: "Behavioral",
  mode: "practice",
  personaId: "skeptic",
  startedAt: "2026-08-12T10:00:00.000Z",
  completedAt: null,
  score: 68,
  vocabularyScore: null,
  structureScore: null,
  metrics: null,
  ...over,
});

describe("recentFirst", () => {
  it("puts the newest first whatever order it arrives in", () => {
    const ordered = recentFirst([
      session({ id: "old", startedAt: "2026-08-01T10:00:00.000Z" }),
      session({ id: "new", startedAt: "2026-09-01T10:00:00.000Z" }),
      session({ id: "mid", startedAt: "2026-08-20T10:00:00.000Z" }),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(["new", "mid", "old"]);
  });

  it("caps the row", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      session({ id: `s${i}`, startedAt: `2026-08-${String(i + 1).padStart(2, "0")}T10:00:00.000Z` }),
    );
    expect(recentFirst(many)).toHaveLength(RECENT_LIMIT);
  });

  it("does not reorder the caller's array", () => {
    // The same list feeds the search box, which has its own ranking.
    const original = [
      session({ id: "a", startedAt: "2026-08-01T10:00:00.000Z" }),
      session({ id: "b", startedAt: "2026-09-01T10:00:00.000Z" }),
    ];
    recentFirst(original);
    expect(original.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty history, which hides the row", () => {
    // An empty rail with a heading promises something the account does not
    // have yet.
    expect(recentFirst([])).toEqual([]);
  });
});

describe("companyLabel", () => {
  it("names the company when there is one", () => {
    expect(companyLabel(session(), "a well-regarded technology company")).toBe("Stripe");
  });

  it("does not print the free-plan placeholder on a card", () => {
    const generic = "a well-regarded technology company";
    expect(companyLabel(session({ company: generic }), generic)).toBe("General role");
  });
});

describe("shortDate", () => {
  it("formats a real timestamp", () => {
    expect(shortDate("2026-08-12T10:00:00.000Z")).not.toBe("");
  });

  it("returns nothing for a broken one rather than 'Invalid Date'", () => {
    expect(shortDate("not a date")).toBe("");
  });
});
