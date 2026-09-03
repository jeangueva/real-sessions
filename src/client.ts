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

/**
 * The live interviewer. Chosen on time-to-first-sentence, not on benchmark
 * score, because this is the only model call a person sits through.
 *
 * Measured against the real Phase 1 prompt, median of three, milliseconds to
 * the first complete sentence — which is when speech can start:
 *
 *   deepseek-v4-flash [sorted by latency]   518
 *   gemini-3.5-flash-lite [sorted]          631
 *   gemini-3.1-flash-lite                   997
 *   nova-2-lite                            1025
 *   claude-haiku-4.5                       1741
 *   qwen3.7-flash                    429 from the provider, repeatedly
 *
 * The previous default was that last line. DeepSeek had already cleared every
 * Phase 1 rule in the benchmark; what it lacked was a fast endpoint, and
 * `latencyFirst` is what supplies one.
 */
export const INTERVIEWER_MODEL =
  BLANKET_OVERRIDE ??
  process.env.REALSESSIONS_INTERVIEWER_MODEL ??
  "deepseek/deepseek-v4-flash";

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
  // Ordered by the same measurement as the primary, so a fallback is a
  // slower interview rather than a stalled one.
  ["google/gemini-3.5-flash-lite", "google/gemini-3.1-flash-lite"],
);

export const EVALUATOR_FALLBACKS = fallbackList(
  "REALSESSIONS_EVALUATOR_FALLBACKS",
  ["qwen/qwen3.7-plus", "anthropic/claude-sonnet-5"],
);

/**
 * The coach runs on every candidate turn — several times per interview against
 * the evaluator's once — so it defaults to the same flash model the other two
 * phases use rather than anything larger. Its job is narrow enough that depth
 * buys little, and a slow coach is a useless one: the note has to arrive while
 * the candidate is still on that answer.
 */
export const COACH_MODEL =
  BLANKET_OVERRIDE ??
  process.env.REALSESSIONS_COACH_MODEL ??
  "qwen/qwen3.7-flash";

export const COACH_FALLBACKS = fallbackList("REALSESSIONS_COACH_FALLBACKS", [
  "google/gemini-3.5-flash-lite",
]);
