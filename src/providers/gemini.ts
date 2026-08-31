import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
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

/** Finish reasons that mean the model declined rather than answered. */
const REFUSAL_REASONS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "IMAGE_SAFETY",
]);

function readUsage(response: GenerateContentResponse): ProviderUsage {
  const usage = response.usageMetadata;
  if (!usage) return { ...ZERO_USAGE };
  return {
    inputTokens: usage.promptTokenCount ?? 0,
    // Thinking tokens bill as output; count them or the cost report lies.
    outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
    cacheReadTokens: usage.cachedContentTokenCount ?? 0,
    cacheCreationTokens: 0,
  };
}

function finishReason(response: GenerateContentResponse): string | null {
  return response.candidates?.[0]?.finishReason ?? null;
}

export class GeminiProvider implements ModelProvider {
  readonly name = "gemini";
  private readonly ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key =
      apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!key) {
      throw new Error(
        "Gemini needs GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.",
      );
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const params = {
      model: request.model,
      // Gemini calls the assistant role "model".
      contents: request.messages.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.text }],
      })),
      config: {
        systemInstruction: request.system,
        maxOutputTokens: request.maxTokens,
      },
    };

    const started = performance.now();
    let ttftMs: number | null = null;

    let response: GenerateContentResponse;
    if (request.onDelta) {
      const stream = await this.ai.models.generateContentStream(params);
      let last: GenerateContentResponse | undefined;
      let text = "";
      for await (const chunk of stream) {
        last = chunk;
        const piece = chunk.text;
        if (piece) {
          ttftMs ??= performance.now() - started;
          text += piece;
          request.onDelta(piece);
        }
      }
      if (!last) {
        throw new Error("Gemini returned an empty stream.");
      }
      // The final chunk carries the usage totals; text was accumulated above.
      return {
        text,
        stopReason: finishReason(last),
        refused: REFUSAL_REASONS.has(finishReason(last) ?? ""),
        usage: readUsage(last),
        latency: { ttftMs, totalMs: performance.now() - started },
      };
    }

    response = await this.ai.models.generateContent(params);
    const reason = finishReason(response);
    return {
      text: response.text ?? "",
      stopReason: reason,
      refused: REFUSAL_REASONS.has(reason ?? ""),
      usage: readUsage(response),
      latency: { ttftMs, totalMs: performance.now() - started },
    };
  }

  async json<T>(request: JsonRequest<T>): Promise<JsonResponse<T>> {
    const started = performance.now();
    const response = await this.ai.models.generateContent({
      model: request.model,
      contents: [{ role: "user", parts: [{ text: request.prompt }] }],
      config: {
        systemInstruction: request.system,
        maxOutputTokens: request.maxTokens,
        responseMimeType: "application/json",
        // zod v4 emits JSON Schema natively — no separate converter needed.
        responseJsonSchema: z.toJSONSchema(request.schema),
      },
    });

    const raw = response.text ?? "";
    const reason = finishReason(response);
    const usage = readUsage(response);
    const refused = REFUSAL_REASONS.has(reason ?? "");

    // Gemini enforces the schema server-side, but a truncated response still
    // arrives as invalid JSON — so parse defensively rather than trusting it.
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
      refused,
      usage,
      latency: { ttftMs: null, totalMs: performance.now() - started },
    };
  }
}
