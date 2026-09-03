import OpenAI from "openai";
import { z } from "zod";
import type {
  ChatRequest,
  ChatResponse,
  JsonRequest,
  JsonResponse,
  ModelProvider,
  ProviderUsage,
} from "./types.js";
import { ZERO_USAGE } from "./types.js";

/**
 * One adapter for every vendor that speaks the OpenAI wire format — Qwen via
 * DashScope, DeepSeek, Groq, Together, or a local runtime. Only `baseURL`,
 * the key, and the model id change.
 */
export interface OpenAICompatibleConfig {
  baseURL: string;
  apiKey: string;
  /** Human-readable vendor name, for logs and error messages. */
  name: string;
  /**
   * Turn reasoning off. Qwen bills it as output tokens and — worse — spends
   * the whole `max_tokens` budget thinking, returning empty content with
   * `finish_reason: "length"`. The parameter name is vendor-specific:
   *   "openrouter" → `reasoning: { enabled: false }`  (the only one that
   *                   actually zeroes reasoning_tokens on OpenRouter)
   *   "dashscope"  → `enable_thinking: false`
   *   "both"       → send both; vendors ignore fields they don't know.
   */
  disableThinking?: false | "openrouter" | "dashscope" | "both";
  /**
   * Sent on every request. OpenRouter uses `HTTP-Referer` and `X-Title` to
   * attribute traffic and list the app on its leaderboards.
   */
  defaultHeaders?: Record<string, string>;
  /** Emit `models: [...]` for server-side fallback routing (OpenRouter). */
  supportsModelFallback?: boolean;
}

function readUsage(usage: OpenAI.CompletionUsage | undefined): ProviderUsage {
  if (!usage) return { ...ZERO_USAGE };
  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  return {
    // prompt_tokens includes cached tokens; split them so cost math is right.
    inputTokens: Math.max((usage.prompt_tokens ?? 0) - cached, 0),
    outputTokens: usage.completion_tokens ?? 0,
    cacheReadTokens: cached,
    cacheCreationTokens: 0,
  };
}

/** Finish reasons meaning the model declined rather than answered. */
const REFUSAL_REASONS = new Set(["content_filter"]);

