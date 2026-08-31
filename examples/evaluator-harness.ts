/**
 * Phase 2 rig: a fixed transcript with planted Spanish-L1 interference errors,
 * and the checks that say whether a model can actually judge a candidate's
 * English. Shared by `evaluator-probe` and the combined `benchmark`.
 */
import { evaluateInterview } from "../src/index.js";
import type { Evaluation, TranscriptTurn } from "../src/index.js";
import { CONTEXT, estimateCost } from "./persona-harness.js";

/**
 * Planted errors, each a documented Spanish-L1 transfer pattern. `signals` are
 * the substrings that count as the model having caught it.
 */
export const PLANTED_ERRORS = [
  { text: "I have 28 years", signals: ["28 years", "i am 28", "age"] },
  { text: "depends of the team", signals: ["depends of", "depends on"] },
  { text: "explain me the process", signals: ["explain me", "explain to me"] },
  {
    text: "is necessary to test",
    signals: ["is necessary", "subject", "it is necessary"],
  },
  {
    text: "I assisted to the meeting",
    signals: ["assisted", "attended", "false friend"],
  },
];

/**
 * Control: informal but correct English. A model that flags these is
 * over-correcting, which produces demoralizing feedback for a real user.
 */
export const CONTROL_PHRASES = [
  { text: "And that's when we shipped it", signals: ["and that's when", "starting a sentence with and"] },
  { text: "we didn't have a lot of runway", signals: ["didn't have a lot", "contraction"] },
];

export const TRANSCRIPT: TranscriptTurn[] = [
  {
    speaker: "interviewer",
    text: "Thanks for joining, Mariana. Tell me about a project you're proud of.",
  },
  {
    speaker: "candidate",
    text: "Sure. I have 28 years and I work in design since six years. Last year I led the redesign of our merchant onboarding. I assisted to the meeting with stakeholders every week to align.",
  },
  {
    speaker: "interviewer",
    text: "What was the hardest tradeoff you made there?",
  },
  {
    speaker: "candidate",
    text: "The hardest was scope. It depends of the team capacity, no? We didn't have a lot of runway. Is necessary to test with real merchants before shipping, so we cut two features. And that's when we shipped it, three weeks late but with 22% less drop-off.",
  },
  {
    speaker: "interviewer",
    text: "How did you measure that drop-off change?",
  },
  {
    speaker: "candidate",
    text: "Can you explain me the process you use here first? In my company we use funnel analysis in Amplitude, comparing cohorts before and after the release.",
  },
];

export interface ProbeResult {
  model: string;
  ok: boolean;
  schemaValid: boolean;
  caught: string[];
  missed: string[];
  falsePositives: string[];
  costUsd: number | null;
  latencyMs: number | null;
  error?: string;
  evaluation?: Evaluation;
}

/** Everything the model wrote, lowercased, as one haystack. */
function feedbackCorpus(evaluation: Evaluation): string {
  return [
    ...evaluation.strengths,
    ...evaluation.areas_for_improvement,
    ...evaluation.vocabulary_feedback.good_usage,
    ...evaluation.vocabulary_feedback.missed_opportunities_or_errors,
    evaluation.structure_feedback.feedback_text,
    ...evaluation.actionable_next_steps,
  ]
    .join(" \n ")
    .toLowerCase();
}

export async function probe(model: string): Promise<ProbeResult> {
  const base: ProbeResult = {
    model,
    ok: false,
    schemaValid: false,
    caught: [],
    missed: [],
    falsePositives: [],
    costUsd: null,
    latencyMs: null,
  };

  let costUsd: number | null = null;
  let latencyMs: number | null = null;

  let evaluation: Evaluation;
  try {
    evaluation = await evaluateInterview(CONTEXT, TRANSCRIPT, {
      model,
      onUsage: ({ usage, latency }) => {
        costUsd = estimateCost(model, usage);
        latencyMs = latency.totalMs;
      },
    });
  } catch (caught) {
    return {
      ...base,
      costUsd,
      latencyMs,
      error: caught instanceof Error ? caught.message : String(caught),
    };
  }

  const corpus = feedbackCorpus(evaluation);
  const caught: string[] = [];
  const missed: string[] = [];
  for (const planted of PLANTED_ERRORS) {
    const hit = planted.signals.some((signal) => corpus.includes(signal));
    (hit ? caught : missed).push(planted.text);
  }

  const falsePositives = CONTROL_PHRASES.filter((control) =>
    control.signals.some((signal) => corpus.includes(signal)),
  ).map((control) => control.text);

  return {
    model,
    // A useful evaluator catches most planted errors without inventing new ones.
    ok: caught.length >= 3 && falsePositives.length === 0,
    schemaValid: true,
    caught,
    missed,
    falsePositives,
    costUsd,
    latencyMs,
    evaluation,
  };
}

export const PLANTED_COUNT = PLANTED_ERRORS.length;
export const CONTROL_COUNT = CONTROL_PHRASES.length;
export { probe as runEvaluatorProbe };

/** Prints one model's probe result in full detail. */
export function reportProbe(result: ProbeResult): void {
  console.log(`\n${"-".repeat(72)}\n${result.model}\n${"-".repeat(72)}`);
  if (result.error) {
    console.log(`  ERROR: ${result.error}`);
    return;
  }
  console.log(`  schema valid       ${result.schemaValid ? "PASS" : "FAIL"}`);
  console.log(
    `  L1 errors caught   ${result.caught.length}/${PLANTED_ERRORS.length}` +
      (result.missed.length > 0 ? `  (missed: ${result.missed.join("; ")})` : ""),
  );
  console.log(
    `  false positives    ${result.falsePositives.length}` +
      (result.falsePositives.length > 0
        ? `  (${result.falsePositives.join("; ")})`
        : "  (none — did not over-correct)"),
  );
  const evaluation = result.evaluation!;
  console.log(`  score reported     ${evaluation.overall_score_percentage}%`);
  console.log(
    `  vocabulary flagged ${evaluation.vocabulary_feedback.missed_opportunities_or_errors.join("; ") || "(nothing)"}`,
  );
  console.log(`  next steps         ${evaluation.actionable_next_steps.join(" | ")}`);
  console.log(
    `  cost / latency     ` +
      (result.costUsd === null ? "unknown rate" : `$${result.costUsd.toFixed(5)}`) +
      (result.latencyMs === null ? "" : ` / ${Math.round(result.latencyMs)}ms`),
  );
}
