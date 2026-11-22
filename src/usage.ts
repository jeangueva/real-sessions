/**
 * What the AI costs, measured per call and attributed to what caused it.
 *
 * Every model call goes through `meterProvider`, which records the tokens and
 * — when the vendor reports it, as OpenRouter does — the exact cost in
 * dollars. Voice is metered where it happens: seconds of microphone streamed
 * to Deepgram, characters sent to be spoken. Those two have no per-call bill
 * to read, so they are priced from the rates below and stored as estimates.
 *
 * Attribution rides on the request. The server opens a context for each HTTP
 * request (`runWithUsage`) naming the feature from its path; the route adds
 * the account and, for a rehearsal, the session id and whether it is a thesis
 * defence (`tagUsage`). Model calls made anywhere under that request —
 * including an evaluation that finishes after the response — inherit it.
 *
 * Recording never fails a request: the write is fire-and-forget and an error
 * is logged, because a lost measurement is cheaper than a lost rehearsal.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type { DbPool } from "./db/index.js";
import type { ChatRequest, JsonRequest, ModelProvider, ProviderUsage } from "./providers/types.js";

export type UsageKind = "llm" | "stt" | "tts";

export interface UsageEvent {
  kind: UsageKind;
  feature: string;
  ownerId: string | null;
  sessionId: string | null;
  /** The model that served it, or the voice vendor. */
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  /** Seconds of audio (stt) or characters spoken (tts); 0 for a model call. */
  units: number;
  /** Null when nobody reported a price: a model call off OpenRouter. */
  costUsd: number | null;
  /** True when the cost comes from the rates here rather than a vendor's bill. */
  estimated: boolean;
}

export interface UsageContext {
  feature: string;
  ownerId?: string;
  sessionId?: string;
}

const context = new AsyncLocalStorage<UsageContext>();

/** Runs `fn` with a usage context; calls made under it are attributed to it. */
export function runWithUsage<T>(initial: UsageContext, fn: () => T): T {
  return context.run({ ...initial }, fn);
}

/** Adds to the current context: the account once known, a session once read. */
export function tagUsage(patch: Partial<UsageContext>): void {
  const current = context.getStore();
  if (current) Object.assign(current, patch);
}

export function currentUsage(): UsageContext | undefined {
  return context.getStore();
}

/**
 * The feature a request is for, from its path. Coarse on purpose: these are
 * the lines of a cost report, so they are named the way a price would be.
 * Rehearsals start as "interview" and become "defense" once the route has
 * read the session (see `tagUsage`).
 */
