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

import { feedJuryBus, meterFromElement, UNMEASURED } from "./audio-level";
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
 * The thesis panel: three jurors, three voices.
 *
 * The panel's turns open with a tag naming who speaks — [[presidente]],
 * [[metodologo]], [[especialista]] — and a turn can pass the floor midway.
 * Every phrase sent to an output carries the tag of the juror speaking it;
 * the output picks the voice from it and never says it aloud.
 * ---------------------------------------------------------------------- */

export const JURORS = {
  presidente: { personaId: "measured", name: "Dr. Ramírez" },
  metodologo: { personaId: "skeptic", name: "Dra. Vidal" },
  especialista: { personaId: "systems", name: "Dr. Paredes" },
} as const;
export type JurorTag = keyof typeof JURORS;

const JUROR_ORDER: JurorTag[] = ["presidente", "metodologo", "especialista"];
/**
 * Subtle, human-like pace and pitch per juror for the browser synthesiser.
 * Kept close to 1.0 so no voice sounds artificially sped up or pitch-shifted.
 */
const JUROR_DELIVERY: Record<JurorTag, { rate: number; pitch: number; prefer: string[] }> = {
  presidente: {
    rate: 0.96,
    pitch: 0.96,
    prefer: ["jorge", "diego", "carlos", "juan", "alvaro", "alonso", "pablo", "andres", "google español de estados unidos", "reed", "daniel"],
  },
  metodologo: {
    rate: 1.0,
    pitch: 1.04,
    prefer: ["paulina", "monica", "mónica", "angelica", "angélica", "sabina", "helena", "francisca", "carmen", "paloma", "luciana", "google español", "samantha", "karen"],
  },
  especialista: {
    rate: 0.99,
    pitch: 1.0,
    prefer: ["juan", "alberto", "raul", "raúl", "diego", "jorge", "felipe", "ricardo", "thomas", "aaron"],
  },
};

const TAG = /\[\[(presidente|metodologo|especialista)\]\]/g;
const LEADING_TAG = /^\s*\[\[(presidente|metodologo|especialista)\]\]\s*/;

/** The juror a phrase opens with, if it names one, and the words without tags. */
export function splitJuror(phrase: string): { juror: JurorTag | null; text: string } {
  const match = phrase.match(LEADING_TAG);
  return {
    juror: (match?.[1] as JurorTag | undefined) ?? null,
    text: phrase.replace(TAG, " ").replace(/\s+/g, " ").trim(),
  };
}

