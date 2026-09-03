import type { ZodType } from "zod";

/** One conversation turn, provider-neutral. */
export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** Token spend for one call, normalized across providers. */
export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export const ZERO_USAGE: ProviderUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

export interface ChatRequest {
  model: string;
  /** System prompt. Every provider here supports one natively. */
  system: string;
  messages: ChatTurn[];
  maxTokens: number;
  /** When present, the provider streams and calls this with text chunks. */
  onDelta?: (chunk: string) => void;
  /**
   * Models to try, in order, if `model` is unavailable or rate-limited.
   * Honored by providers with server-side routing (OpenRouter); ignored by
   * the rest, which simply fail as before.
   */
  fallbacks?: string[];
  /**
   * Ask the router for the fastest endpoint rather than its default pick.
   *
   * Only the live interview sets this. A model served from four providers can
   * differ by a second in time-to-first-token depending on which one the
   * router happens to choose, and in a voice conversation that second is the
   * whole difference between a pause and a stall. The evaluator does not set
   * it: nobody is waiting on that call, and the default routing is cheaper.
   */
  latencyFirst?: boolean;
}

/** Wall-clock timings. TTFT is what a voice pipeline actually feels. */
export interface LatencyStats {
  /** Time to first streamed token; null on non-streaming calls. */
  ttftMs: number | null;
  totalMs: number;
}

export interface ChatResponse {
  text: string;
  /** Which model actually served the request — differs when a fallback fired. */
  servedBy?: string;
  /** Provider-native stop/finish reason, passed through for logging. */
  stopReason: string | null;
  /** True when the model declined on safety grounds rather than answering. */
  refused: boolean;
  usage: ProviderUsage;
  latency: LatencyStats;
}

export interface JsonRequest<T> {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  schema: ZodType<T>;
  /** Thinking depth, where the provider and model support it. */
  effort?: "low" | "medium" | "high";
  /** See {@link ChatRequest.fallbacks}. */
  fallbacks?: string[];
}

export interface JsonResponse<T> {
  /** Null when the model produced nothing schema-valid. */
  value: T | null;
  /** Raw text, for the error path. */
  raw: string;
  refused: boolean;
  usage: ProviderUsage;
  latency: LatencyStats;
}

/**
 * What Real Sessions needs from a model vendor: a chat turn and a schema-valid
 * JSON document. Everything else in this codebase is provider-neutral.
 */
export interface ModelProvider {
  readonly name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  json<T>(request: JsonRequest<T>): Promise<JsonResponse<T>>;
}
