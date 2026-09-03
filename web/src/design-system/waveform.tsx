import { useEffect, useRef } from "react";

/**
 * The bars beside whoever is talking.
 *
 * Driven straight off the audio, and written straight to the DOM. Sixty
 * setState calls a second would re-render the interview screen — transcript,
 * coaching column and all — for a change that only ever touches a transform,
 * so the animation loop writes `scaleY` on the bar refs and React never hears
 * about it.
 *
 * When the meter cannot see the signal (the browser's own synthesiser exposes
 * no audio node) the bars fall back to a travelling wave. That is decoration
 * and is drawn as such: slow, even, obviously not a measurement.
 */

/** Odd, so there is a centre bar for the wave to peak on. */
export const BARS = 9;

/** Nothing to hear. Not zero — a flat line reads as broken, not as quiet. */
export const RESTING = 0.12;

export interface FrameState {
  /** Whether this side is currently talking. */
  active: boolean;
  /** False when `level` is not a real measurement. */
  measured: boolean;
  /** Whether the viewer asked for reduced motion. */
  reduced: boolean;
  /** The meter reading, 0–1. Ignored when `measured` is false. */
  level: number;
  /** Milliseconds since the component mounted, for the decorative phases. */
  elapsed: number;
}

/**
 * Where the bars are heading this frame.
 *
 * Silent-but-speaking still returns `RESTING` rather than 0: the difference
 * between "not talking" and "talking, quietly" is carried by colour and by the
 * label, and a meter that bottoms out mid-sentence reads as a dropped
 * connection.
 */
export function targetFor({ active, measured, reduced, level, elapsed }: FrameState): number {
  if (!active) return 0;
  if (measured) return Math.max(RESTING, level);
  // Nothing to measure. Under reduced motion that means a steady "on" height
  // rather than an invented rhythm; otherwise a slow breath, obviously not a
  // measurement.
  return reduced ? 0.5 : 0.45 + Math.sin(elapsed / 260) * 0.2;
}

/**
 * Rising fast and falling slow is what makes a meter look like sound rather
 * than like noise: the attack is the syllable, the decay is the room. Equal
 * rates read as jitter.
 */
export function ease(current: number, target: number): number {
  const rate = target > current ? 0.45 : 0.12;
  return current + (target - current) * rate;
}

/** The height of one bar, given the smoothed level. */
export function barHeight(
  index: number,
  eased: number,
  { measured, reduced, elapsed }: Pick<FrameState, "measured" | "reduced" | "elapsed">,
): number {
  // Centre bars are tallest, edges shortest — the shape people read as a voice
  // rather than as an equaliser.
  const distance = Math.abs(index - (BARS - 1) / 2) / ((BARS - 1) / 2);
  const shape = 1 - distance * 0.65;
  // A per-bar phase offset keeps neighbours from moving in lockstep. Dropped
  // entirely under reduced motion: it is decoration, and the level is not.
  const ripple = reduced
    ? 1
    : measured
      ? 1 + Math.sin(elapsed / 120 + index) * 0.18
      : 1 + Math.sin(elapsed / 200 + index * 0.8) * 0.35;
  const height = RESTING + eased * shape * ripple * (1 - RESTING);
  return Math.max(RESTING, Math.min(1, height));
}

export function Waveform({
  active,
  level,
  measured = true,
  label,
  className = "",
}: {
  /** Whether this side is currently talking. */
  active: boolean;
  /** Loudness right now, 0–1. Polled once per frame; never a React value. */
  level: () => number;
  /** False when `level` is not a real measurement and the wave is decorative. */
  measured?: boolean;
  /** What a screen reader is told, since the bars themselves say nothing. */
  label: string;
  className?: string;
}) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  /** Read in the loop, so a change does not restart it. */
  const source = useRef(level);
  source.current = level;
  const live = useRef(active);
  live.current = active;
  const isMeasured = useRef(measured);
  isMeasured.current = measured;

  useEffect(() => {
    /**
     * Reduced motion changes what this draws, not whether it draws.
     *
     * A meter reading a live signal is information — it is how a candidate
     * knows the microphone still hears them — so switching it off entirely
     * would remove a fact from the screen rather than an effect. What the
     * setting does switch off is everything decorative: the per-bar ripple,
     * the synthetic wave that stands in when there is nothing to measure, and
     * the sixty-times-a-second repaint. What is left is the level itself,
     * updated slowly enough not to shimmer.
     */
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    /** Smoothed level, so the bars glide instead of snapping. */
    let eased = 0;
    const started = performance.now();
    let lastPaint = 0;

    const paint = (now: number) => {
      frame = requestAnimationFrame(paint);
      // ~8fps under reduced motion. Enough to follow a sentence, slow enough
      // that it reads as a gauge rather than as animation.
      if (reduced && now - lastPaint < 120) return;
      lastPaint = now;

      const shape = {
        active: live.current,
        measured: isMeasured.current,
        reduced,
        level: isMeasured.current ? source.current() : 0,
        elapsed: now - started,
      };
      eased = ease(eased, targetFor(shape));

      for (let i = 0; i < BARS; i += 1) {
        const bar = bars.current[i];
        if (!bar) continue;
        bar.style.transform = `scaleY(${barHeight(i, eased, shape)})`;
      }
    };

    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex h-6 items-center gap-[3px] ${className}`}
    >
      {Array.from({ length: BARS }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          aria-hidden
          className={`h-full w-[3px] origin-center rounded-full transition-colors duration-300 ${
            active ? "bg-current" : "bg-current/30"
          }`}
          style={{ transform: `scaleY(${RESTING})` }}
        />
      ))}
    </span>
  );
}