/** Tags turned into names, for the screen: "Dra. Vidal: Bachiller, …". */
export function showJurors(text: string, names?: Partial<Record<JurorTag, string>>): string {
  const name = (tag: string) => names?.[tag as JurorTag] ?? JURORS[tag as JurorTag]?.name ?? "";
  return text
    .replace(/^\s*\[\[(\w+)\]\]\s*/, (_, tag: string) => `${name(tag)}: `)
    .replace(/\s*\[\[(\w+)\]\]\s*/g, (_, tag: string) => `\n\n${name(tag)}: `)
    // A tag still arriving in the stream, cut off mid-word.
    .replace(/\[\[\w*\]?$/, "")
    .trim();
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

function voiceQualityScore(voice: SpeechSynthesisVoice, targetLang: string): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (voice.lang.toLowerCase() === targetLang.toLowerCase()) score += 15;
  else if (voice.lang.toLowerCase().startsWith(targetLang.split("-")[0]!.toLowerCase())) score += 8;
  // Prefer neural/natural/premium voices over flat legacy robotic voices.
  if (name.includes("natural") || name.includes("neural") || name.includes("online")) score += 30;
  if (name.includes("premium") || name.includes("enhanced") || name.includes("siri")) score += 25;
  if (name.includes("google")) score += 18;
  if (name.includes("espeak") || name.includes("compact")) score -= 25;
  return score;
}

/**
 * Unlocks both the Web Audio graph and the browser's `speechSynthesis` engine
 * inside a synchronous user click handler before navigating to `/app/session`.
 *
 * Chrome and Safari frequently drop or refuse the first utterance when it
 * arrives asynchronously from an SSE stream hundreds of milliseconds after
 * navigation. Speaking a zero-volume space during the button click satisfies
 * the browser's user-activation check for the whole session.
 */
export function primeVoiceUnlock(): void {
  if (typeof window === "undefined") return;
  try {
    const synth = window.speechSynthesis;
    if (synth) {
      if (synth.paused) synth.resume();
      // Trigger lazy voice loading early so `getVoices()` is populated by the
      // time the first streamed sentence arrives.
      synth.getVoices();
      if (!synth.speaking) {
        const silent = new SpeechSynthesisUtterance(" ");
        silent.volume = 0;
        silent.rate = 2;
        synth.speak(silent);
      }
    }
  } catch {
    // Ignore environments without Web Speech synthesis.
  }
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
  const pickVoice = (juror: JurorTag | null = null): SpeechSynthesisVoice | null => {
    const voices = synth.getVoices();
    if (voices.length === 0) return null;
    const primary = lang.split("-")[0]!.toLowerCase();
    const matchingLang = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(primary),
    );
    const candidates = matchingLang.length > 0 ? matchingLang : voices;
    // Novelty voices are dropped before anything else looks at the list, so
    // neither a persona preference nor the last-resort pick can reach one.
    const serious = candidates.filter((voice) => !isNovelty(voice.name));
    const pool = [...(serious.length > 0 ? serious : candidates)].sort(
      (a, b) => voiceQualityScore(b, lang) - voiceQualityScore(a, lang),
    );

    if (juror) {
      const wantedList = JUROR_DELIVERY[juror].prefer;
      for (const wanted of wantedList) {
        const match = pool.find((voice) =>
          voice.name.toLowerCase().includes(wanted.toLowerCase()),
        );
        if (match) return match;
      }
      const local = pool.filter((voice) => voice.lang.toLowerCase() === lang.toLowerCase());
      const choices = local.length > 0 ? local : pool;
      return choices[JUROR_ORDER.indexOf(juror) % choices.length] ?? null;
    }

    for (const wanted of profile.prefer) {
      const match = pool.find((voice) =>
        voice.name.toLowerCase().includes(wanted.toLowerCase()),
      );
      if (match) return match;
    }

    return pool[0] ?? null;
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
      const { juror, text: trimmed } = splitJuror(text);
      if (trimmed === "") return Promise.resolve("ok" as const);

      return new Promise<"ok" | "blocked" | "error">((resolve) => {
        let settled = false;
        const finish = (outcome: "ok" | "blocked" | "error") => {
          if (settled) return;
          settled = true;
          clearTimeout(watchdog);
          resolve(outcome);
        };

        // Chrome on macOS/Windows can leave `speechSynthesis` paused after tab
        // switches or prior utterances; resuming before speaking prevents a
        // silent queue stall.
        try {
          if (synth.paused) synth.resume();
        } catch {
          // Ignore.
        }

        const utterance = new SpeechSynthesisUtterance(trimmed);
        const voice = pickVoice(juror);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang || lang;
        } else {
          utterance.lang = lang;
        }
        const delivery = juror ? JUROR_DELIVERY[juror] : profile;
        utterance.rate = Math.min(1.4, Math.max(0.6, delivery.rate));
        utterance.pitch = Math.min(1.4, Math.max(0.6, delivery.pitch));

        // Watchdog: if the browser synthesiser neither fires `onstart` within
        // 3s nor finishes within a generous bound, report "blocked" so the UI
        // shows the "Escuchar al jurado" button instead of hanging forever.
        let started = false;
        const maxDurationMs = Math.max(8_000, trimmed.length * 120);
        const watchdog = setTimeout(() => {
          finish(started ? "ok" : "blocked");
        }, maxDurationMs);
        const startCheck = setTimeout(() => {
          if (!started && !synth.speaking) {
            finish("blocked");
          }
        }, 2_500);

        utterance.onstart = () => {
          started = true;
          clearTimeout(startCheck);
        };
        utterance.onend = () => {
          clearTimeout(startCheck);
          finish("ok");
        };
        utterance.onerror = (event) => {
          clearTimeout(startCheck);
          const err = (event as SpeechSynthesisErrorEvent).error;
          finish(
            err === "not-allowed" || err === "canceled" || err === "interrupted"
              ? "blocked"
              : "error",
          );
        };

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
  /** A thesis jury's country, for its accent. */
  country: string | null = null,
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

  const fetchAudio = async (phrase: string): Promise<Blob | null> => {
    // A juror's tag picks their voice and is never read aloud.
    const { juror, text } = splitJuror(phrase);
    const speaker = juror ? JURORS[juror].personaId : personaId;
    if (text === "") return new Blob([], { type: "audio/mpeg" });
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text, personaId: speaker, language, ...(country ? { country } : {}) }),
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
      let untap = () => undefined as void;
      audio.onplaying = () => {
        if (current !== audio) return;
        live.stop();
        live = meterFromElement(audio);
        // In a group call, the others hear the jury through it.
        untap();
        untap = feedJuryBus(audio);
      };

      const done = (result: "ok" | "blocked" | "error") => {
        URL.revokeObjectURL(url);
        untap();
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
