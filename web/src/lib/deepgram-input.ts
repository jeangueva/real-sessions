/**
 * Live transcription over the server's WebSocket.
 *
 * Implements the same `SpeechInput` interface as the browser's own speech
 * recognition, which is what `lib/voice.ts` has said it was for since the first
 * build. The interview screen does not know which one it is holding.
 *
 * Two things this buys over the browser API: it works in Firefox, and the audio
 * goes to a vendor we chose rather than to Google as a side effect of using
 * Chrome. It costs a network round trip and an API key.
 */
import type { SpeechInput } from "./voice";

/** Matches the close codes the gateway sends. */
const CLOSE_UNAVAILABLE = 4001;

/**
 * How often MediaRecorder hands us a chunk.
 *
 * This is a latency floor: nothing can be transcribed before the chunk
 * containing it is cut. 250ms is small enough to feel live and large enough
 * that each frame carries a useful amount of audio.
 */
const CHUNK_MS = 250;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

/** The first container this browser can actually record, or null. */
export function pickMimeType(
  supported: (type: string) => boolean = (type) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
): string | null {
  return MIME_CANDIDATES.find((type) => supported(type)) ?? null;
}

export function deepgramInputSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    pickMimeType() !== null
  );
}

/**
 * Builds the socket URL from the page's own origin.
 *
 * Hard-coding a host would break the moment this runs anywhere but localhost,
 * and the Vite dev proxy already forwards `/api` — including upgrades.
 */
export function voiceSocketUrl(location: { protocol: string; host: string }): string {
  const scheme = location.protocol === "https:" ? "wss:" : "ws:";
  return `${scheme}//${location.host}/api/voice`;
}

export function createDeepgramInput(): SpeechInput {
  if (!deepgramInputSupported()) {
    return {
      supported: false,
      listening: false,
      start: () => undefined,
      stop: () => undefined,
    };
  }

  let socket: WebSocket | null = null;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let listening = false;

  /**
   * Finalised text, kept apart from the interim tail.
   *
   * Deepgram revises an interim segment until it marks it final. Appending
   * every message would repeat each phrase several times as it is refined, so
   * only finals accumulate and the interim is rendered after them.
   */
  let settled = "";
  let interim = "";

  const teardown = () => {
    listening = false;
    recorder?.state !== "inactive" && recorder?.stop();
    recorder = null;
    // Releasing the tracks is what turns off the browser's recording
    // indicator. Leaving them open looks like the page is still listening.
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    socket?.close();
    socket = null;
  };

  return {
    supported: true,
    get listening() {
      return listening;
    },

    start(handlers) {
      if (listening) return;
      settled = "";
      interim = "";
      listening = true;

      const mime = pickMimeType();
      if (!mime) {
        listening = false;
        handlers.onError("This browser cannot record audio.");
        return;
      }

      const ws = new WebSocket(voiceSocketUrl(window.location));
      ws.binaryType = "arraybuffer";
      socket = ws;

      ws.onmessage = (event) => {
        let message: {
          type?: string;
          text?: string;
          isFinal?: boolean;
          speechFinal?: boolean;
          message?: string;
        };
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (message.type === "error") {
          handlers.onError(message.message ?? "Live transcription dropped.");
          return;
        }
        if (message.type !== "transcript") return;

        if (message.isFinal) {
          if (message.text) settled = `${settled} ${message.text}`.trim();
          interim = "";
        } else {
          interim = message.text ?? "";
        }
        handlers.onInterim(`${settled} ${interim}`.trim());
      };

      ws.onclose = (event) => {
        const wasListening = listening;
        teardown();
        if (event.code === CLOSE_UNAVAILABLE) {
          handlers.onError("Live transcription is not available right now.");
          return;
        }
        // A close is the end of the turn as far as the caller is concerned,
        // whether it came from stop() or from upstream giving up.
        if (wasListening) handlers.onFinal(settled.trim());
      };

      ws.onerror = () => {
        handlers.onError("Lost the connection to the transcription service.");
      };

      ws.onopen = () => {
        navigator.mediaDevices
          .getUserMedia({
            audio: {
              // Browser-side cleanup, before the audio is compressed. Doing it
              // here is far cheaper than asking the model to cope with a room.
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })
          .then((granted) => {
            // The socket can close while the permission prompt is up.
            if (!listening) {
              granted.getTracks().forEach((track) => track.stop());
              return;
            }
            stream = granted;
            const media = new MediaRecorder(granted, { mimeType: mime });
            media.ondataavailable = (event) => {
              if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                void event.data.arrayBuffer().then((buffer) => ws.send(buffer));
              }
            };
            media.start(CHUNK_MS);
            recorder = media;
          })
          .catch(() => {
            listening = false;
            handlers.onError(
              "Microphone access was blocked. Allow it in your browser to speak.",
            );
            teardown();
          });
      };
    },

    stop() {
      if (!listening) return;
      // Stop recording first, then ask Deepgram to flush: the last chunk has
      // to be on the wire before the finish signal, or the final words of the
      // answer are lost.
      if (recorder && recorder.state !== "inactive") recorder.stop();
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "finish" }));
      }
      // The socket's own close handler delivers onFinal and tears down.
    },
  };
}
