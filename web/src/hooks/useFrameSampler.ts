import { useCallback, useEffect, useRef } from "react";

/** First frame after a few seconds, then one every this often, up to the cap. */
const FIRST_MS = 6_000;
const EVERY_MS = 25_000;
const MAX = 8;
const WIDTH = 480;

/**
 * Small still frames from the camera, kept in memory for the presence
 * reading at the end of a session.
 *
 * Only while the camera is on, never more than eight, 480px JPEGs — enough
 * to see where someone looks and how they sit, small enough to send. Nothing
 * here is stored: the frames live in this hook until they are read once.
 */
export function useFrameSampler(stream: MediaStream | null) {
  const frames = useRef<string[]>([]);

  useEffect(() => {
    if (!stream) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    const canvas = document.createElement("canvas");

    const grab = () => {
      if (frames.current.length >= MAX || video.videoWidth === 0) return;
      canvas.width = WIDTH;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * WIDTH);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.current.push(canvas.toDataURL("image/jpeg", 0.6));
    };
    const first = window.setTimeout(grab, FIRST_MS);
    const every = window.setInterval(grab, EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      video.srcObject = null;
    };
  }, [stream]);

  /** Hands the frames over once and forgets them. */
  const take = useCallback(() => {
    const taken = frames.current;
    frames.current = [];
    return taken;
  }, []);

  return { take };
}
