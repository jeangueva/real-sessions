import { EVALUATOR_FALLBACKS, EVALUATOR_MODEL } from "./client.js";
import { resolveProvider } from "./providers/index.js";
import type {
  LatencyStats,
  ModelProvider,
  ProviderUsage,
} from "./providers/index.js";
import { buildEvaluatorPrompt, formatTranscript } from "./prompts/evaluator.js";
import { EvaluationSchema, type Evaluation } from "./schema.js";
import type { InterviewContext, TranscriptTurn } from "./types.js";

/** Raised when the model returns nothing that validates against the schema. */
export class EvaluationParseError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "EvaluationParseError";
  }
}

export interface EvaluateOptions {
  /** Defaults to the vendor implied by `model`. Inject a stub in tests. */
  provider?: ModelProvider;
  model?: string;
  maxTokens?: number;
  /**
   * Thinking depth. Evaluation is the quality-sensitive half — default high.
   * Ignored on models without effort control (Haiku 4.5, Sonnet 4.5).
   */
  effort?: "low" | "medium" | "high";
  /**
   * Models to try in order if the primary is unavailable. Server-side routing
   * on OpenRouter; ignored by providers without it.
   */
  fallbackModels?: string[];
  /** Called with the metering for this call, before the result is validated. */
  onUsage?: (meta: { usage: ProviderUsage; latency: LatencyStats }) => void;
}

/**
 * Phase 2 — runs after `[INTERVIEW_COMPLETE]` is detected. The JSON shape is
 * enforced by the provider's structured-output mode using
 * {@link EvaluationSchema}, so no markdown-fence stripping is needed and a
 * malformed payload fails loudly instead of landing in the database.
 */
export async function evaluateInterview(
  context: InterviewContext,
  transcript: readonly TranscriptTurn[],
  options: EvaluateOptions = {},
): Promise<Evaluation> {
  const model = options.model ?? EVALUATOR_MODEL;
  const provider = options.provider ?? resolveProvider(model);

  const response = await provider.json({
    model,
    system: buildEvaluatorPrompt(context),
    prompt: formatTranscript(transcript, context),
    maxTokens: options.maxTokens ?? 4096,
    schema: EvaluationSchema,
    ...(options.effort ? { effort: options.effort } : {}),
    ...((options.fallbackModels ?? EVALUATOR_FALLBACKS).length > 0
      ? { fallbacks: options.fallbackModels ?? EVALUATOR_FALLBACKS }
      : {}),
  });

  options.onUsage?.({ usage: response.usage, latency: response.latency });

  if (response.refused) {
    throw new EvaluationParseError(
      "The evaluator model declined to analyze this transcript.",
      response.raw,
    );
  }

  if (!response.value) {
    throw new EvaluationParseError(
      `Evaluator returned no schema-valid JSON (stop reason: ${response.raw ? "unparsable output" : "empty output"}).`,
      response.raw,
    );
  }

  // Re-validate locally: the same guarantee then applies to rows read back
  // out of Supabase, not just to this response.
  return EvaluationSchema.parse(response.value);
}
