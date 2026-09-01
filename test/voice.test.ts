import { describe, expect, it } from "vitest";
import { liveQuery, readTranscript } from "../src/voice/deepgram.js";
import { CLOSE } from "../src/voice/gateway.js";

describe("liveQuery", () => {
  const params = new URLSearchParams(liveQuery());

  it("asks for interim results, which is what makes it feel live", () => {
    expect(params.get("interim_results")).toBe("true");
  });

  it("waits long enough for someone to think", () => {
    // Deepgram's default endpointing is 10ms, which cuts a candidate off
    // mid-sentence. Interviews are full of pauses for thinking.
    expect(Number(params.get("endpointing"))).toBeGreaterThanOrEqual(500);
  });

  it("marks utterance boundaries so an answer can be submitted on speech end", () => {
    expect(params.get("utterance_end_ms")).toBeTruthy();
  });
});

describe("readTranscript", () => {
  const results = (text: string, extra: Record<string, unknown> = {}) => ({
    type: "Results",
    channel: { alternatives: [{ transcript: text }] },
    ...extra,
  });

  it("reads an interim phrase", () => {
    expect(readTranscript(results("we cut the export"))).toEqual({
      text: "we cut the export",
      isFinal: false,
      speechFinal: false,
    });
  });

  it("carries the final and speech-final flags through", () => {
    expect(
      readTranscript(results("we shipped it", { is_final: true, speech_final: true })),
    ).toEqual({ text: "we shipped it", isFinal: true, speechFinal: true });
  });

  it("drops the empty interims that arrive between phrases", () => {
    // Forwarding these would blank the transcript on screen every time the
    // candidate paused for breath.
    expect(readTranscript(results(""))).toBeNull();
    expect(readTranscript(results("   "))).toBeNull();
  });

  it("treats an utterance end as a final boundary with no words", () => {
    expect(readTranscript({ type: "UtteranceEnd" })).toEqual({
      text: "",
      isFinal: true,
      speechFinal: true,
    });
  });

  it("ignores metadata and anything it does not recognise", () => {
    expect(readTranscript({ type: "Metadata", duration: 3 })).toBeNull();
    expect(readTranscript(null)).toBeNull();
    expect(readTranscript("not an object")).toBeNull();
    expect(readTranscript({ type: "SpeechStarted" })).toBeNull();
  });
});

describe("close codes", () => {
  it("keeps every code inside the private range clients may read", () => {
    // 4000-4999 is the range reserved for application use; anything lower is
    // rewritten by the WebSocket stack and the reason never reaches the client.
    for (const code of Object.values(CLOSE)) {
      expect(code).toBeGreaterThanOrEqual(4000);
      expect(code).toBeLessThanOrEqual(4999);
    }
  });

  it("distinguishes 'not configured' from 'it broke'", () => {
    // The client falls back silently on one and shows an error on the other.
    expect(CLOSE.UNAVAILABLE).not.toBe(CLOSE.UPSTREAM);
  });
});
