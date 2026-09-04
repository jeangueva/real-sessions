import { useEffect, useRef, useState } from "react";
import { Backdrop } from "./backdrop";

/**
 * Full-bleed looping video behind the hero. It never stops.
 *
 * The first version faded the picture out over the last half second, waited,
 * seeked back and faded in — hand-driven, to avoid the hard cut a `loop`
 * attribute makes at the seam. It hid the cut and bought a worse problem: on a
 * ten-second clip the background went to a CSS gradient for about a second in
 * every ten. A hard join you might notice once is better than a hole you
 * notice every time.
 *
 * So playback is native `loop` now, and the only fade left is the one on the
 * way in, so the hero does not pop from black on load. `ended` never fires on
 * a looping element, and `timeupdate` no longer has anything to watch for.
 *
 * Three ways this degrades, all of them to the CSS `Backdrop`:
 *   - `prefers-reduced-motion`, where a full-screen loop is precisely the thing
 *     the setting exists to stop. Checked before the element is created.
 *   - No `src` configured.
 *   - The file fails to load, which for a remote asset is a matter of when.
 */

/** Fade length, milliseconds. */
export const FADE_MS = 500;

/** Opacity at `elapsed` ms into a fade from `from` to `to`. */
export function fadeValue(from: number, to: number, elapsed: number): number {
  const progress = Math.min(1, Math.max(0, elapsed / FADE_MS));
  return from + (to - from) * progress;
}

export function HeroVideo({ src, poster }: { src?: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  // Read once, not watched: a full-screen video appearing because someone
  // changed the setting mid-session is worse than requiring a reload.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  /** Whether the element is worth mounting at all. */
  const hasVideo = Boolean(src) && !failed;
  /** Whether it is allowed to play. */
  const animated = hasVideo && !reducedMotion;

  useEffect(() => {
    if (!hasVideo) return;
    const video = videoRef.current;
    if (!video) return;

    const cancel = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const onError = () => setFailed(true);

    /**
     * Reduced motion gets the footage, held on its first frame.
     *
     * The alternative was a CSS gradient, which threw away the art direction
     * to obey a setting that asks for no *motion* — not for no picture. The
     * `currentTime` nudge is what makes a paused element actually paint:
     * without a seek some browsers hold the frame buffer empty until play().
     * No fade either, because a fade is motion too.
     */
    if (!animated) {
      const show = () => {
        video.style.opacity = "1";
      };
      video.addEventListener("loadeddata", show);
      video.addEventListener("error", onError);
      video.currentTime = 0;
      if (video.readyState >= 2) show();
      return () => {
        video.removeEventListener("loadeddata", show);
        video.removeEventListener("error", onError);
      };
    }

    /** Animates opacity to `target`, starting from wherever it is now. */
    const fade = (target: number) => {
      cancel();
      // Resumes from wherever the last fade got to rather than snapping, so a
      // stall recovered mid-fade does not flash.
      const from = Number(video.style.opacity || "0");
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        video.style.opacity = String(fadeValue(from, target, elapsed));
        if (elapsed < FADE_MS) frameRef.current = requestAnimationFrame(step);
        else frameRef.current = null;
      };
      frameRef.current = requestAnimationFrame(step);
    };

    // Fires on the first play and again after any stall the browser recovers
    // from. Idempotent: a fade to 1 from 1 is a no-op frame.
    const onPlaying = () => fade(1);

    /**
     * A looping element should never pause on its own, but browsers do stall
     * one — a background tab, a codec hiccup, a device waking up. Nothing
     * restarted it, and the hero sat on a frozen frame until reload.
     */
    const onPause = () => {
      if (!video.ended) void video.play().catch(() => undefined);
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    // Autoplay is refused in some browsers even when muted. Falling back to
    // the CSS field is better than a frozen first frame.
    void video.play().catch(() => setFailed(true));

    return () => {
      cancel();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
    };
  }, [hasVideo, animated, src]);

  if (!hasVideo) return <Backdrop variant="hero" still={reducedMotion} />;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The CSS field sits underneath, not instead: it is what shows through
          while the first frame is still decoding. Held still when the video
          is, so nothing on the screen is moving under reduced motion. */}
      <Backdrop variant="hero" still={!animated} />

      <video
        ref={videoRef}
        // The loop that never stops. The seam is a hard cut; the alternative
        // shipped before this was a second of CSS gradient every ten.
        loop={animated}
        muted
        // Both are required for autoplay on iOS; without playsInline Safari
        // takes the video fullscreen the moment it plays.
        playsInline
        preload="auto"
        poster={poster}
        src={src}
        style={{ opacity: 0 }}
        /* Shifted down so the top of the frame is cropped — the composition
           worth seeing is in the lower portion, and the wordmark sits over it. */
        className="absolute inset-0 h-full w-full translate-y-[17%] object-cover"
      />

      <div className="noise-overlay absolute inset-0 opacity-[0.35] mix-blend-overlay" />

      {/* Two scrims, because one cannot do both jobs.
          The first is even, and only takes the overall brightness down.  */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/45" />
      {/* The second is anchored to the bottom third, where every piece of hero
          content sits. Without it the copy lands on whatever the footage
          happens to be showing — in this clip, bright yellow flowers directly
          behind cream text — and contrast becomes a function of the frame. */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
    </div>
  );
}
