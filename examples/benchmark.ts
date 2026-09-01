/**
 * Runs both benchmarks and prints one recommendation: which model for Phase 1,
 * which for Phase 2, and what the pair costs per interview.
 *
 *   npm run benchmark
 *   npx tsx examples/benchmark.ts --interviewers qwen3.5-flash,claude-haiku-4-5 \
 *                                 --evaluators   qwen3.7-plus,claude-sonnet-5
 *
 * Models whose vendor key is unset fail on their own row; the rest still run.
 */
import process, { argv } from "node:process";
import { EVALUATOR_MODEL } from "../src/index.js";
import { loadEnv, runPersonaCheck } from "./persona-harness.js";
import type { RunResult } from "./persona-harness.js";
import {
  CONTROL_COUNT,
  PLANTED_COUNT,
  runEvaluatorProbe,
} from "./evaluator-harness.js";
import type { ProbeResult } from "./evaluator-harness.js";

loadEnv();

const INTERVIEWER_DEFAULTS = [
  "qwen3.5-flash",
  "deepseek/deepseek-chat",
  "gemini-3.1-flash-lite",
  "claude-haiku-4-5",
];
const EVALUATOR_DEFAULTS = ["qwen3.5-flash", "qwen3.7-plus", EVALUATOR_MODEL];

/** Reads `--flag a,b,c`, falling back to the default list. */
function listFlag(flag: string, fallback: string[]): string[] {
  const index = argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} needs a comma-separated list of models.`);
  }
  return value.split(",").map((model) => model.trim()).filter(Boolean);
}

const interviewers = listFlag("--interviewers", INTERVIEWER_DEFAULTS);
const evaluators = listFlag("--evaluators", EVALUATOR_DEFAULTS);

/**
 * An errored run has zero recorded usage, and printing "$0.00000" for it reads
 * as "free" rather than "never ran" — so failures print as unknown.
 */
const money = (value: number | null, errored = false): string =>
  errored || value === null ? "unknown" : `$${value.toFixed(5)}`;

console.log(`\n${"=".repeat(76)}`);
console.log("Real Sessions — full benchmark");
console.log(`${"=".repeat(76)}`);
console.log(`Phase 1 candidates: ${interviewers.join(", ")}`);
console.log(`Phase 2 candidates: ${evaluators.join(", ")}`);
console.log(
  `Phase 2 fixture: ${PLANTED_COUNT} planted L1-Spanish errors, ` +
    `${CONTROL_COUNT} control phrases that must not be flagged.`,
);

// Sequential across the board: keeps output readable and avoids rate limits.
console.log(`\n--- Phase 1: interviewer persona -------------------------------`);
const phase1: RunResult[] = [];
for (const model of interviewers) {
  process.stdout.write(`  ${model.padEnd(26)} `);
  const result = await runPersonaCheck(model);
  console.log(
    result.error ? `ERROR: ${result.error}` : `${result.failures.length} failure(s)`,
  );
  phase1.push(result);
}

console.log(`\n--- Phase 2: evaluator judgement -------------------------------`);
const phase2: ProbeResult[] = [];
for (const model of evaluators) {
  process.stdout.write(`  ${model.padEnd(26)} `);
  const result = await runEvaluatorProbe(model);
  console.log(
    result.error
      ? `ERROR: ${result.error}`
      : `${result.caught.length}/${PLANTED_COUNT} caught, ` +
        `${result.falsePositives.length} false positive(s)`,
  );
  phase2.push(result);
}

console.log(`\n${"=".repeat(76)}\nPhase 1 — interviewer\n${"=".repeat(76)}`);
console.log(
  ["model".padEnd(26), "failures".padEnd(10), "median turn".padEnd(13), "cost"].join(""),
);
for (const result of phase1) {
  console.log(
    [
      result.model.padEnd(26),
      String(result.error ? "errored" : result.failures.length).padEnd(10),
      (result.latency.medianTurnMs === null
        ? "-"
        : `${Math.round(result.latency.medianTurnMs)}ms`
      ).padEnd(13),
      money(result.costUsd, Boolean(result.error)),
    ].join(""),
  );
}

console.log(`\n${"=".repeat(76)}\nPhase 2 — evaluator\n${"=".repeat(76)}`);
console.log(
  ["model".padEnd(26), "caught".padEnd(10), "false pos".padEnd(11), "cost"].join(""),
);
for (const result of phase2) {
  console.log(
    [
      result.model.padEnd(26),
      (result.error ? "errored" : `${result.caught.length}/${PLANTED_COUNT}`).padEnd(10),
      String(result.error ? "-" : result.falsePositives.length).padEnd(11),
      money(result.costUsd, Boolean(result.error)),
    ].join(""),
  );
}

// Cheapest model that cleared every check for its phase.
const bestInterviewer = phase1
  .filter((r) => !r.error && r.failures.length === 0)
  .sort((a, b) => (a.costUsd ?? Infinity) - (b.costUsd ?? Infinity))
  .at(0);
const bestEvaluator = phase2
  .filter((r) => r.ok)
  .sort((a, b) => (a.costUsd ?? Infinity) - (b.costUsd ?? Infinity))
  .at(0);

console.log(`\n${"=".repeat(76)}\nRecommendation\n${"=".repeat(76)}`);

if (!bestInterviewer) {
  console.log("Phase 1  no model passed every rule — read the transcripts above.");
} else {
  console.log(
    `Phase 1  ${bestInterviewer.model} — cheapest with zero rule failures ` +
      `(${money(bestInterviewer.costUsd)}/interview)`,
  );
}

if (!bestEvaluator) {
  console.log("Phase 2  no model met the bar — read the feedback text above.");
} else {
  console.log(
    `Phase 2  ${bestEvaluator.model} — ${bestEvaluator.caught.length}/${PLANTED_COUNT} caught, ` +
      `no over-correction (${money(bestEvaluator.costUsd)}/interview)`,
  );
}

if (bestInterviewer?.costUsd != null && bestEvaluator?.costUsd != null) {
  const perInterview = bestInterviewer.costUsd + bestEvaluator.costUsd;
  console.log(
    `\nCombined  $${perInterview.toFixed(5)} per interview  ` +
      `→  $${(perInterview * 1000).toFixed(2)} per 1000`,
  );
  console.log(
    `Set it with:\n` +
      `  REALSESSIONS_INTERVIEWER_MODEL=${bestInterviewer.model}\n` +
      `  REALSESSIONS_EVALUATOR_MODEL=${bestEvaluator.model}`,
  );
}

console.log(
  `\nOne run per model is a smoke test, not a verdict. Rerun the winners a few\n` +
    `times before you wire them in — and read the transcripts, since tone and\n` +
    `follow-up depth are judgement calls no assert covers.\n`,
);

// Exit non-zero only when a run errored outright; a rule failure is a result.
process.exit(
  phase1.some((r) => r.error) || phase2.some((r) => r.error) ? 1 : 0,
);
