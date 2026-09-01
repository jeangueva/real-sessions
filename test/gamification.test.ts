import { describe, expect, it } from "vitest";
import {
  axisScores,
  badgesForSession,
  capDaily,
  DAILY_XP_CAP,
  levelForXp,
  xpForSession,
} from "../src/gamification.js";
import type { SessionMetrics } from "../src/metrics.js";
import type { SessionSummary } from "../src/progress-store.js";

const METRICS: SessionMetrics = {
  words: 400,
  fillerPer100: 5,
  vocabularyRange: 0.6,
  wordShare: 0.6,
  speakingMs: 180_000,
  wpm: 140,
  avgResponseMs: 1_200,
  longPauses: 0,
  timeToFirstMs: 1_000,
  fromSpeech: true,
};

function past(
  overrides: Partial<SessionSummary> & { completedAt: string },
): SessionSummary {
  return {
    id: crypto.randomUUID(),
    company: "Stripe",
    sectorId: "fintech",
    role: "Growth PM",
    stage: "Behavioral",
    mode: "practice",
    personaId: "measured",
    startedAt: overrides.completedAt,
    score: 70,
    vocabularyScore: 7,
    structureScore: 6,
    metrics: METRICS,
    ...overrides,
  };
}

describe("xpForSession", () => {
  const base = {
    score: 80,
    mode: "practice" as const,
    history: [],
    xpToday: 0,
    today: "2026-08-31",
  };

  it("pays for completing, for the score, and for the first session of the day", () => {
    const events = xpForSession(base);
    expect(events.map((event) => event.kind)).toEqual([
      "completed",
      "score",
      "daily-first",
    ]);
    expect(total(events)).toBe(50 + 40 + 25);
  });

  it("does not pay the daily bonus twice in one day", () => {
    const events = xpForSession({
      ...base,
      history: [past({ completedAt: "2026-08-31T09:00:00.000Z" })],
    });
    expect(events.map((event) => event.kind)).not.toContain("daily-first");
  });

  it("pays for beating the mean of recent sessions", () => {
    const events = xpForSession({
      ...base,
      history: [
        past({ completedAt: "2026-08-30T09:00:00.000Z", score: 60 }),
        past({ completedAt: "2026-08-29T09:00:00.000Z", score: 64 }),
      ],
    });
    expect(events.map((event) => event.kind)).toContain("improved");
  });

  it("does not pay for improvement when the score went down", () => {
    const events = xpForSession({
      ...base,
      score: 50,
      history: [past({ completedAt: "2026-08-30T09:00:00.000Z", score: 90 })],
    });
    expect(events.map((event) => event.kind)).not.toContain("improved");
  });

  it("pays a premium for running without coaching", () => {
    const practice = total(xpForSession(base));
    const real = total(xpForSession({ ...base, mode: "real" }));
    // Otherwise practice mode is the rational choice forever.
    expect(real).toBeGreaterThan(practice);
  });

  it("stops at the daily cap", () => {
    const events = xpForSession({ ...base, xpToday: DAILY_XP_CAP - 10 });
    expect(total(events)).toBe(10);
  });

  it("awards nothing once the cap is spent", () => {
    expect(xpForSession({ ...base, xpToday: DAILY_XP_CAP })).toEqual([]);
  });
});

describe("capDaily", () => {
  it("keeps the log foldable by trimming the event, not the total", () => {
    const capped = capDaily([{ kind: "a", amount: 40 }, { kind: "b", amount: 40 }], 280);
    // 20 left in the day: the first event fits, the second is cut to nothing.
    expect(capped).toEqual([{ kind: "a", amount: 20 }]);
    expect(total(capped)).toBe(DAILY_XP_CAP - 280);
  });
});