export function featureFor(path: string): string {
  if (path.startsWith("/api/sessions")) return "interview";
  if (path === "/api/thesis" || path.startsWith("/api/thesis/page")) return "thesis-analysis";
  if (path.startsWith("/api/thesis/")) return `thesis-${path.slice("/api/thesis/".length).split("/")[0]}`;
  if (path === "/api/training/custom/draft") return "custom-draft";
  if (path.startsWith("/api/training/intuition")) return "intuition";
  if (path.startsWith("/api/training/conversations")) return "conversation";
  if (path.startsWith("/api/voice")) return "voice";
  if (path.startsWith("/api/context")) return "context";
  return path.replace(/^\/api\//, "").split("/")[0] || "other";
}

/**
 * Prices for what has no bill to read, in dollars. Each can be set from the
 * environment when a contract or a price list changes; the defaults are the
 * vendors' published pay-as-you-go rates at the time of writing.
 */
export function voiceRates(env: NodeJS.ProcessEnv = process.env) {
  const rate = (name: string, fallback: number) => {
    const value = Number(env[name]);
    return Number.isFinite(value) && value >= 0 && env[name] !== undefined && env[name] !== "" ? value : fallback;
  };
  return {
    /** Deepgram streaming transcription, per minute of audio. */
    sttPerMinute: rate("USAGE_DEEPGRAM_STT_USD_PER_MIN", 0.0077),
    /** Spoken output, per thousand characters, by vendor. */
    ttsPer1kChars: {
      deepgram: rate("USAGE_DEEPGRAM_TTS_USD_PER_1K_CHARS", 0.03),
      azure: rate("USAGE_AZURE_TTS_USD_PER_1K_CHARS", 0.016),
      google: rate("USAGE_GOOGLE_TTS_USD_PER_1K_CHARS", 0.016),
    } as Record<string, number>,
  };
}

export interface UsageStore {
  record(event: UsageEvent): Promise<void>;
}

class PostgresUsageStore implements UsageStore {
  constructor(private readonly pool: DbPool) {}
  async record(event: UsageEvent) {
    await this.pool.query(
      `INSERT INTO ai_usage (kind, feature, owner_id, session_id, model, input_tokens, output_tokens,
                             cache_read_tokens, units, cost_usd, estimated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        event.kind,
        event.feature,
        event.ownerId,
        event.sessionId,
        event.model,
        event.inputTokens,
        event.outputTokens,
        event.cacheReadTokens,
        event.units,
        event.costUsd,
        event.estimated,
      ],
    );
  }
}

/** Without a database: the last events, enough for a test or a local look. */
export class MemoryUsageStore implements UsageStore {
  readonly events: UsageEvent[] = [];
  async record(event: UsageEvent) {
    this.events.push(event);
    if (this.events.length > 5_000) this.events.splice(0, this.events.length - 5_000);
  }
}

export function createUsageStore(pool: DbPool | null): UsageStore {
  return pool ? new PostgresUsageStore(pool) : new MemoryUsageStore();
}

let sink: UsageStore = new MemoryUsageStore();

export function setUsageStore(store: UsageStore): void {
  sink = store;
}

function emit(event: Omit<UsageEvent, "feature" | "ownerId" | "sessionId">, owner?: string): void {
  const ctx = context.getStore();
  const full: UsageEvent = {
    ...event,
    feature: ctx?.feature ?? "background",
    ownerId: owner ?? ctx?.ownerId ?? null,
    sessionId: ctx?.sessionId ?? null,
  };
  void sink.record(full).catch((error: unknown) => {
    console.error("[mockio] usage not recorded:", error instanceof Error ? error.message : error);
  });
}

/** One model call's usage, with the vendor's cost when it sent one. */
export function recordModelUsage(model: string, usage: ProviderUsage): void {
  emit({
    kind: "llm",
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    units: 0,
    costUsd: typeof usage.costUsd === "number" && Number.isFinite(usage.costUsd) ? usage.costUsd : null,
    estimated: false,
  });
}

/** Seconds of microphone streamed to Deepgram, priced at the per-minute rate. */
export function recordTranscription(seconds: number, owner: string): void {
  if (!(seconds > 0)) return;
  emit(
    {
      kind: "stt",
      model: "deepgram",
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      units: Math.round(seconds),
      costUsd: (seconds / 60) * voiceRates().sttPerMinute,
      estimated: true,
    },
    owner,
  );
}

/** Characters spoken by one vendor, priced at its per-thousand rate. */
export function recordSpeech(vendor: "deepgram" | "azure" | "google", characters: number): void {
  if (!(characters > 0)) return;
  emit({
    kind: "tts",
    model: vendor,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    units: characters,
    costUsd: (characters / 1000) * (voiceRates().ttsPer1kChars[vendor] ?? 0),
    estimated: true,
  });
}

const METERED = Symbol("metered");

/**
 * A provider that records every call it answers. Wrapping twice is a no-op,
 * so every place that builds or receives a provider can wrap it safely.
 */
export function meterProvider(provider: ModelProvider): ModelProvider {
  if ((provider as unknown as Record<symbol, boolean>)[METERED]) return provider;
  const metered: ModelProvider & { [METERED]: true } = {
    [METERED]: true,
    get name() {
      return provider.name;
    },
    async chat(request: ChatRequest) {
      const response = await provider.chat(request);
      recordModelUsage(response.servedBy ?? request.model, response.usage);
      return response;
    },
    async json<T>(request: JsonRequest<T>) {
      const response = await provider.json(request);
      recordModelUsage(request.model, response.usage);
      return response;
    },
  };
  return metered;
}
