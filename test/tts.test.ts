import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import process from "node:process";
import {
  AURA_VOICES,
  MAX_SPEECH_CHARS,
  SpeechError,
  synthesize,
  ttsConfigured,
} from "../src/voice/tts.js";
import { PERSONAS } from "../src/personas.js";

/**
 * The interviewer's voice.
 *
 * The tests that matter here are the ones about what leaves the server: that
 * the key is required, that only a listed voice can be requested, and that a
 * failure is a failure rather than silence — the client's fallback only works
 * if this half is honest about breaking.
 */

const KEY = process.env.DEEPGRAM_API_KEY;
const realFetch = globalThis.fetch;

beforeEach(() => {
  process.env.DEEPGRAM_API_KEY = "test-key";
});

afterEach(() => {
  if (KEY === undefined) delete process.env.DEEPGRAM_API_KEY;
  else process.env.DEEPGRAM_API_KEY = KEY;
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

/** Stands in for Deepgram. Returns MP3-shaped bytes, not real audio. */
function stubDeepgram(
  response: { ok: boolean; status?: number; body?: Uint8Array; text?: string } = {
    ok: true,
  },
) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      arrayBuffer: async () => (response.body ?? new Uint8Array([1, 2, 3])).buffer,
      text: async () => response.text ?? "",
    };
  }) as unknown as typeof fetch;
  return calls;
}

describe("every persona", () => {
  it("names a voice that exists", () => {
    // A typo here is invisible until an interview starts and the interviewer
    // is silent, so it is checked at build time instead.
    for (const persona of PERSONAS) {
      expect(AURA_VOICES.has(persona.voice.model), persona.id).toBe(true);
    }
  });

  it("has a distinct voice from every other persona", () => {
    // Two archetypes sharing a voice is the failure the whole roster exists to
    // avoid — the same person in a different mood.
    const models = PERSONAS.map((persona) => persona.voice.model);
    expect(new Set(models).size).toBe(models.length);
  });

  it("carries a browser fallback for when Deepgram is not configured", () => {
    for (const persona of PERSONAS) {
      expect(persona.voice.fallback.rate).toBeGreaterThan(0.6);
      expect(persona.voice.fallback.rate).toBeLessThan(1.4);
      expect(persona.voice.fallback.prefer.length).toBeGreaterThan(0);
    }
  });
});

describe("ttsConfigured", () => {
  it("follows the Deepgram key", () => {
    expect(ttsConfigured()).toBe(true);
    delete process.env.DEEPGRAM_API_KEY;
    expect(ttsConfigured()).toBe(false);
  });
});

describe("synthesize", () => {
  it("returns the audio Deepgram sends back", async () => {
    stubDeepgram({ ok: true, body: new Uint8Array([9, 9, 9, 9]) });
    const audio = await synthesize("Tell me about a tradeoff.", "aura-2-thalia-en");
    expect(audio).toEqual(new Uint8Array([9, 9, 9, 9]));
  });

  it("sends the text as JSON and the voice in the query", async () => {
    const calls = stubDeepgram();
    await synthesize("Hello.", "aura-2-draco-en");
    expect(calls[0]!.url).toContain("model=aura-2-draco-en");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ text: "Hello." });
  });

  it("refuses a voice that is not on the allowlist", async () => {
    const calls = stubDeepgram();
    // The rejection happens before the request, so a caller cannot steer the
    // account's key at an arbitrary model.
    await expect(synthesize("Hello.", "aura-2-nonexistent-en")).rejects.toThrow(
      SpeechError,
    );
    expect(calls).toHaveLength(0);
  });

  it("refuses without a key rather than calling unauthenticated", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const calls = stubDeepgram();
    await expect(synthesize("Hello.", "aura-2-thalia-en")).rejects.toThrow(
      "not configured",
    );
    expect(calls).toHaveLength(0);
  });

  it("refuses empty text", async () => {
    await expect(synthesize("   ", "aura-2-thalia-en")).rejects.toThrow(SpeechError);
  });

  it("refuses a phrase past the cap", async () => {
    const calls = stubDeepgram();
    await expect(
      synthesize("a".repeat(MAX_SPEECH_CHARS + 1), "aura-2-thalia-en"),
    ).rejects.toThrow("too long");
    expect(calls).toHaveLength(0);
  });

  it("reports a provider failure with its status", async () => {
    stubDeepgram({ ok: false, status: 401, text: "invalid credentials" });
    await expect(
      synthesize("Hello.", "aura-2-thalia-en"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("gives up rather than leaving the interview waiting", async () => {
    // A turn that arrives late is worse than one that never arrives: the
    // client can fall back, but it cannot rewind the conversation.
    globalThis.fetch = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      })) as unknown as typeof fetch;

    await expect(synthesize("Hello.", "aura-2-thalia-en", 20)).rejects.toThrow(
      "timed out",
    );
  });
});
