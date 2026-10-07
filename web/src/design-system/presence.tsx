import { useEffect } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

/**
 * The interviewer, as a presence rather than a pair of initials in a circle.
 *
 * This is the thing somebody looks at for ten minutes while being asked hard
 * questions in a second language, and until now it was a static disc. A real
 * video call has a face that moves even in silence; what makes a call feel
 * like a call is not resolution, it is that the other side is evidently
 * alive. So: a slow breath while they listen, a halo that opens with the
 * volume of their voice while they speak, and a light underneath that warms
 * when it is their turn.
 *
 * Drawn rather than modelled. A 3D head would cost more than this entire
 * application weighs, on phones in the places this product is for, to say the
 * same sentence — somebody is there. Three rings and a gradient say it for
 * nothing.
 *
 * Every motion is declarative, so the `MotionConfig reducedMotion="user"` in
 * App.tsx holds all of it still for a reader who asked for that. They get the
 * disc and the halo at rest, which is exactly what this looked like before.
 */
export function InterviewerPresence({
  initials,
  speaking,
  /**
   * The live level, read per frame rather than passed as a number.
   *
   * A getter for the same reason the waveform takes one: the meter changes
   * sixty times a second, and a prop would re-render this component on every
   * one of them. Sampled into a motion value instead, which animates outside
   * React entirely.
   */
  level,
  size = 128,
  className = "",
}: {
  initials: string;
  speaking: boolean;
  level?: () => number;
  size?: number;
  className?: string;
}) {
  const still = useReducedMotion();

  /**
   * The voice, smoothed.
   *
   * Raw meter values jitter hard enough that binding them straight to a scale
   * makes the halo buzz. Each frame moves a fraction of the way toward the
   * reading, which is enough to follow a sentence and not a syllable.
   */
  const loud = useMotionValue(0);
  useEffect(() => {
    if (!level || still) return;
    let frame = 0;
    const follow = () => {
      const target = Math.min(1, Math.max(0, level()));
      loud.set(loud.get() + (target - loud.get()) * 0.18);
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(frame);
  }, [level, loud, still]);

  // The halo answers the voice, but never collapses to nothing: a ring that
  // disappears between syllables reads as a glitch rather than as breathing.
  const glow = useTransform(loud, (value) => (speaking ? 0.55 + value * 0.45 : 0.3));
  const swell = useTransform(loud, (value) => (speaking ? 1 + value * 0.12 : 1));
  const beat = useTransform(loud, (value) => (speaking ? 1 + value * 0.05 : 1));

  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The light underneath. Warmer and wider while they hold the floor. */}
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          background:
            "radial-gradient(circle, rgb(var(--accent) / 0.28) 0%, rgb(var(--accent) / 0) 68%)",
          opacity: glow,
          scale: swell,
        }}
      />

      {/* Three rings, offset in time so the breath reads as one movement
          travelling outward rather than three things pulsing together. */}
      {[0, 1, 2].map((ring) => (
        <motion.span
          aria-hidden
          key={ring}
          className="absolute rounded-full border-2 border-accent/40"
          style={{ width: size, height: size }}
          animate={
            still
              ? { scale: 1 + ring * 0.12, opacity: 0.25 }
              : {
                  scale: [1 + ring * 0.06, 1.14 + ring * 0.12, 1 + ring * 0.06],
                  opacity: [0.28, 0.06, 0.28],
                }
          }
          transition={{
            duration: speaking ? 2.2 : 4.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: ring * 0.45,
          }}
        />
      ))}

      {/* The disc itself, breathing. Slower than the rings, and barely — a
          face at rest moves, but it does not bob. */}
      <motion.span
        aria-hidden
        className={`relative grid place-items-center rounded-full font-semibold transition-colors duration-500 ${
          speaking ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent-text"
        }`}
        style={{
          width: size * 0.74,
          height: size * 0.74,
          fontSize: size * 0.24,
          ...(speaking && !still ? { scale: beat } : {}),
        }}
        animate={still || speaking ? undefined : { scale: [1, 1.025, 1] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {initials}
      </motion.span>
    </div>
  );
}
