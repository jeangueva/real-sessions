/**
 * Streaming speech-to-text through Deepgram.
 *
 * The browser's own `SpeechRecognition` is free and needs no key, but it has
 * two properties that make it wrong to ship as the only option: Chrome uploads
 * the microphone to Google's servers, and Firefox does not implement it at all.
 * This is the cloud half — the same pipeline the local Whisper setups use,
 * without a GPU.
 *
 * The connection is a proxy, deliberately. Deepgram can be dialled directly
 * from a browser, but only by shipping either the API key or a short-lived
 * token to the client, and the whole premise of this server is that the
 * provider key never leaves it. Proxying costs one hop — a few milliseconds
 * against the ~300ms the transcription itself takes — and keeps the key here.
 */
import { WebSocket } from "ws";
import process from "node:process";
import { DEFAULT_LANGUAGE, findLanguage } from "../languages.js";

/** Audio the browser sends up. Matches what MediaRecorder produces. */
export const CLIENT_AUDIO_MIME = "audio/webm;codecs=opus";

export interface DeepgramTranscript {
  text: string;
  /** Deepgram marks a segment final once it will not revise it. */
  isFinal: boolean;
  /** True at the end of an utterance — a natural place to submit an answer. */
  speechFinal: boolean;
}

export interface DeepgramHandlers {
  /** What to transcribe. English unless the session chose otherwise. */
  language?: string;
  onTranscript: (transcript: DeepgramTranscript) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export function deepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

/**
 * Query string for the live endpoint.
 *
 * `interim_results` is what makes the transcript appear while someone is still
 * talking. `endpointing` is the one number a candidate actually feels: it is
 * how long Deepgram waits in silence before declaring the utterance over. The
 * default of 10ms cuts people off mid-thought; interviews are full of pauses
 * for thinking, so this is set long and deliberately.
 */
export function liveQuery(language: string = DEFAULT_LANGUAGE): string {
  /**
   * The model follows the language, not the other way round.
   *
   * Nova-3 is English-only on this account — checked against Deepgram's model
   * list — so a Spanish interview transcribed with it would return confident
   * English nonsense rather than an error. Nova-2 covers es and pt-BR, which
   * is the trade: an older model that hears the right language.
   */
  const chosen = findLanguage(language);
  const params = new URLSearchParams({
    model: chosen.sttModel,
    language: chosen.stt,
    // Sent as-is by MediaRecorder; Deepgram detects the container itself.
    encoding: "opus",
    smart_format: "true",
    interim_results: "true",
    // 700ms. Shorter interrupts a candidate mid-sentence; much longer and the
    // conversation feels dead.
    endpointing: "700",
    // Fires speech_final at an utterance boundary rather than only on close.
    utterance_end_ms: "1200",
    vad_events: "true",
  });
  return params.toString();
}

export interface DeepgramSocket {
  /** Forwards one audio chunk. No-ops once the socket has closed. */
  send(chunk: Buffer): void;
  /** Tells Deepgram no more audio is coming, so it flushes the last words. */
  finish(): void;
  close(): void;
  readonly open: boolean;
}

/**
 * Opens one Deepgram live session.
 *
 * Throws only when the key is missing, which is a configuration error the
 * caller should surface once. Every runtime failure after that is reported
 * through `onError` and closes the socket, because a transcription outage
 * mid-interview must degrade to "type your answer" rather than throwing into
 * an open WebSocket the candidate is holding.
 */
export function openDeepgram(handlers: DeepgramHandlers): DeepgramSocket {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) throw new Error("DEEPGRAM_API_KEY is not set.");

  const socket = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${liveQuery(handlers.language)}`,
    {
    headers: { Authorization: `Token ${key}` },
  });

  /**
   * Audio that arrived before the upstream socket finished connecting.
   *
   * Without this the first half-second of every answer is lost: the browser
   * starts recording the moment the candidate taps the mic, but the handshake
   * with Deepgram takes a few hundred milliseconds, and anything sent to a
   * CONNECTING socket throws.
   */
  const pending: Buffer[] = [];
  let open = false;

  socket.on("open", () => {
    open = true;
    for (const chunk of pending) socket.send(chunk);
    pending.length = 0;
  });

  socket.on("message", (raw) => {
    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString());
    } catch {
      // Deepgram only sends JSON on this channel; anything else is a protocol
      // change we should not guess at.
      return;
    }
    const parsed = readTranscript(payload);
    if (parsed) handlers.onTranscript(parsed);
  });

  socket.on("error", (error: Error) => {
    handlers.onError(error.message);
  });

  socket.on("close", () => {
    open = false;
    handlers.onClose();
  });

  return {
    get open() {
      return open;
    },
    send(chunk) {
      if (socket.readyState === WebSocket.CONNECTING) {
        pending.push(chunk);
        return;
      }
      if (socket.readyState === WebSocket.OPEN) socket.send(chunk);
    },
    finish() {
      if (socket.readyState === WebSocket.OPEN) {
        // Deepgram's documented way to ask for a final flush. Closing the
        // socket instead discards whatever it was still holding.
        socket.send(JSON.stringify({ type: "CloseStream" }));
      }
    },
    close() {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    },
  };
}

/**
 * Pulls the transcript out of one Deepgram message.
 *
 * Returns null for the message types that carry no words — metadata,
 * speech-started, and the empty interim results that arrive between phrases.
 * Forwarding those would clear the transcript on screen every time someone
 * paused.
 */
export function readTranscript(payload: unknown): DeepgramTranscript | null {
  if (typeof payload !== "object" || payload === null) return null;
  const message = payload as Record<string, unknown>;

  if (message["type"] === "UtteranceEnd") {
    // No words of its own; it marks the boundary after the last final.
    return { text: "", isFinal: true, speechFinal: true };
  }
  if (message["type"] !== "Results" && message["channel"] === undefined) return null;

  const channel = message["channel"] as { alternatives?: { transcript?: string }[] };
  const text = channel?.alternatives?.[0]?.transcript ?? "";
  if (text.trim() === "") return null;

  return {
    text,
    isFinal: message["is_final"] === true,
    speechFinal: message["speech_final"] === true,
  };
}
