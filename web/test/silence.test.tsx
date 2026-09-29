import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useVoice } from "../src/hooks/useVoice";

/**
 * Ending a turn on a pause, the way the other end of a real call would.
 *
 * Recognition runs `continuous`, so it never ends by itself: the turn used to
 * close only when the candidate pressed a button, which is nothing like the
 * interview being rehearsed. These tests pin the two judgements that make
 * that safe — it waits for a real pause, and it never answers someone who has
 * not spoken.
 *
 * Driven through a stub of the browser's own recognition, because the hook
 * builds its input itself: a seam added purely to make this testable would be
 * a worse design than reaching for the API the hook actually depends on.
 */
class FakeRecognition {
  static live: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  lang = "";
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  stops = 0;

  constructor() {
    FakeRecognition.live = this;
  }
  start() {}
  stop() {
    this.stops += 1;
    this.onend?.();
  }
  abort() {}

  /** One interim result, the way Chrome delivers a phrase in progress. */
  hear(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript: text }], { isFinal: false })],
    });
  }
}

function listen(onFinalAnswer = vi.fn()) {
  const view = renderHook(() =>
    useVoice({ enabled: true, onFinalAnswer, sessionStartedAt: Date.now() }),
  );
  act(() => view.result.current.startListening());
  return { ...view, said: onFinalAnswer, machine: () => FakeRecognition.live! };
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeRecognition.live = null;
  vi.stubGlobal("SpeechRecognition", FakeRecognition);
  vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
  vi.stubGlobal("speechSynthesis", {
    speaking: false,
    getVoices: () => [],
    cancel: () => undefined,
    speak: () => undefined,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("a pause ends the turn", () => {
  it("waits for a real pause before answering", () => {
    const { machine } = listen();
    act(() => machine().hear("I led the payments redesign"));

    act(() => void vi.advanceTimersByTime(1500));
    expect(machine().stops).toBe(0);

    act(() => void vi.advanceTimersByTime(600));
    expect(machine().stops).toBe(1);
  });

  it("restarts the clock on every word, so thinking is not a full stop", () => {
    const { machine } = listen();
    // Someone hunting for a word in a language they are still learning.
    for (const said of ["I led", "I led the payments", "I led the payments redesign"]) {
      act(() => machine().hear(said));
      act(() => void vi.advanceTimersByTime(1800));
    }
    expect(machine().stops).toBe(0);

    act(() => void vi.advanceTimersByTime(2000));
    expect(machine().stops).toBe(1);
  });

  it("never answers someone who has not spoken", () => {
    const { machine, said } = listen();
    // Gathering their thoughts before the first word. Arming here would have
    // the interviewer reply to silence.
    act(() => void vi.advanceTimersByTime(10_000));
    expect(machine().stops).toBe(0);
    expect(said).not.toHaveBeenCalled();
  });

  it("drops the pending timer when the turn is ended by hand", () => {
    const { result, machine } = listen();
    act(() => machine().hear("something"));
    act(() => result.current.stopListening());
    const after = machine().stops;
    act(() => void vi.advanceTimersByTime(5000));
    expect(machine().stops).toBe(after);
  });
});