export class OpenAICompatibleProvider implements ModelProvider {
  readonly name: string;
  private readonly client: OpenAI;
  private readonly disableThinking: false | "openrouter" | "dashscope" | "both";
  private readonly supportsModelFallback: boolean;

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.disableThinking = config.disableThinking ?? "both";
    this.supportsModelFallback = config.supportsModelFallback ?? false;
    this.client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      ...(config.defaultHeaders ? { defaultHeaders: config.defaultHeaders } : {}),
    });
  }

  /**
   * Vendor-specific fields the OpenAI types don't declare. The Node SDK has no
   * `extra_body` (that's the Python SDK) — unknown top-level body properties
   * are serialized as-is, so the cast is the supported way to send them.
   */
  /**
   * OpenRouter's native routing: `models` lists the primary plus fallbacks, and
   * it moves down the list on error or saturation. The response reports which
   * one actually ran.
   *
   * `provider.sort` picks between the endpoints serving one model. Left alone
   * the router balances price and availability; "latency" makes it pick the
   * fastest, which measured 434ms to first token against 2916ms unsorted for
   * the same model. Both fields are OpenRouter's own, so both hang off the
   * same capability flag.
   */
  private routing(
    model: string,
    fallbacks?: string[],
    latencyFirst?: boolean,
  ): Record<string, unknown> {
    if (!this.supportsModelFallback) return {};
    return {
      ...(fallbacks && fallbacks.length > 0 ? { models: [model, ...fallbacks] } : {}),
      ...(latencyFirst ? { provider: { sort: "latency" } } : {}),
    };
  }

  private extraBody(): Record<string, unknown> {
    const mode = this.disableThinking;
    if (mode === false) return {};
    return {
      ...(mode === "openrouter" || mode === "both"
        ? { reasoning: { enabled: false } }
        : {}),
      ...(mode === "dashscope" || mode === "both"
        ? { enable_thinking: false }
        : {}),
    };
  }

  /**
   * Some endpoints (Gemini via OpenRouter) reject a request that tries to turn
   * reasoning off: "Reasoning is mandatory for this endpoint". Retry once
   * without the flag rather than losing the model from a comparison.
   */
  private async withReasoningFallback<T>(
    attempt: (extra: Record<string, unknown>) => Promise<T>,
  ): Promise<T> {
    try {
      return await attempt(this.extraBody());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/reasoning is mandatory/i.test(message)) throw error;
      return attempt({});
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: request.system },
      ...request.messages.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
    ];

    const started = performance.now();
    let ttftMs: number | null = null;

    if (request.onDelta) {
      const stream = await this.withReasoningFallback((extra) =>
        this.client.chat.completions.create({
          model: request.model,
          messages,
          max_tokens: request.maxTokens,
          stream: true,
          stream_options: { include_usage: true },
          ...this.routing(request.model, request.fallbacks, request.latencyFirst),
          ...extra,
        } as OpenAI.ChatCompletionCreateParamsStreaming),
      );

      let text = "";
      let finishReason: string | null = null;
      let usage: OpenAI.CompletionUsage | undefined;
      let servedBy: string | undefined;

      for await (const chunk of stream) {
        servedBy = chunk.model ?? servedBy;
        const piece = chunk.choices[0]?.delta?.content;
        if (piece) {
          ttftMs ??= performance.now() - started;
          text += piece;
          request.onDelta(piece);
        }
        finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
        // Usage arrives on the final chunk when include_usage is set.
        usage = chunk.usage ?? usage;
      }

      return {
        text,
        servedBy: servedBy ?? request.model,
        stopReason: finishReason,
        refused: REFUSAL_REASONS.has(finishReason ?? ""),
        usage: readUsage(usage),
        latency: { ttftMs, totalMs: performance.now() - started },
      };
    }

    const response = await this.withReasoningFallback((extra) =>
      this.client.chat.completions.create({
        model: request.model,
        messages,
        max_tokens: request.maxTokens,
        ...this.routing(request.model, request.fallbacks, request.latencyFirst),
        ...extra,
      } as OpenAI.ChatCompletionCreateParamsNonStreaming),
    );

    const choice = response.choices[0];
    return {
      text: choice?.message?.content ?? "",
      servedBy: response.model ?? request.model,
      stopReason: choice?.finish_reason ?? null,
      refused: REFUSAL_REASONS.has(choice?.finish_reason ?? ""),
      usage: readUsage(response.usage),
      latency: { ttftMs: null, totalMs: performance.now() - started },
    };
  }

  async json<T>(request: JsonRequest<T>): Promise<JsonResponse<T>> {
    const started = performance.now();

    const response = await this.withReasoningFallback((extra) =>
      this.client.chat.completions.create({
        model: request.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
        max_tokens: request.maxTokens,
        // No latency sort here: the evaluator runs after the interview is over.
        ...this.routing(request.model, request.fallbacks),
        ...extra,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "evaluation",
            strict: true,
            // zod v4 emits JSON Schema natively.
            schema: z.toJSONSchema(request.schema) as Record<string, unknown>,
          },
        },
      } as OpenAI.ChatCompletionCreateParamsNonStreaming),
    );

    const choice = response.choices[0];
    const raw = choice?.message?.content ?? "";
    const latency = { ttftMs: null, totalMs: performance.now() - started };

    // Server-side schema enforcement still leaves truncated output invalid, so
    // parse defensively rather than trusting the response_format.
    let value: T | null = null;
    if (raw.trim() !== "") {
      try {
        value = request.schema.parse(JSON.parse(raw));
      } catch {
        value = null;
      }
    }

    return {
      value,
      raw,
      refused: REFUSAL_REASONS.has(choice?.finish_reason ?? ""),
      usage: readUsage(response.usage),
      latency,
    };
  }
}
