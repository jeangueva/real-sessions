import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  featureFor,
  meterProvider,
  MemoryUsageStore,
  recordSpeech,
  recordTranscription,
  runWithUsage,
  setUsageStore,
  tagUsage,
  voiceRates,
} from "../src/usage.js";
import type { ModelProvider } from "../src/providers/index.js";
import { completeInterview, post, startHarness, type Harness } from "./support/http.js";

/** Lets the fire-and-forget writes land before a test reads the store. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const fake = (costUsd?: number): ModelProvider => ({
  name: "fake",
  async chat() {
    return {
      text: "hola",
      servedBy: "vendor/served-model",
      stopReason: "stop",
      refused: false,
      usage: { inputTokens: 120, outputTokens: 30, cacheReadTokens: 10, cacheCreationTokens: 0, ...(costUsd === undefined ? {} : { costUsd }) },
      latency: { ttftMs: 1, totalMs: 1 },
    };
  },
  async json() {
    return {
      value: null,
      raw: "",
      refused: false,
      usage: { inputTokens: 500, outputTokens: 200, cacheReadTokens: 0, cacheCreationTokens: 0, costUsd: 0.004 },
      latency: { ttftMs: null, totalMs: 1 },
    };
  },
});

describe("usage metering", () => {
  let store: MemoryUsageStore;
  beforeEach(() => {
    store = new MemoryUsageStore();
    setUsageStore(store);
  });

  it("names features after what a price would be named", () => {
    expect(featureFor("/api/sessions")).toBe("interview");
    expect(featureFor("/api/sessions/abc/answers")).toBe("interview");
    expect(featureFor("/api/thesis")).toBe("thesis-analysis");
    expect(featureFor("/api/thesis/slides")).toBe("thesis-slides");
    expect(featureFor("/api/training/conversations/answer")).toBe("conversation");
    expect(featureFor("/api/training/custom/draft")).toBe("custom-draft");
    expect(featureFor("/api/training/intuition/reveal")).toBe("intuition");
  });

  it("records each model call with the vendor's cost, the served model and the context", async () => {
    const provider = meterProvider(fake(0.0021));
    await runWithUsage({ feature: "interview" }, async () => {
      tagUsage({ ownerId: "owner-1", sessionId: "s-1", feature: "defense" });
      await provider.chat({ model: "vendor/asked-model", system: "", messages: [], maxTokens: 10 });
    });
    await settle();
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      kind: "llm",
      feature: "defense",
      ownerId: "owner-1",
      sessionId: "s-1",
      model: "vendor/served-model",
      inputTokens: 120,
      outputTokens: 30,
      cacheReadTokens: 10,
      costUsd: 0.0021,
      estimated: false,
    });
  });

  it("counts a call with no reported price as unpriced, not free", async () => {
    await meterProvider(fake()).chat({ model: "claude-x", system: "", messages: [], maxTokens: 10 });
    await settle();
    expect(store.events[0]).toMatchObject({ costUsd: null, feature: "background", ownerId: null });
  });

  it("does not record a call twice when a provider is wrapped twice", async () => {
    const twice = meterProvider(meterProvider(fake(0.001)));
    await twice.json({ model: "m", system: "", prompt: "", maxTokens: 1, schema: {} as never });
    await settle();
    expect(store.events).toHaveLength(1);
    expect(store.events[0]!.costUsd).toBe(0.004);
  });

  it("prices voice from the configured rates and marks it as an estimate", async () => {
    recordTranscription(120, "owner-2");
    runWithUsage({ feature: "voice", ownerId: "owner-3" }, () => recordSpeech("deepgram", 2000));
    await settle();
    const rates = voiceRates();
    expect(store.events[0]).toMatchObject({ kind: "stt", ownerId: "owner-2", units: 120, estimated: true });
    expect(store.events[0]!.costUsd).toBeCloseTo(2 * rates.sttPerMinute);
    expect(store.events[1]).toMatchObject({ kind: "tts", ownerId: "owner-3", units: 2000, model: "deepgram" });
    expect(store.events[1]!.costUsd).toBeCloseTo(2 * rates.ttsPer1kChars.deepgram!);
  });

  it("reads a changed rate from the environment and ignores a bad one", () => {
    expect(voiceRates({ USAGE_DEEPGRAM_STT_USD_PER_MIN: "0.01" }).sttPerMinute).toBe(0.01);
    expect(voiceRates({ USAGE_DEEPGRAM_STT_USD_PER_MIN: "nope" }).sttPerMinute).toBe(0.0077);
  });
});

describe("usage through the API", () => {
  let api: Harness;
  beforeEach(async () => {
    api = await startHarness();
  });
  afterEach(async () => {
    await api.stop();
  });

  it("attributes a conversation's calls to the account and the feature", async () => {
    await api.authenticate();
    await api.call("/api/training/conversations", post({ scenarioId: "founder-no", language: "es" }));
    await settle();
    const events = api.usage.events.filter((event) => event.feature === "conversation");
    expect(events).toHaveLength(1);
    expect(events[0]!.ownerId).toBeTruthy();
    expect(events[0]!.costUsd).toBe(0.001);
  });

  it("gathers a rehearsal's calls under its session, so its cost is one sum", async () => {
    await api.authenticate();
    const sessionId = await completeInterview(api);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const calls = api.usage.events.filter((event) => event.sessionId === sessionId);
    // The opening turn, the answer's reply and the evaluation, at least.
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(new Set(calls.map((event) => event.feature))).toEqual(new Set(["interview"]));
    expect(new Set(calls.map((event) => event.ownerId)).size).toBe(1);
  });
});
