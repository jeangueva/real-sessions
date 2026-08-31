import { describe, expect, it, vi } from "vitest";
import { EVALUATOR_FALLBACKS, EVALUATOR_MODEL } from "../src/client.js";
import type { JsonRequest, ModelProvider } from "../src/providers/index.js";
import { EvaluationParseError, evaluateInterview } from "../src/evaluator.js";
import { EvaluationSchema, type Evaluation } from "../src/schema.js";
import type { TranscriptTurn } from "../src/types.js";
import { context } from "./fixtures.js";

const transcript: TranscriptTurn[] = [
  { speaker: "interviewer", text: "Tell me about a project you're proud of." },
  {
    speaker: "candidate",
    text: "I led a design system rollout that cut handoff time by 30%.",
  },
];

const evaluation: Evaluation = {
  overall_score_percentage: 72,
  strengths: ["Clear STAR structure", "Concrete metrics"],
  areas_for_improvement: ["Vague on tradeoffs", "Article usage"],
  vocabulary_feedback: {
    score_out_of_10: 7,
    good_usage: ["design system", "handoff"],
    missed_opportunities_or_errors: ["adoption rate"],
  },
  structure_feedback: {
    score_out_of_10: 8,
    feedback_text: "You opened with context and closed with a result.",
  },
  actionable_next_steps: ["Rehearse two STAR stories out loud."],
};

/** Provider stub returning a canned structured-output result. */
function stubProvider(result: {
  value: Evaluation | null;
  raw?: string;
  refused?: boolean;
}) {
  const json = vi.fn(async (request: JsonRequest<Evaluation>) => {
    void request;
    return {
      value: result.value,
      raw: result.raw ?? "",
      refused: result.refused ?? false,
      usage: {
        inputTokens: 100,
        outputTokens: 200,
        cacheReadTokens: 0,
        cacheCreationTokens: 0,
      },
      latency: { ttftMs: null, totalMs: 40 },
    };
  });
  const provider = {
    name: "stub",
    chat: async () => {
      throw new Error("not used");
    },
    json,
  } as unknown as ModelProvider;
  return { provider, json };
}

describe("evaluateInterview", () => {
  it("returns a schema-valid evaluation", async () => {
    const { provider, json } = stubProvider({ value: evaluation });

    const result = await evaluateInterview(context, transcript, { provider });

    expect(result).toEqual(evaluation);
    const request = json.mock.calls[0]![0];
    expect(request.model).toBe(EVALUATOR_MODEL);
    expect(request.schema).toBeTruthy();
    expect(request.prompt).toContain("Mariana:");
    expect(request.system).toContain(context.companyCulture);
  });

  it("passes the caller's model through to provider resolution", async () => {
    const { provider, json } = stubProvider({ value: evaluation });

    await evaluateInterview(context, transcript, {
      provider,
      model: "gemini-3.1-flash-lite",
    });

    expect(json.mock.calls[0]![0].model).toBe("gemini-3.1-flash-lite");
  });

  it("throws when the model returns no parsable payload", async () => {
    const { provider } = stubProvider({ value: null, raw: "half a json {" });

    await expect(
      evaluateInterview(context, transcript, { provider }),
    ).rejects.toBeInstanceOf(EvaluationParseError);
  });

  it("throws on a refusal", async () => {
    const { provider } = stubProvider({ value: null, refused: true });

    await expect(
      evaluateInterview(context, transcript, { provider }),
    ).rejects.toThrow(/declined/);
  });

  it("rejects an out-of-range score coming back from storage", () => {
    expect(() =>
      EvaluationSchema.parse({ ...evaluation, overall_score_percentage: 140 }),
    ).toThrow();
  });
});

describe("evaluateInterview metering", () => {
  it("hands usage and latency to onUsage", async () => {
    const { provider } = stubProvider({ value: evaluation });
    const seen: { input: number; total: number }[] = [];

    await evaluateInterview(context, transcript, {
      provider,
      onUsage: ({ usage, latency }) =>
        seen.push({ input: usage.inputTokens, total: latency.totalMs }),
    });

    expect(seen).toEqual([{ input: 100, total: 40 }]);
  });

  it("reports metering even when the payload fails to parse", async () => {
    const { provider } = stubProvider({ value: null, raw: "{" });
    let called = false;

    await expect(
      evaluateInterview(context, transcript, {
        provider,
        onUsage: () => {
          called = true;
        },
      }),
    ).rejects.toBeInstanceOf(EvaluationParseError);
    // A failed run still costs money — the caller must be able to see it.
    expect(called).toBe(true);
  });
});

describe("fallback routing", () => {
  it("passes fallback models through to the provider", async () => {
    const { provider, json } = stubProvider({ value: evaluation });

    await evaluateInterview(context, transcript, {
      provider,
      model: "qwen/qwen3.7-flash",
      fallbackModels: ["deepseek/deepseek-v4-flash"],
    });

    expect(json.mock.calls[0]![0].fallbacks).toEqual([
      "deepseek/deepseek-v4-flash",
    ]);
  });

  it("applies the configured defaults when the caller passes none", async () => {
    const { provider, json } = stubProvider({ value: evaluation });
    await evaluateInterview(context, transcript, { provider });
    expect(json.mock.calls[0]![0].fallbacks).toEqual(EVALUATOR_FALLBACKS);
  });

  it("lets a caller opt out with an empty list", async () => {
    const { provider, json } = stubProvider({ value: evaluation });
    await evaluateInterview(context, transcript, {
      provider,
      fallbackModels: [],
    });
    expect(json.mock.calls[0]![0].fallbacks).toBeUndefined();
  });
});
