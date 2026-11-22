import { describe, expect, it } from "vitest";
import { percentile, summariseAiCosts } from "../admin/metrics.js";

describe("admin AI cost summary", () => {
  it("takes percentiles from the sorted list", () => {
    expect(percentile([], 90)).toBe(0);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
  });

  it("answers what a rehearsal and an active person cost", () => {
    const summary = summariseAiCosts(
      {
        features: [
          { feature: "defense", cost: 3.0, calls: 90, owners: 2, sessions: 3, unpriced: 0 },
          { feature: "conversation", cost: 0.05, calls: 20, owners: 3, sessions: 0, unpriced: 2 },
        ],
        sessions: [
          { feature: "defense", cost: 0.5 },
          { feature: "defense", cost: 1.0 },
          { feature: "defense", cost: 1.5 },
          { feature: "interview", cost: 0.04 },
        ],
        owners: [
          { owner_id: "a", cost: 2.0 },
          { owner_id: "b", cost: 1.0 },
          { owner_id: "c", cost: 0.05 },
        ],
        models: [
          { kind: "llm", model: "anthropic/claude-sonnet-5", calls: 90, cost: 3.0, input_tokens: "900000", output_tokens: "40000", estimated: false },
          { kind: "tts", model: "deepgram", calls: 40, cost: 0.6, input_tokens: 0, output_tokens: 0, estimated: true },
        ],
        daily: [{ day: "2026-11-20", cost: 3.05 }],
      },
      [{ id: "a", email: "ana@example.com", createdAt: "2026-11-01T00:00:00Z" }],
    );

    expect(summary.available).toBe(true);
    expect(summary.total.cost).toBeCloseTo(3.05);
    expect(summary.total.unpriced).toBe(2);
    expect(summary.total.voice).toBeCloseTo(0.6);

    const defense = summary.perSession.find((row) => row.feature === "defense")!;
    expect(defense.sessions).toBe(3);
    expect(defense.avg).toBeCloseTo(1.0);
    expect(defense.p50).toBe(1.0);
    expect(defense.max).toBe(1.5);
    // The most expensive kind of rehearsal comes first.
    expect(summary.perSession[0]!.feature).toBe("defense");

    expect(summary.perOwner.owners).toBe(3);
    expect(summary.perOwner.avg).toBeCloseTo(3.05 / 3);
    expect(summary.perOwner.top[0]).toEqual({ owner: "ana@example.com", cost: 2.0 });
    expect(summary.perOwner.top[1]!.owner).toBe("b");

    expect(summary.byModel[0]!.inputTokens).toBe(900000);
    expect(summary.byModel[1]!.estimated).toBe(true);
  });
});
