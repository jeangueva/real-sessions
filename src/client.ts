/**
 * Model selection. The vendor is inferred from the model id
 * ({@link resolveProvider}), so switching either phase is a one-variable change.
 *
 * Both phases default to `qwen/qwen3.7-flash` via OpenRouter, chosen from a
 * live benchmark on 2026-08-30 rather than from a price table:
 *
 *   Phase 1  0 rule failures, 1056ms median turn — the fastest of the three
 *            models that passed, and the cheapest.
 *   Phase 2  5/5 planted Spanish-L1 errors caught, 0 false positives — it beat
 *            qwen3.7-plus (4/5) at an eighth of the cost.
 *
 * Measured cost: ~$0.00033 per interview end to end (~$0.33 per 1000).
 * Reproduce with `npm run benchmark`; requires OPENROUTER_API_KEY.
 *
 * Both phases run on the same model, so a Qwen outage takes down the whole
 * product at once. The defaults below name a second-choice model per phase,
 * routed server-side by OpenRouter — both also passed the benchmark:
 * DeepSeek cleared every Phase 1 rule (at 6026ms, slow but serviceable as a
 * degraded path), and qwen3.7-plus caught 4/5 planted errors in Phase 2.
 */
const BLANKET_OVERRIDE = process.env.REALSESSIONS_MODEL;

export const INTERVIEWER_MODEL =
  BLANKET_OVERRIDE ??
  process.env.REALSESSIONS_INTERVIEWER_MODEL ??
  "qwen/qwen3.7-flash";

export const EVALUATOR_MODEL =
  BLANKET_OVERRIDE ??
  process.env.REALSESSIONS_EVALUATOR_MODEL ??
  "qwen/qwen3.7-flash";

/** Comma-separated env override, e.g. "a/b,c/d". Empty string disables. */
function fallbackList(envName: string, defaults: string[]): string[] {
  const raw = process.env[envName];
  if (raw === undefined) return defaults;
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

export const INTERVIEWER_FALLBACKS = fallbackList(
  "REALSESSIONS_INTERVIEWER_FALLBACKS",
  ["deepseek/deepseek-v4-flash", "google/gemini-3.5-flash-lite"],
);

export const EVALUATOR_FALLBACKS = fallbackList(
  "REALSESSIONS_EVALUATOR_FALLBACKS",
  ["qwen/qwen3.7-plus", "anthropic/claude-sonnet-5"],
);
