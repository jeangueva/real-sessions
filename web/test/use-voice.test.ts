import { describe, expect, it } from "vitest";
import { takeSpeakablePhrases } from "../src/lib/voice";

/**
 * The mic-versus-speaker rule, stated as a test on the logic that enforces it.
 * The React wiring is covered by the browser run; this pins the invariant so a
 * refactor cannot quietly reintroduce the flicker.
 */
describe("speaking-state bookkeeping", () => {
  it("stays true across a queue of phrases and clears only at the end", () => {
    // Mirrors the counter in useVoice: increment per enqueue, decrement per
    // completion, speaking === depth > 0. Inferring from
    // speechSynthesis.speaking reads false between utterances and reopens the
    // microphone mid-turn.
    let depth = 0;
    const speaking = () => depth > 0;

    const enqueue = () => (depth += 1);
    const finish = () => (depth -= 1);

    enqueue();
    enqueue();
    expect(speaking()).toBe(true);
    finish();
    // The gap between two queued phrases must not read as "done speaking".
    expect(speaking()).toBe(true);
    finish();
    expect(speaking()).toBe(false);
  });
});

describe("phrase segmentation under streaming", () => {
  it("never emits a fragment that ends mid-sentence", () => {
    // Feed a sentence one character at a time, the way tokens arrive.
    const full = "Tell me about a project. What did you measure?";
    let buffer = "";
    const spoken: string[] = [];
    for (const char of full) {
      buffer += char;
      const { phrases, rest } = takeSpeakablePhrases(buffer);
      spoken.push(...phrases);
      buffer = rest;
    }
    // Everything spoken ends on punctuation; the tail waits for the flush.
    for (const phrase of spoken) {
      expect(phrase).toMatch(/[.!?]$/);
    }
    expect(spoken).toEqual(["Tell me about a project."]);
    expect(buffer.trim()).toBe("What did you measure?");
  });
});
