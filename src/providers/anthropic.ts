import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
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
 * Models that reject `output_config.effort` with a 400. Haiku 4.5 and Sonnet
 * 4.5 have no effort control, so the field must be omitted, not defaulted.
 */
const EFFORT_UNSUPPORTED = new Set([
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-3-5-sonnet-latest",
]);

export function supportsEffort(model: string): boolean {
  return !EFFORT_UNSUPPORTED.has(model);
}

function readUsage(usage: Anthropic.Message["usage"] | undefined): ProviderUsage {
  if (!usage) return { ...ZERO_USAGE };
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

export class AnthropicProvider implements ModelProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    // Credentials resolve from ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or a
    // stored `ant auth login` profile.
    this.client = client ?? new Anthropic();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: request.model,
      max_tokens: request.maxTokens,
      // Stable prefix — cached across every turn of the session.
      system: [
        {
          type: "text",
          text: request.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: request.messages.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
    };

    const started = performance.now();
    let ttftMs: number | null = null;

    let response: Anthropic.Message;
    if (request.onDelta) {
      const stream = this.client.messages.stream(params);
      const onDelta = request.onDelta;
      stream.on("text", (chunk) => {
        ttftMs ??= performance.now() - started;
        onDelta(chunk);
      });
      response = await stream.finalMessage();
    } else {
      response = await this.client.messages.create(params);
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      text,
      stopReason: response.stop_reason,
      refused: response.stop_reason === "refusal",
      usage: readUsage(response.usage),
      latency: { ttftMs, totalMs: performance.now() - started },
    };
  }

  async json<T>(request: JsonRequest<T>): Promise<JsonResponse<T>> {
    const started = performance.now();
    const response = await this.client.beta.messages.parse({
      model: request.model,
      max_tokens: request.maxTokens,
      ...(supportsEffort(request.model)
        ? { output_config: { effort: request.effort ?? "high" } }
        : {}),
      system: [
        {
          type: "text",
          text: request.system,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: request.prompt }],
      output_format: betaZodOutputFormat(request.schema),
    });

    const raw = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      value: (response.parsed_output as T | null) ?? null,
      raw,
      refused: response.stop_reason === "refusal",
      usage: readUsage(response.usage as Anthropic.Message["usage"]),
      latency: { ttftMs: null, totalMs: performance.now() - started },
    };
  }
}