describe("levelForXp", () => {
  it("starts everyone at level 1", () => {
    expect(levelForXp(0).level).toBe(1);
  });

  it("widens each level so late levels are not inflated", () => {
    const second = levelForXp(50).level;
    const third = levelForXp(200).level;
    expect(second).toBe(2);
    expect(third).toBe(3);
    // Level 3 costs 150 where level 2 cost 50.
    expect(levelForXp(200).xpForNextLevel).toBeGreaterThan(
      levelForXp(50).xpForNextLevel,
    );
  });

  it("reports progress within the current level", () => {
    const at = levelForXp(75);
    expect(at.level).toBe(2);
    expect(at.xpIntoLevel).toBe(25);
    expect(at.xpForNextLevel).toBe(150);
  });

  it("does not go negative on junk input", () => {
    expect(levelForXp(-100).level).toBe(1);
  });
});

describe("axisScores", () => {
  it("scores a comfortable pace near the top of fluency", () => {
    expect(axisScores({ metrics: METRICS, evaluation: null }).fluency).toBe(100);
  });

  it("penalises racing as much as stalling", () => {
    const fast = axisScores({ metrics: { ...METRICS, wpm: 200 }, evaluation: null });
    const slow = axisScores({ metrics: { ...METRICS, wpm: 80 }, evaluation: null });
    expect(fast.fluency).toBe(slow.fluency);
  });

  it("returns null rather than guessing when the input is missing", () => {
    const scores = axisScores({
      metrics: { ...METRICS, wpm: null, fillerPer100: null },
      evaluation: null,
    });
    expect(scores.fluency).toBeNull();
    expect(scores.confidence).toBeNull();
    expect(scores.structure).toBeNull();
  });

  it("prefers the evaluator's judgement over the proxy for vocabulary", () => {
    const scores = axisScores({
      metrics: METRICS,
      evaluation: {
        vocabulary_feedback: {
          score_out_of_10: 9,
          good_usage: [],
          missed_opportunities_or_errors: [],
        },
        structure_feedback: { score_out_of_10: 7, feedback_text: "" },
      },
    });
    expect(scores.vocabulary).toBe(90);
    expect(scores.structure).toBe(70);
  });
});

describe("badgesForSession", () => {
  const base = {
    score: 70,
    mode: "practice" as const,
    stage: "Behavioral",
    sectorId: "fintech",
    company: "Stripe",
    metrics: METRICS,
    history: [] as SessionSummary[],
  };

  it("marks the first session", () => {
    expect(badgesForSession(base)).toContain("first-session");
  });

  it("awards clean speech only under the threshold", () => {
    const clean = badgesForSession({
      ...base,
      metrics: { ...METRICS, fillerPer100: 2 },
    });
    expect(clean).toContain("clean-speech");
    expect(badgesForSession(base)).not.toContain("clean-speech");
  });

  it("requires five straight clean sessions for the streak", () => {
    const cleanMetrics = { ...METRICS, fillerPer100: 1 };
    const cleanHistory = Array.from({ length: 4 }, () =>
      past({ completedAt: "2026-08-30T09:00:00.000Z", metrics: cleanMetrics }),
    );
    expect(
      badgesForSession({ ...base, metrics: cleanMetrics, history: cleanHistory }),
    ).toContain("clean-streak");

    // One dirty session anywhere in the five breaks it.
    const broken = [...cleanHistory];
    broken[2] = past({ completedAt: "2026-08-29T09:00:00.000Z", metrics: METRICS });
    expect(
      badgesForSession({ ...base, metrics: cleanMetrics, history: broken }),
    ).not.toContain("clean-streak");
  });

  it("counts sectors across the whole history", () => {
    const history = [
      past({ completedAt: "2026-08-30T09:00:00.000Z", sectorId: "travel" }),
      past({ completedAt: "2026-08-29T09:00:00.000Z", sectorId: "social" }),
    ];
    expect(badgesForSession({ ...base, history })).toContain("sector-explorer");
  });

  it("recognises the round that was actually run", () => {
    expect(badgesForSession({ ...base, stage: "System design" })).toContain(
      "system-design",
    );
    expect(badgesForSession({ ...base, stage: "Technical deep dive" })).toContain(
      "technical-round",
    );
    expect(badgesForSession(base)).not.toContain("system-design");
  });
});

function total(events: { amount: number }[]): number {
  return events.reduce((sum, event) => sum + event.amount, 0);
}
