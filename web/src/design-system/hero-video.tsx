import { useEffect, useRef, useState } from "react";
import { Backdrop } from "./backdrop";

/**
 * Full-bleed looping video behind the hero.
 *
 * The seam is the whole problem. A `loop` attribute cuts hard from the last
 * frame to the first, and a CSS transition cannot help because there is no
 * event to hang it on that fires early enough. So the fade is driven by hand:
 * `timeupdate` watches for the last {@link FADE_OUT_AT} seconds and starts a
 * fade-out, `ended` resets and fades back in. Every fade runs on
 * requestAnimationFrame and cancels the one before it, so two fades can never
 * fight over opacity — and each one resumes from wherever the last one got to
 * rather than snapping to full.
 *
 * Three ways this degrades, all of them to the CSS `Backdrop`:
 *   - `prefers-reduced-motion`, where a full-screen loop is precisely the thing
 *     the setting exists to stop. Checked before the element is created.
 *   - No `src` configured.
 *   - The file fails to load, which for a remote asset is a matter of when.
 */

/** Fade length, milliseconds. */
export const FADE_MS = 500;
/** Seconds before the end at which the fade-out begins. */
export const FADE_OUT_AT = 0.55;
/** Gap between `ended` and the restart, so the seek lands before playback. */
const RESTART_DELAY_MS = 100;

/**
 * Whether the loop seam is close enough to start fading.
 *
 * Pulled out of the event handler so the decision can be tested without a
 * video element: `timeupdate` fires several times a second and the guard has
 * to hold for a stream whose duration is not yet known.
 */
export function shouldStartFadeOut(duration: number, currentTime: number): boolean {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  return duration - currentTime <= FADE_OUT_AT;
}

/** Opacity at `elapsed` ms into a fade from `from` to `to`. */
export function fadeValue(from: number, to: number, elapsed: number): number {
  const progress = Math.min(1, Math.max(0, elapsed / FADE_MS));
  return from + (to - from) * progress;
}

export function HeroVideo({ src, poster }: { src?: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);
  /** Guards against `timeupdate` re-triggering a fade-out already running. */
  const fadingOutRef = useRef(false);
  const [failed, setFailed] = useState(false);

  // Read once, not watched: a full-screen video appearing because someone
  // changed the setting mid-session is worse than requiring a reload.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const usable = Boolean(src) && !failed && !reducedMotion;

  useEffect(() => {
    if (!usable) return;
    const video = videoRef.current;
    if (!video) return;

    const cancel = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    /** Animates opacity to `target`, starting from wherever it is now. */
    const fade = (target: number) => {
      cancel();
      // Resumes from wherever the last fade got to rather than snapping, so an
      // interrupted fade-out does not flash to full before fading again.
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

    const onPlaying = () => {
      if (!fadingOutRef.current) fade(1);
    };

    const onTimeUpdate = () => {
      // The ref is the whole guard: timeupdate keeps firing through the fade,
      // and without it every event would restart the animation from the
      // current opacity and the video would never actually reach zero.
      if (fadingOutRef.current) return;
      if (shouldStartFadeOut(video.duration, video.currentTime)) {
        fadingOutRef.current = true;
        fade(0);
      }
    };

    const onEnded = () => {
      cancel();
      video.style.opacity = "0";
      window.setTimeout(() => {
        video.currentTime = 0;
        void video.play().catch(() => setFailed(true));
        fadingOutRef.current = false;
        fade(1);
      }, RESTART_DELAY_MS);
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", () => setFailed(true));

    // Autoplay is refused in some browsers even when muted. Falling back to
    // the CSS field is better than a frozen first frame.
    void video.play().catch(() => setFailed(true));

    return () => {
      cancel();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [usable, src]);

  if (!usable) return <Backdrop variant="hero" still={reducedMotion} />;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The CSS field sits underneath, not instead: it is what shows through
          during the fade at the loop seam, so the seam never reaches black. */}
      <Backdrop variant="hero" />

      <video
        ref={videoRef}
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
