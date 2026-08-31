import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createSpeechInput } from "../src/lib/voice";

/**
 * Drives `createSpeechInput` through a fake SpeechRecognition, so the parts
 * that only run while someone is talking — interim vs final accumulation,
 * error mapping, stop semantics — are exercised without a microphone.
 */
class FakeRecognition {
  static last: FakeRecognition | null = null;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  started = false;
  stopCalls = 0;
  abortCalls = 0;

  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  constructor() {
    FakeRecognition.last = this;
  }

  start() {
    this.started = true;
  }
  stop() {
    this.stopCalls += 1;
  }
  abort() {
    this.abortCalls += 1;
  }

  /**
   * Emits a recognition event the way the browser does: `results` is the full
   * list so far, and `resultIndex` points at the first entry that changed.
   */
  private all: { transcript: string; isFinal: boolean }[] = [];

  emit(entries: { transcript: string; isFinal: boolean }[], resultIndex = 0) {
    this.all = [...this.all.slice(0, resultIndex), ...entries];
    const results = this.all.map((entry) => ({
      isFinal: entry.isFinal,
      length: 1,
      0: { transcript: entry.transcript },
    }));
    this.onresult?.({
      resultIndex,
      results: Object.assign(results, { length: results.length }),
    });
  }
}

const original = globalThis.window;

beforeEach(() => {
  FakeRecognition.last = null;
  (globalThis as { window?: unknown }).window = {
    SpeechRecognition: FakeRecognition,
  };
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = original;
});

describe("createSpeechInput", () => {
  it("reports unsupported when the browser has no recognition API", () => {
    (globalThis as { window?: unknown }).window = {};
    const input = createSpeechInput();
    expect(input.supported).toBe(false);
    // Calling into an unsupported input must be a no-op, not a crash.
    expect(() =>
      input.start({ onInterim: () => {}, onFinal: () => {}, onError: () => {} }),
    ).not.toThrow();
  });

  it("configures recognition for a candidate who pauses mid-answer", () => {
    const input = createSpeechInput("en-US");
    input.start({ onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    const recognition = FakeRecognition.last!;
    // Without continuous mode, recognition ends at the first silence and
    // truncates the answer.
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    expect(recognition.lang).toBe("en-US");
    expect(recognition.started).toBe(true);
  });

  it("shows interim words and replaces them as they settle", () => {
    const interim = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: interim, onFinal: () => {}, onError: () => {} });
    const recognition = FakeRecognition.last!;

    recognition.emit([{ transcript: "I led the", isFinal: false }]);
    expect(interim).toHaveBeenLastCalledWith("I led the");

    // The same phrase arrives again, refined — it must replace, not append.
    recognition.emit([{ transcript: "I led the redesign", isFinal: false }]);
    expect(interim).toHaveBeenLastCalledWith("I led the redesign");
  });

  it("keeps finalized text and appends later phrases to it", () => {
    const interim = vi.fn();
    const final = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: interim, onFinal: final, onError: () => {} });
    const recognition = FakeRecognition.last!;

    recognition.emit([{ transcript: "I led the redesign. ", isFinal: true }]);
    recognition.emit([{ transcript: "We cut drop-off", isFinal: false }], 1);
    expect(interim).toHaveBeenLastCalledWith("I led the redesign. We cut drop-off");

    recognition.emit([{ transcript: "We cut drop-off by half.", isFinal: true }], 1);
    recognition.onend?.();
    expect(final).toHaveBeenCalledWith(
      "I led the redesign. We cut drop-off by half.",
    );
  });

  it("does not submit an empty answer when nothing was heard", () => {
    const final = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: () => {}, onFinal: final, onError: () => {} });
    FakeRecognition.last!.onend?.();
    // onFinal still fires; the caller decides. It must be empty, not undefined.
    expect(final).toHaveBeenCalledWith("");
  });

  it("explains a blocked microphone but stays quiet about a pause", () => {
    const onError = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: () => {}, onFinal: () => {}, onError });
    const recognition = FakeRecognition.last!;

    // Silence and manual stops are normal; shouting about them would make the
    // UI look broken every time someone thinks for a moment.
    recognition.onerror?.({ error: "no-speech" });
    recognition.onerror?.({ error: "aborted" });
    expect(onError).not.toHaveBeenCalled();

    recognition.onerror?.({ error: "not-allowed" });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/Microphone access/));

    recognition.onerror?.({ error: "audio-capture" });
    expect(onError).toHaveBeenLastCalledWith(expect.stringMatching(/No microphone/));
  });

  it("does not duplicate a final phrase that is delivered twice", () => {
    const interim = vi.fn();
    const final = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: interim, onFinal: final, onError: () => {} });
    const recognition = FakeRecognition.last!;

    recognition.emit([{ transcript: "I led the redesign.", isFinal: true }]);
    // Chrome re-sends the whole results list; index 0 is already final and
    // must not be counted a second time.
    recognition.emit(
      [
        { transcript: "I led the redesign.", isFinal: true },
        { transcript: " We cut drop-off.", isFinal: true },
      ],
      0,
    );
    recognition.onend?.();
    expect(final).toHaveBeenCalledWith("I led the redesign. We cut drop-off.");
  });

  it("stops rather than aborts, so the last words are not discarded", () => {
    const input = createSpeechInput();
    input.start({ onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    input.stop();
    expect(FakeRecognition.last!.stopCalls).toBe(1);
    expect(FakeRecognition.last!.abortCalls).toBe(0);
  });

  it("ignores a second start while already listening", () => {
    const input = createSpeechInput();
    input.start({ onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    const first = FakeRecognition.last;
    input.start({ onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    // A second instance would leave two recognizers competing for the mic.
    expect(FakeRecognition.last).toBe(first);
  });

  it("clears the previous transcript when a new turn starts", () => {
    const interim = vi.fn();
    const input = createSpeechInput();
    input.start({ onInterim: interim, onFinal: () => {}, onError: () => {} });
    FakeRecognition.last!.emit([{ transcript: "first answer", isFinal: true }]);
    FakeRecognition.last!.onend?.();

    input.start({ onInterim: interim, onFinal: () => {}, onError: () => {} });
    FakeRecognition.last!.emit([{ transcript: "second", isFinal: false }]);
    // Leaking the previous answer into the next turn would send the wrong text.
    expect(interim).toHaveBeenLastCalledWith("second");
  });
});
