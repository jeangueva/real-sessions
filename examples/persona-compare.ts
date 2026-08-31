/**
 * Runs the persona stress test across models and prints them side by side, so
 * the cheap-vs-capable call is made on evidence instead of a hunch.
 *
 *   npm run persona-compare
 *   npx tsx examples/persona-compare.ts claude-haiku-4-5 gemini-3.1-flash-lite claude-sonnet-5
 */
import process, { argv } from "node:process";
import { loadEnv, runPersonaCheck, SCRIPT } from "./persona-harness.js";
import type { RunResult } from "./persona-harness.js";

loadEnv();

const models = argv.slice(2);

/**
 * One model per vendor tier, cheapest-first. Each needs its own key in the
 * environment; a model whose key is missing errors on its own row rather than
 * aborting the run, so a partial comparison is still useful.
 */
const DEFAULT_TARGETS = [
  "qwen3.5-flash",
  "deepseek/deepseek-chat",
  "gemini-3.1-flash-lite",
  "claude-haiku-4-5",
];

const targets = models.length > 0 ? models : DEFAULT_TARGETS;

console.log(`\nPersona comparison — ${targets.join(" vs ")}\n${"=".repeat(72)}`);

// Sequential, not parallel: keeps output readable and avoids rate-limit noise.
const results: RunResult[] = [];
for (const model of targets) {
  process.stdout.write(`running ${model}... `);
  const result = await runPersonaCheck(model);
  console.log(result.error ? `ERROR: ${result.error}` : `${result.failures.length} failure(s)`);
  results.push(result);
}

const probeLabels = ["opening turn", ...SCRIPT.map((step) => step.probe)];

console.log(`\n${"-".repeat(72)}\nPer-probe results\n${"-".repeat(72)}`);
for (const [index, label] of probeLabels.entries()) {
  console.log(`\n${index + 1}. ${label}`);
  for (const result of results) {
    const turn = result.turns[index];
    if (!turn) {
      console.log(`   ${result.model.padEnd(24)} (no turn — session ended or errored)`);
      continue;
    }
    const failed = turn.checks.filter((check) => !check.ok);
    const verdict = failed.length === 0 ? "PASS" : `FAIL: ${failed.map((f) => f.name).join(", ")}`;
    console.log(`   ${result.model.padEnd(24)} ${verdict}`);
    console.log(`   ${" ".repeat(24)} "${turn.text}"`);
  }
}

console.log(`\n${"-".repeat(72)}\nSummary\n${"-".repeat(72)}`);
console.log(
  [
    "model".padEnd(24),
    "failures".padEnd(10),
    "turns".padEnd(7),
    "in/out tokens".padEnd(16),
    "median turn".padEnd(13),
    "cost/interview",
  ].join(""),
);
for (const result of results) {
  console.log(
    [
      result.model.padEnd(24),
      String(result.error ? "errored" : result.failures.length).padEnd(10),
      String(result.completion.detail.split(" ")[0]).padEnd(7),
      `${result.usage.inputTokens}/${result.usage.outputTokens}`.padEnd(16),
      (result.latency.medianTurnMs === null
        ? "-"
        : `${Math.round(result.latency.medianTurnMs)}ms`
      ).padEnd(13),
      result.costUsd === null ? "unknown rate" : `$${result.costUsd.toFixed(4)}`,
    ].join(""),
  );
}

// Sort by measured cost — argument order is not price order, and calling the
// first passing model "cheapest" named the most expensive one.
const cheapest = results
  .filter((r) => !r.error && r.failures.length === 0)
  .sort((a, b) => (a.costUsd ?? Infinity) - (b.costUsd ?? Infinity))
  .at(0);
console.log(
  `\n${
    cheapest
      ? `Cheapest model with zero mechanical failures: ${cheapest.model}.`
      : "No model passed every mechanical check — read the transcripts above."
  }`,
);
console.log(
  "Mechanical passes are a floor, not proof: compare the actual wording above\n" +
    "for follow-up depth and how each model deflected the identity attack.\n",
);

process.exit(results.some((r) => r.error) ? 1 : 0);
