/**
 * Persona stress test for a single model: does it hold character under a
 * scripted adversarial candidate?
 *
 *   npm run persona-check
 *   npx tsx examples/persona-check.ts claude-sonnet-5
 *
 * Exits non-zero if any mechanical rule check fails.
 */
import process, { argv } from "node:process";
import { INTERVIEWER_MODEL } from "../src/index.js";
import { loadEnv, runPersonaCheck } from "./persona-harness.js";

loadEnv();

const model = argv[2] ?? INTERVIEWER_MODEL;
console.log(`\nPersona check — ${model}\n${"=".repeat(64)}`);

const result = await runPersonaCheck(model);

for (const [index, turn] of result.turns.entries()) {
  console.log(`\n[turn ${index + 1}] ${turn.probe}`);
  console.log(`  candidate  → ${turn.answer.slice(0, 76)}`);
  console.log(`  interviewer→ ${turn.text}`);
  for (const check of turn.checks) {
    console.log(`    ${check.ok ? "PASS" : "FAIL"}  ${check.name} (${check.detail})`);
  }
}

console.log(
  `\n${result.completion.ok ? "PASS" : "FAIL"}  ${result.completion.name} (${result.completion.detail})`,
);
console.log(
  `\ntokens: ${result.usage.inputTokens} in / ${result.usage.outputTokens} out` +
    (result.costUsd === null ? "" : ` — $${result.costUsd.toFixed(4)} per interview`),
);

console.log(`\n${"=".repeat(64)}`);
if (result.error) console.log(`ERROR: ${result.error}`);
console.log(
  result.failures.length === 0 && !result.error
    ? `All checks passed on ${model}.`
    : `${result.failures.length} check(s) failed: ${[...new Set(result.failures.map((f) => f.name))].join("; ")}`,
);
console.log(
  "\nRead the transcript too — tone, follow-up depth, and whether the vague\n" +
    "answer actually got challenged are judgement calls no assert covers.\n",
);

process.exit(result.failures.length === 0 && !result.error ? 0 : 1);
