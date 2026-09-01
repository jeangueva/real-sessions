import type { ModelProvider } from "./types.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";

export type { ModelProvider } from "./types.js";
export type {
  ChatRequest,
  ChatResponse,
  ChatTurn,
  JsonRequest,
  JsonResponse,
  LatencyStats,
  ProviderUsage,
} from "./types.js";
export { ZERO_USAGE } from "./types.js";
export { AnthropicProvider, supportsEffort } from "./anthropic.js";
export { GeminiProvider } from "./gemini.js";
export { OpenAICompatibleProvider } from "./openai-compatible.js";
export type { OpenAICompatibleConfig } from "./openai-compatible.js";

export type Vendor = "anthropic" | "gemini" | "qwen" | "openrouter";

/** Vendors reached through the OpenAI wire format. */
const OPENAI_COMPATIBLE: Record<
  string,
  { baseURL: string; envKeys: string[]; label: string }
> = {
  qwen: {
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    envKeys: ["DASHSCOPE_API_KEY", "QWEN_API_KEY"],
    label: "Qwen (DashScope international)",
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    envKeys: ["OPENROUTER_API_KEY"],
    label: "OpenRouter",
  },
};

/** Providers are stateless per key, so one instance each is enough. */
const cache = new Map<Vendor, ModelProvider>();

/**
 * Picks the vendor from the model id, so every call site stays model-driven:
 * swapping `claude-haiku-4-5` for `qwen3.5-flash` needs no other change.
 *
 * OpenRouter ids carry a `vendor/model` slash (`deepseek/deepseek-chat`), which
 * is how they're told apart from a vendor's own id.
 */
export function vendorFor(model: string): Vendor {
  if (model.includes("/")) return "openrouter";
  if (model.startsWith("gemini-")) return "gemini";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("qwen")) return "qwen";
  throw new Error(
    `Unknown model "${model}". Expected "claude-*", "gemini-*", "qwen*", ` +
      `or an OpenRouter "vendor/model" id.`,
  );
}

export function resolveProvider(model: string): ModelProvider {
  const vendor = vendorFor(model);
  let provider = cache.get(vendor);
  if (!provider) {
    provider = createProvider(vendor);
    cache.set(vendor, provider);
  }
  return provider;
}

function createProvider(vendor: Vendor): ModelProvider {
  if (vendor === "anthropic") return new AnthropicProvider();
  if (vendor === "gemini") return new GeminiProvider();

  const config = OPENAI_COMPATIBLE[vendor]!;
  const apiKey = config.envKeys
    .map((name) => process.env[name])
    .find((value) => value && value.trim() !== "");
  if (!apiKey) {
    throw new Error(
      `${config.label} needs ${config.envKeys.join(" or ")} in the environment.`,
    );
  }
  const isOpenRouter = vendor === "openrouter";
  return new OpenAICompatibleProvider({
    name: vendor,
    baseURL: config.baseURL,
    apiKey,
    // OpenRouter attributes traffic with these and lists the app publicly.
    ...(isOpenRouter
      ? {
          defaultHeaders: {
            "HTTP-Referer":
              process.env.REALSESSIONS_SITE_URL ?? "https://realsessions.app",
            "X-Title": process.env.REALSESSIONS_APP_NAME ?? "Real Sessions",
          },
          supportsModelFallback: true,
        }
      : {}),
    // Reasoning bills as output and can eat the entire max_tokens budget,
    // leaving empty content. Each vendor spells the off-switch differently.
    disableThinking: vendor === "openrouter" ? "openrouter" : "dashscope",
  });
}

/** Test seam: force a provider for a vendor, or clear the cache. */
export function setProvider(
  vendor: Vendor,
  provider: ModelProvider | undefined,
): void {
  if (provider) cache.set(vendor, provider);
  else cache.delete(vendor);
}
