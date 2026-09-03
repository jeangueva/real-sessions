import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createAuraOutput,
  createSpeechInput,
  createSpeechOutput,
  takeSpeakablePhrases,
  NEUTRAL_VOICE,
} from "@/lib/voice";
import type { VoiceProfile } from "@/lib/voice";
import { createDeepgramInput, deepgramInputSupported } from "@/lib/deepgram-input";
import { fetchVoiceConfig } from "@/lib/api";

/**
 * Wires microphone and speaker into the interview loop.
 *
 * The one rule that makes voice usable: the microphone is never open while the
 * interviewer is speaking. Otherwise the browser transcribes the synthesised
 * voice and feeds the interview its own words back.
 */
/**
 * Timings for one exchange, in milliseconds from the start of the session.
 *
 * The clock lives here because this hook holds the only facts that matter:
 * when the synthesised voice actually stopped, and when the microphone opened
 * and closed. The server's generation timings measure something else, and the
 * difference is the candidate's thinking time — the thing being measured.
 */
export interface SpeechTimings {
  interviewerEndedMs: number | null;
  answerStartedMs: number | null;
  answerEndedMs: number | null;
}

export function useVoice({
  enabled,
  onFinalAnswer,
  sessionStartedAt,
  voiceProfile = NEUTRAL_VOICE,
  personaId = "",
}: {
  enabled: boolean;
  onFinalAnswer: (text: string) => void;
  /** Epoch ms the session began. All timings are offsets from this. */
  sessionStartedAt: number;
  /**
   * The interviewer archetype's delivery through the browser synthesiser.
   * Only reached when the server has no Deepgram key.
   */
  voiceProfile?: VoiceProfile;
  /**
   * Which interviewer is speaking. Sent to the server, which owns the mapping
   * from a person to a voice — the client never names a model.
   */
  personaId?: string;
}) {
  /**
   * Null until the server has said whether live transcription is configured.
   * Deciding before that would either open a socket that gets refused, or fall
   * back to the browser when a better option was available.
   */
  const [live, setLive] = useState<boolean | null>(null);
  /** Whether the interviewer speaks with a real voice or the browser's. */
  const [aura, setAura] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVoiceConfig()
      .then((config) => {
        if (cancelled) return;
        setLive(config.live && deepgramInputSupported());
        setAura(config.speech);
      })
      // A failure here means browser speech, which is the safe default.
      .catch(() => {
        if (!cancelled) setLive(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const input = useMemo(
    () => (live ? createDeepgramInput() : createSpeechInput()),
    [live],
  );
  // Rebuilt when the profile changes, which happens once — when the session
  // reports which interviewer it gave you.
  const output = useMemo(
    () =>
      aura
        ? createAuraOutput(personaId, voiceProfile)
        : createSpeechOutput("en-US", voiceProfile),
    [
      aura,
      personaId,
      voiceProfile.rate,
      voiceProfile.pitch,
      voiceProfile.prefer.join(","),
    ],
  );

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
  /**
   * Marks for the exchange in progress. A ref rather than state: nothing
   * renders from these, and making them state would re-render the screen on
   * every microphone event for no visible reason.
   */
  const marks = useRef<SpeechTimings>({
    interviewerEndedMs: null,
    answerStartedMs: null,
    answerEndedMs: null,
  });
  const since = useCallback(
    () => Math.max(0, Date.now() - sessionStartedAt),
    [sessionStartedAt],
  );

  useEffect(() => {
    return () => {
      input.stop();
      output.cancel();
    };
  }, [input, output]);

  const enqueue = useCallback(
    (phrase: string) => {
      // A phrase queued behind another is fetched now rather than when its
      // turn comes, so the round trip overlaps with the sentence still
      // playing. Without this every sentence boundary is a half-second gap.
      if (outstanding.current > 0) output.prime?.(phrase);
      outstanding.current += 1;
      setSpeaking(true);
      queue.current = queue.current
        .then(() => output.speak(phrase))
        .then((result) => {
          if (result === "blocked") setBlocked(true);
          outstanding.current -= 1;
          // Only the last phrase in the queue clears the flag.
          if (outstanding.current === 0) {
            setSpeaking(false);
            // The interviewer has stopped talking. Everything after this is
            // the candidate's own time.
            marks.current.interviewerEndedMs = since();
          }
        });
    },
    [output],
  );

  const startListening = useCallback(() => {
    if (!enabled || !input.supported || output.speaking) return;
    setError(null);
    setTranscript("");
    setListening(true);
    marks.current.answerStartedMs = since();
    marks.current.answerEndedMs = null;
    input.start({
      onInterim: setTranscript,
      onFinal: (text) => {
        setListening(false);
        marks.current.answerEndedMs = since();
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
    // Recognition may deliver its final result after this, but the candidate
    // stopped speaking now. Only set it if the callback has not already.
    if (marks.current.answerEndedMs === null) marks.current.answerEndedMs = since();
  }, [input, since]);

  /**
   * Hands over the marks for the exchange just finished and clears them.
   *
   * Consuming rather than reading is deliberate: a stale mark reused on the
   * next turn would record a duration that never happened, and a wrong timing
   * is worse than a missing one — the missing one drops out of the metric, the
   * wrong one skews every trend built on it.
   */
  const takeTimings = useCallback((): SpeechTimings => {
    const taken = { ...marks.current };
    marks.current = {
      interviewerEndedMs: null,
      answerStartedMs: null,
      answerEndedMs: null,
    };
    return taken;
  }, []);

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
    takeTimings,
  };
}
