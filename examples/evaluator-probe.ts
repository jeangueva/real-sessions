/**
 * Phase 2 probe: can a cheap model judge the English of a Spanish speaker?
 *
 *   npm run evaluator-probe
 *   npx tsx examples/evaluator-probe.ts qwen3.5-flash gemini-3.1-flash-lite
 */
import "../src/env.js";
import process, { argv } from "node:process";
import { EVALUATOR_MODEL } from "../src/index.js";
import { loadEnv } from "./persona-harness.js";
import {
  CONTROL_COUNT,
  PLANTED_COUNT,
  reportProbe,
  runEvaluatorProbe,
} from "./evaluator-harness.js";
import type { ProbeResult } from "./evaluator-harness.js";

loadEnv();

const targets = argv.slice(2);

/**
 * Cheapest first, with the current default last as the quality bar to beat.
 * A model whose key is unset errors on its own row instead of aborting the run.
 */
const DEFAULT_TARGETS = [
  EVALUATOR_MODEL,
  "qwen/qwen3.7-plus",
  "anthropic/claude-sonnet-5",
];

const models = targets.length > 0 ? targets : DEFAULT_TARGETS;

console.log(`\nEvaluator probe — ${models.join(" vs ")}\n${"=".repeat(72)}`);
console.log(
  `Planted L1-Spanish errors: ${PLANTED_COUNT}. ` +
    `Control phrases that must NOT be flagged: ${CONTROL_COUNT}.\n`,
);

const results: ProbeResult[] = [];
for (const model of models) {
  process.stdout.write(`running ${model}... `);
  const result = await runEvaluatorProbe(model);
  console.log(result.error ? `ERROR: ${result.error}` : result.ok ? "PASS" : "FAIL");
  results.push(result);
}

for (const result of results) reportProbe(result);

console.log(`\n${"=".repeat(72)}`);
const passing = results.filter((r) => r.ok).map((r) => r.model);
console.log(
  passing.length > 0
    ? `Caught ${3}+ planted errors with no over-correction: ${passing.join(", ")}.`
    : "No model met the bar. Read the feedback text above before deciding.",
);
console.log(
  "\nOne run is a smoke test, not a verdict — rerun a candidate a few times\n" +
    "before trusting it with the half of the product users actually pay for.\n",
);

process.exit(results.some((r) => r.error) ? 1 : 0);
