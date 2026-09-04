import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The two streams the call screen can open: the candidate's camera and their
 * screen. Neither is sent anywhere and neither is recorded.
 *
 * Worth saying plainly, because both turn on a hardware indicator and a
 * product that calls itself an interview simulator has to answer "where does
 * that video go" without hedging. It goes to the same page it came from.
 * Half of what an interview grades is not in the transcript — where you look,
 * what your hands do, whether the portfolio you are walking through actually
 * reads at that size — and none of it is rehearsable without seeing it.
 */

export interface MediaSource {
  /** Whether this browser can offer the source at all. */
  readonly supported: boolean;
  readonly on: boolean;
  /** True while the permission prompt or the picker is still open. */
  readonly starting: boolean;
  readonly error: string | null;
  readonly stream: MediaStream | null;
  start(): void;
  stop(): void;
}

const MESSAGES: Record<string, string> = {
  NotAllowedError: "Access was blocked. Allow it in your browser to see yourself.",
  NotFoundError: "No device was found.",
  NotReadableError: "Another app is using it.",
  AbortError: "",
};

function useStream(
  supported: boolean,
  acquire: () => Promise<MediaStream>,
  messages: Record<string, string>,
): MediaSource {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Held in a ref as well as in state so the unmount cleanup can stop the
   * tracks without listing `stream` as a dependency — which would tear the
   * device down and reopen it on every render that touched it.
   */
  const live = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    // Stopping the tracks is what turns the hardware indicator off. Dropping
    // the reference alone leaves the device running with nothing showing it.
    live.current?.getTracks().forEach((track) => track.stop());
    live.current = null;
    setStream(null);
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!supported || live.current || starting) return;
    setStarting(true);
    setError(null);
    acquire()
      .then((granted) => {
        live.current = granted;
        setStream(granted);
        /**
         * The browser has its own way to end a share — the floating "Stop
         * sharing" bar — and it does not go through this button. Without
         * this the control would keep claiming the screen was still on.
         */
        for (const track of granted.getTracks()) {
          track.addEventListener("ended", () => {
            if (live.current === granted) stop();
          });
        }
      })
      .catch((caught: unknown) => {
        const name = caught instanceof Error ? caught.name : "";
        // Cancelling the picker is a decision, not a failure. An error
        // message for it would be the app arguing with the person.
        const message = messages[name] ?? "It could not be started.";
        setError(message === "" ? null : message);
      })
      .finally(() => setStarting(false));
  }, [supported, starting, acquire, messages, stop]);

  useEffect(() => stop, [stop]);

  return { supported, on: stream !== null, starting, error, stream, start, stop };
}

export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function screenShareSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function"
  );
}

const CAMERA_MESSAGES: Record<string, string> = {
  ...MESSAGES,
  NotAllowedError: "Camera access was blocked. Allow it in your browser to see yourself.",
  NotFoundError: "No camera was found.",
  NotReadableError: "Another app is using the camera.",
};

const SCREEN_MESSAGES: Record<string, string> = {
  ...MESSAGES,
  NotAllowedError: "",
  NotFoundError: "No screen was available to share.",
};

/** A mirror. `facingMode: "user"` so a phone opens the front camera. */
export function useCamera(): MediaSource {
  const acquire = useCallback(
    () => navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false }),
    [],
  );
  return useStream(cameraSupported(), acquire, CAMERA_MESSAGES);
}

/**
 * The screen, for walking through a portfolio or a diagram out loud.
 *
 * `audio: false` deliberately: capturing system audio here would feed the
 * interviewer's own voice back into the room, and there is nobody on the far
 * end who needs to hear it anyway.
 */
export function useScreenShare(): MediaSource {
  const acquire = useCallback(
    () => navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }),
    [],
  );
  return useStream(screenShareSupported(), acquire, SCREEN_MESSAGES);
}
