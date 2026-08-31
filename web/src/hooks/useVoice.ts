import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSpeechInput,
  createSpeechOutput,
  takeSpeakablePhrases,
} from "@/lib/voice";

/**
 * Wires microphone and speaker into the interview loop.
 *
 * The one rule that makes voice usable: the microphone is never open while the
 * interviewer is speaking. Otherwise the browser transcribes the synthesised
 * voice and feeds the interview its own words back.
 */
export function useVoice({
  enabled,
  onFinalAnswer,
}: {
  enabled: boolean;
  onFinalAnswer: (text: string) => void;
}) {
  const input = useMemo(() => createSpeechInput(), []);
  const output = useMemo(() => createSpeechOutput(), []);

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** True once the browser has refused to speak for lack of a user gesture. */
  const [blocked, setBlocked] = useState(false);

  /** Text streamed in but not yet handed to the speaker. */
  const pending = useRef("");
  /** Serializes utterances so phrases play in order, never on top of another. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  /**
   * How many phrases are queued or playing. Inferring "speaking" from
   * `speechSynthesis.speaking` flickers false between queued utterances, which
   * re-enabled the microphone mid-turn — exactly the echo case the mic guard
   * exists to prevent.
   */
  const outstanding = useRef(0);

  useEffect(() => {
    return () => {
      input.stop();
      output.cancel();
    };
  }, [input, output]);

  const enqueue = useCallback(
    (phrase: string) => {
      outstanding.current += 1;
      setSpeaking(true);
      queue.current = queue.current
        .then(() => output.speak(phrase))
        .then((result) => {
          if (result === "blocked") setBlocked(true);
          outstanding.current -= 1;
          // Only the last phrase in the queue clears the flag.
          if (outstanding.current === 0) setSpeaking(false);
        });
    },
    [output],
  );

  const startListening = useCallback(() => {
    if (!enabled || !input.supported || output.speaking) return;
    setError(null);
    setTranscript("");
    setListening(true);
    input.start({
      onInterim: setTranscript,
      onFinal: (text) => {
        setListening(false);
        if (text.trim() !== "") onFinalAnswer(text.trim());
      },
      onError: (message) => {
        setError(message);
        setListening(false);
      },
    });
  }, [enabled, input, output, onFinalAnswer]);

  const stopListening = useCallback(() => {
    input.stop();
    setListening(false);
  }, [input]);

  /** Feeds streamed text in; complete sentences are spoken as they form. */
  const speakStreamed = useCallback(
    (chunk: string) => {
      if (!enabled || !output.supported) return;
      pending.current += chunk;
      const { phrases, rest } = takeSpeakablePhrases(pending.current);
      pending.current = rest;
      for (const phrase of phrases) enqueue(phrase);
    },
    [enabled, output, enqueue],
  );

  /** Speaks whatever is left once the turn is complete. */
  const flushSpeech = useCallback(() => {
    if (!enabled || !output.supported) return;
    const remainder = pending.current.trim();
    pending.current = "";
    if (remainder !== "") enqueue(remainder);
  }, [enabled, output, enqueue]);

  /**
   * Speaks a full turn on demand. Called from a click, which is what clears
   * Chrome's autoplay block — the first turn streams in before the user has
   * touched anything on this screen, so it can never be spoken automatically.
   */
  const speakNow = useCallback(
    (text: string) => {
      if (!output.supported) return;
      setBlocked(false);
      const { phrases, rest } = takeSpeakablePhrases(text + " ");
      for (const phrase of phrases) enqueue(phrase);
      if (rest.trim() !== "") enqueue(rest.trim());
    },
    [output, enqueue],
  );

  const cancelSpeech = useCallback(() => {
    pending.current = "";
    queue.current = Promise.resolve();
    outstanding.current = 0;
    output.cancel();
    setSpeaking(false);
  }, [output]);

  return {
    /** Voice is only offered when both halves exist. */
    supported: input.supported && output.supported,
    inputSupported: input.supported,
    listening,
    speaking,
    transcript,
    error,
    blocked,
    startListening,
    stopListening,
    speakStreamed,
    speakNow,
    flushSpeech,
    cancelSpeech,
  };
}
