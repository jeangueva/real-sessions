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

import { meterFromElement, UNMEASURED } from "./audio-level";
import type { LevelMeter } from "./audio-level";

export interface SpeechInput {
  readonly supported: boolean;
  /**
   * Loudness of what the microphone is hearing. `UNMEASURED` until listening
   * starts, and for implementations with no audio node to tap.
   */
  readonly meter?: LevelMeter;
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
   * Loudness of the voice coming out. `UNMEASURED` for the browser
   * synthesiser, which exposes no audio node to attach to.
   */
  readonly meter?: LevelMeter;
  /**
   * Speaks a phrase. Resolves with `"blocked"` when the browser refused for
   * lack of a user gesture, `"error"` for anything else, `"ok"` otherwise.
   * It never rejects: one failed phrase must not break the queue behind it.
   */
  speak(text: string): Promise<"ok" | "blocked" | "error">;
  /**
   * Optional hint that `text` will be spoken soon. Implementations that fetch
   * audio use it to overlap the network with the phrase already playing; the
   * browser synthesiser has nothing to prefetch and does not implement it.
   */
  prime?(text: string): void;
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
      meter: UNMEASURED,
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
    // Chrome's SpeechRecognition owns the microphone internally and hands out
    // no stream, so there is nothing here to measure.
    meter: UNMEASURED,
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

/**
 * Voices that are jokes, not people.
 *
 * macOS ships a couple of dozen novelty voices — Zarvox, Bubbles, Bad News —
 * in the same list as Samantha and Daniel, and they sort near the top
 * alphabetically. Without this the last-resort `pool[0]` picks "Albert", and a
 * candidate rehearsing for a job interview gets a cartoon frog. Matched as
 * substrings, and against the localised names Chrome reports, because macOS
 * translates them.
 */
const NOVELTY = [
  "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos",
  "good news", "jester", "junior", "kathy", "organ", "superstar", "trinoids",
  "whisper", "wobble", "zarvox", "ralph", "fred",
  // Spanish-localised names, as reported by Chrome on a Spanish system.
  "malas noticias", "buenas noticias", "burbujas", "campanas", "bufón",
  "órgano", "violonchelos", "superestrella", "susurro",
];

function isNovelty(name: string): boolean {
  const lower = name.toLowerCase();
  return NOVELTY.some((bad) => lower.includes(bad));
}

export function createSpeechOutput(
  lang = "en-US",
  profile: VoiceProfile = NEUTRAL_VOICE,
): SpeechOutput {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

  if (!synth) {
    return {
      supported: false,
      speaking: false,
      meter: UNMEASURED,
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
    const candidates = english.length > 0 ? english : voices;
    // Novelty voices are dropped before anything else looks at the list, so
    // neither a persona preference nor the last-resort pick can reach one.
    const serious = candidates.filter((voice) => !isNovelty(voice.name));
    const pool = serious.length > 0 ? serious : candidates;

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
    // `speechSynthesis` renders straight to the output device; there is no
    // node to attach an analyser to.
    meter: UNMEASURED,
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

/* -------------------------------------------------------------------------
 * Aura — the interviewer's real voice.
 * ---------------------------------------------------------------------- */

/**
 * Speaks through the server's Deepgram proxy, falling back to the browser.
 *
 * The fallback is permanent once it triggers, and that is deliberate. If the
 * provider is down, retrying every sentence turns the interview into a series
 * of two-second silences; switching once and staying switched keeps the
 * conversation moving with a worse voice, which is the better failure.
 *
 * The first phrase of a turn costs a round trip (~500ms to first byte). Every
 * phrase after it is fetched while the previous one is still playing, so the
 * gap between sentences is the network only when the model out-writes the
 * speaker — which it does not, at 40 words a turn.
 */
export function createAuraOutput(
  personaId: string,
  fallbackProfile: VoiceProfile = NEUTRAL_VOICE,
  lang = "en-US",
  /** Which language to speak. The server owns the voice it maps to. */
  language = "en",
): SpeechOutput {
  const fallback = createSpeechOutput(lang, fallbackProfile);
  let degraded = false;

  /**
   * Phrases already being fetched, keyed by their text so `prime` and `speak`
   * share one request. Bounded: a turn is under 40 words, so more than three
   * outstanding means something is wrong, and an unbounded map here would let a
   * runaway stream fire a request per sentence.
   */
  const inflight = new Map<string, Promise<Blob | null>>();
  const MAX_PREFETCH = 3;
  let current: HTMLAudioElement | null = null;
  let playing = false;
  /**
   * The meter for the phrase in the air. Rebuilt per element, because
   * `createMediaElementSource` accepts a given element exactly once and this
   * output creates one per sentence.
   */
  let live: LevelMeter = UNMEASURED;

  const fetchAudio = async (text: string): Promise<Blob | null> => {
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text, personaId, language }),
      });
      if (!response.ok) return null;
      return await response.blob();
    } catch {
      return null;
    }
  };

  const take = (text: string): Promise<Blob | null> => {
    const pending = inflight.get(text);
    if (pending) {
      inflight.delete(text);
      return pending;
    }
    return fetchAudio(text);
  };

  const play = (blob: Blob): Promise<"ok" | "blocked" | "error"> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      current = audio;
      playing = true;
      live.stop();
      live = UNMEASURED;
      // Attached on `playing`, not before it. `captureStream` hands back a
      // stream with no audio track until the element is actually playing, so
      // metering at construction time silently produces a dead meter.
      audio.onplaying = () => {
        if (current !== audio) return;
        live.stop();
        live = meterFromElement(audio);
      };

      const done = (result: "ok" | "blocked" | "error") => {
        URL.revokeObjectURL(url);
        if (current === audio) {
          current = null;
          playing = false;
          live.stop();
          live = UNMEASURED;
        }
        resolve(result);
      };

      audio.onended = () => done("ok");
      audio.onerror = () => done("error");
      // Autoplay is refused until the page has had a trusted user gesture,
      // exactly as `speechSynthesis` is — reported, never swallowed, because a
      // silent interviewer looks like a broken product.
      audio.play().catch(() => done("blocked"));
    });

  return {
    supported: true,
    get speaking() {
      return degraded ? fallback.speaking : playing;
    },
    get meter() {
      // Once degraded the browser synthesiser is talking, and it cannot be
      // measured — so the caller is told, rather than shown a dead meter.
      return degraded ? UNMEASURED : live;
    },

    /** Starts fetching a phrase that is not its turn to play yet. */
    prime(text: string) {
      if (degraded) return;
      const trimmed = text.trim();
      if (trimmed === "") return;
      if (inflight.has(trimmed) || inflight.size >= MAX_PREFETCH) return;
      inflight.set(trimmed, fetchAudio(trimmed));
    },

    async speak(text) {
      const trimmed = text.trim();
      if (trimmed === "") return "ok";
      if (degraded) return fallback.speak(trimmed);

      const blob = await take(trimmed);
      if (!blob || blob.size === 0) {
        // One failure is enough: from here on this session uses the browser.
        degraded = true;
        return fallback.speak(trimmed);
      }

      const result = await play(blob);
      // "blocked" is the browser's autoplay policy, not the provider — falling
      // back would hit the same wall, so it is reported as-is.
      if (result === "error") {
        degraded = true;
        return fallback.speak(trimmed);
      }
      return result;
    },

    cancel() {
      inflight.clear();
      if (current) {
        current.pause();
        current = null;
      }
      live.stop();
      live = UNMEASURED;
      playing = false;
      fallback.cancel();
    },
  };
}
