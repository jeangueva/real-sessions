/**
 * Voice I/O for the interview.
 *
 * Built on the browser's own speech APIs: they work today with no extra
 * vendor, no new key, and no server round trip. Both sit behind interfaces so
 * a cloud provider (Deepgram, ElevenLabs, Gemini Live) can replace either half
 * without the interview screen changing.
 *
 * Two facts worth knowing before shipping this:
 *  - Chrome's SpeechRecognition uploads audio to Google's servers. For a
 *    product recording job-interview practice that is a privacy disclosure,
 *    not an implementation detail.
 *  - Firefox does not implement SpeechRecognition at all, so typing has to
 *    remain a first-class path rather than a fallback nobody maintains.
 */

export interface SpeechInput {
  readonly supported: boolean;
  /** Begins listening. `onInterim` fires as words are recognised. */
  start(handlers: {
    onInterim: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
  }): void;
  stop(): void;
  readonly listening: boolean;
}

export interface SpeechOutput {
  readonly supported: boolean;
  /**
   * Speaks a phrase. Resolves with `"blocked"` when the browser refused for
   * lack of a user gesture, `"error"` for anything else, `"ok"` otherwise.
   * It never rejects: one failed phrase must not break the queue behind it.
   */
  speak(text: string): Promise<"ok" | "blocked" | "error">;
  cancel(): void;
  readonly speaking: boolean;
}

/* -------------------------------------------------------------------------
 * Minimal typings — the Web Speech API is not in TypeScript's DOM library.
 * ---------------------------------------------------------------------- */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { readonly length: number; [index: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser to speak.",
  "service-not-allowed": "Microphone access was blocked by your browser settings.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition lost its network connection.",
  aborted: "",
  "no-speech": "",
};

export function createSpeechInput(lang = "en-US"): SpeechInput {
  const Constructor = recognitionConstructor();

  if (!Constructor) {
    return {
      supported: false,
      listening: false,
      start: () => undefined,
      stop: () => undefined,
    };
  }

  let recognition: SpeechRecognitionLike | null = null;
  let listening = false;
  /**
   * Finalized phrases keyed by their index in the results list.
   *
   * A plain string accumulator looks simpler but double-counts: the browser
   * sends the full results array on every event, and a result that is already
   * final can appear again inside a later event's range. Appending blindly
   * duplicates it, which only shows up once someone talks for a while.
   */
  let settled = new Map<number, string>();

  const settledText = (): string =>
    [...settled.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, text]) => text)
      .join("");

  return {
    supported: true,
    get listening() {
      return listening;
    },

    start(handlers) {
      if (listening) return;
      settled = new Map();

      const instance = new Constructor();
      instance.lang = lang;
      // Candidates pause mid-answer; without continuous mode recognition ends
      // at the first silence and truncates them.
      instance.continuous = true;
      instance.interimResults = true;
      instance.maxAlternatives = 1;

      instance.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]!;
          const text = result[0]?.transcript ?? "";
          // Keyed by index, so a re-delivered final phrase overwrites rather
          // than appending a second copy.
          if (result.isFinal) settled.set(i, text);
          else interim += text;
        }
        handlers.onInterim((settledText() + interim).trim());
      };

      instance.onerror = (event) => {
        // "no-speech" and "aborted" are normal; surfacing them as errors would
        // make the UI shout at someone who simply paused.
        const message = ERROR_MESSAGES[event.error] ?? "Speech recognition failed.";
        if (message) handlers.onError(message);
      };

      instance.onend = () => {
        listening = false;
        handlers.onFinal(settledText().trim());
      };

      recognition = instance;
      listening = true;
      instance.start();
    },

    stop() {
      // stop() lets the final result arrive; abort() would discard it.
      recognition?.stop();
      listening = false;
    },
  };
}

/**
 * How an interviewer sounds. Mirrors `PersonaVoice` on the server, which is the
 * source of truth — these values arrive with the session rather than being
 * duplicated here.
 */
export interface VoiceProfile {
  rate: number;
  pitch: number;
  /** Voice-name substrings to try, in order, before falling back. */
  prefer: string[];
}

/** Used until a session reports its interviewer's profile. */
export const NEUTRAL_VOICE: VoiceProfile = { rate: 0.96, pitch: 1, prefer: [] };

export function createSpeechOutput(
  lang = "en-US",
  profile: VoiceProfile = NEUTRAL_VOICE,
): SpeechOutput {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

  if (!synth) {
    return {
      supported: false,
      speaking: false,
      speak: async () => "error" as const,
      cancel: () => undefined,
    };
  }

  /**
   * The voice list loads asynchronously and is empty on first call in most
   * browsers, so it is resolved lazily rather than captured at module load.
   */
  const pickVoice = (): SpeechSynthesisVoice | null => {
    const voices = synth.getVoices();
    if (voices.length === 0) return null;
    const english = voices.filter((voice) =>
      voice.lang.startsWith(lang.split("-")[0]!),
    );
    const pool = english.length > 0 ? english : voices;

    // The persona's preferred names first. Installed voices differ by OS,
    // browser and language pack, so this is a preference and never a
    // requirement — an unmatched persona still sounds distinct, because rate
    // and pitch apply to whatever voice is found.
    for (const wanted of profile.prefer) {
      const match = pool.find((voice) =>
        voice.name.toLowerCase().includes(wanted.toLowerCase()),
      );
      if (match) return match;
    }

    return (
      pool.find((voice) => voice.lang === lang && voice.localService) ??
      pool.find((voice) => voice.lang === lang) ??
      pool[0] ??
      null
    );
  };

  return {
    supported: true,
    get speaking() {
      return synth.speaking;
    },

    speak(text) {
      const trimmed = text.trim();
      if (trimmed === "") return Promise.resolve("ok" as const);

      return new Promise<"ok" | "blocked" | "error">((resolve) => {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.lang = lang;
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        // The archetype's own delivery. Clamped because the browser silently
        // ignores an out-of-range rate rather than clipping it, which would
        // drop the persona back to default without saying so.
        utterance.rate = Math.min(1.4, Math.max(0.6, profile.rate));
        utterance.pitch = Math.min(1.4, Math.max(0.6, profile.pitch));

        // Resolve on every outcome — a rejection here would break the queue
        // for every later phrase. But "not-allowed" must be reported, not
        // swallowed: Chrome refuses to speak until the page has had a trusted
        // user gesture, and silent failure looks like a broken product.
        utterance.onend = () => resolve("ok");
        utterance.onerror = (event) =>
          resolve(
            (event as SpeechSynthesisErrorEvent).error === "not-allowed"
              ? "blocked"
              : "error",
          );

        synth.speak(utterance);
      });
    },

    cancel() {
      synth.cancel();
    },
  };
}

/**
 * Splits streamed text into speakable phrases at sentence boundaries.
 *
 * Speaking each token as it arrives sounds like stuttering; waiting for the
 * whole turn throws away the streaming latency win. Sentences are the unit
 * that sounds natural and still starts early.
 *
 * Returns complete phrases and the unspoken remainder.
 */
export function takeSpeakablePhrases(buffer: string): {
  phrases: string[];
  rest: string;
} {
  const phrases: string[] = [];
  let rest = buffer;

  for (;;) {
    // A boundary needs punctuation followed by whitespace, so decimals and
    // abbreviations mid-sentence do not split a phrase in half.
    const match = rest.match(/^([\s\S]*?[.!?])(\s+)/);
    if (!match) break;
    const phrase = match[1]!.trim();
    if (phrase !== "") phrases.push(phrase);
    rest = rest.slice(match[0].length);
  }

  return { phrases, rest };
}
