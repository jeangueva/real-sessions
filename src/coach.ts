/**
 * The second loop.
 *
 * Loop A is the interview: audio in, interviewer out, latency is everything.
 * Loop B is this — it reads a finished exchange and writes notes to the
 * sidebar. It is deliberately off the critical path, which buys two things:
 * it can run on a cheaper model without anyone feeling it, and when it fails
 * the interview does not.
 *
 * That failure mode is the whole design. `coachTurn` never throws; a coaching
 * call that errors, times out, or returns nonsense yields no tips and the
 * candidate keeps talking. Any other choice would let a coaching outage take
 * down the product's actual job.
 */
import { COACH_FALLBACKS, COACH_MODEL } from "./client.js";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { buildCoachPrompt, formatExchange } from "./prompts/coach.js";
import { CoachFeedbackSchema, type CoachTip } from "./schema.js";
import type { InterviewContext } from "./types.js";

export interface CoachOptions {
  provider?: ModelProvider;
  model?: string;
  maxTokens?: number;
  /**
   * Give up after this long. The sidebar is worth having only while the
   * candidate is still on the turn it describes; a note that lands four
   * questions later is noise.
   */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Coaching notes for one exchange. Returns an empty array on any failure —
 * see the note above on why this never throws.
 */
export async function coachTurn(
  context: InterviewContext,
  question: string,
  answer: string,
  options: CoachOptions = {},
): Promise<CoachTip[]> {
  if (answer.trim() === "" || question.trim() === "") return [];

  const model = options.model ?? COACH_MODEL;
  const provider = options.provider ?? resolveProvider(model);

  try {
    const response = await withTimeout(
      provider.json({
        model,
        system: buildCoachPrompt(context),
        prompt: formatExchange(question, answer, context),
        // Three short sentences. A larger budget only buys a slower call.
        maxTokens: options.maxTokens ?? 512,
        schema: CoachFeedbackSchema,
        ...(COACH_FALLBACKS.length > 0 ? { fallbacks: COACH_FALLBACKS } : {}),
      }),
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (!response || response.refused || !response.value) return [];
    return CoachFeedbackSchema.parse(response.value).tips;
  } catch (error) {
    // Logged, not surfaced. The candidate is mid-interview.
    console.error("[realsessions] coach:", error);
    return [];
  }
}

/** Resolves to null rather than rejecting, so the caller has one path. */
async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  const expiry = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(timer);
  }
}
