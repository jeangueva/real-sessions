import { describe, expect, it } from "vitest";
import {
  defaultStats,
  shareStats,
  weekStart,
  weekStreak,
} from "../src/lib/share-stats";
import type { SessionSummary } from "../src/lib/api";

/**
 * What the share card is allowed to say about somebody.
 *
 * The streak rules carry the product decision, so they are tested at the
 * boundaries rather than in the middle: a streak that breaks on Monday morning
 * is the fastest way to lose the person it was meant to encourage.
 */
const MONDAY = new Date("2026-09-28T09:00:00.000Z");

function session(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: Math.random().toString(36).slice(2),
    company: "Nubank",
    sectorId: "fintech",
    role: "Growth PM",
    stage: "Behavioral",
    mode: "practice",
    personaId: "skeptic",
    level: "b2",
    startedAt: "2026-09-28T09:00:00.000Z",
    completedAt: "2026-09-28T09:10:00.000Z",
    score: 70,
    vocabularyScore: 7,
    structureScore: 6,
    metrics: null,
    ...overrides,
  };
}

describe("the week a date belongs to", () => {
  it("puts Sunday in the week that already began", () => {
    // Sunday 4 October belongs to the Monday before it, not the day after.
    expect(weekStart(new Date("2026-10-04T23:00:00.000Z"))).toBe(
      weekStart(new Date("2026-09-28T00:00:00.000Z")),
    );
  });
});

describe("the streak", () => {
  it("counts consecutive weeks", () => {
    const weeks = [
      "2026-09-28T10:00:00.000Z",
      "2026-09-21T10:00:00.000Z",
      "2026-09-14T10:00:00.000Z",
    ];
    expect(weekStreak(weeks, MONDAY)).toBe(3);
  });

  it("survives a current week with nothing in it yet", () => {
    // It is Monday morning. Telling somebody their streak is over because
    // they have not practised today is both wrong and unforgivable.
    expect(weekStreak(["2026-09-21T10:00:00.000Z"], MONDAY)).toBe(1);
  });

  it("breaks when a whole week was missed", () => {
    expect(weekStreak(["2026-09-14T10:00:00.000Z"], MONDAY)).toBe(0);
  });

  it("does not double-count two sessions in one week", () => {
    expect(
      weekStreak(["2026-09-28T10:00:00.000Z", "2026-09-28T18:00:00.000Z"], MONDAY),
    ).toBe(1);
  });
});

describe("the stats on offer", () => {
  it("omits what there is nothing behind rather than showing a zero", () => {
    const stats = shareStats([session({ completedAt: null, score: null })], MONDAY);
    // An abandoned interview is not a practised one, so there is nothing to
    // publish — and "0 interviews" is worse than silence.
    expect(stats).toEqual([]);
  });

  it("marks the score as the one stat that is not boastable", () => {
    const stats = shareStats([session({ score: 62 })], MONDAY);
    const best = stats.find((stat) => stat.id === "best");
    expect(best?.value).toBe("62%");
    expect(best?.sensitive).toBe(true);
  });

  it("never offers the score as a default", () => {
    // Somebody whose only finished interview scored 62 still gets a card, and
    // it does not open by publishing 62% next to their face.
    const stats = shareStats([session({ score: 62 })], MONDAY);
    expect(defaultStats(stats)).not.toContain("best");
    expect(defaultStats(stats).length).toBeGreaterThan(0);
  });

  it("counts only the minutes actually spoken", () => {
    const stats = shareStats(
      [
        session({ metrics: { words: 300, fillerPer100: 2, vocabularyRange: 0.6, wordShare: 0.6, speakingMs: 120_000, wpm: 140, avgResponseMs: 1_000, longPauses: 0, timeToFirstMs: 900, fromSpeech: true } }),
        // Typed: no speech, so it contributes no minutes.
        session({ metrics: null }),
      ],
      MONDAY,
    );
    expect(stats.find((stat) => stat.id === "spoken")?.value).toBe("2");
    expect(stats.find((stat) => stat.id === "total")?.value).toBe("2");
  });

  it("reports the level of the latest interview, not the best ever reached", () => {
    const stats = shareStats(
      [session({ level: "b2" }), session({ level: "c1" })],
      MONDAY,
    );
    // Saying C1 for somebody now practising at B2 misrepresents them to a
    // recruiter, which is the one reader who matters here.
    expect(stats.find((stat) => stat.id === "level")?.value).toBe("B2");
  });
});
