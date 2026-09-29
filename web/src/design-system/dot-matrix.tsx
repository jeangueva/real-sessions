import { motion } from "framer-motion";

/**
 * A grid of dots that brightens in a wave, for a wait with no progress to show.
 *
 * Used while the evaluation is being written, which is the longest wait in the
 * product: a model reading a whole transcript and answering at length. There
 * is no percentage to report and no way to fake one honestly, so this says
 * "still working" and nothing more.
 *
 * A wave rather than a spin. A spinner is the same at every moment, so after a
 * few seconds it stops reading as progress and starts reading as stuck; a
 * wave crossing the grid gives the eye somewhere to land, and it is obvious
 * when it stops. The dots take their colour from the interface's ink and sit
 * on whatever panel holds them, so this needs no ground of its own and
 * follows every theme.
 *
 * `bloom` adds the glow: each dot doubles as a blurred copy underneath. It is
 * the whole visual point on a dark theme and nearly invisible on a light one,
 * which is why it is a flag rather than something always on.
 *
 * Motion is declarative, so `MotionConfig reducedMotion="user"` holds the
 * whole grid still for a reader who asked for that. They see a quiet grid of
 * dots — no information is carried by the movement, only by the words beside
 * it, which is why the animation is safe to lose.
 */
export function DotMatrix({
  size = 5,
  dotSize = 4,
  gap = 8,
  speed = 1.2,
  bloom = false,
  label,
}: {
  /** Dots per side. */
  size?: number;
  /** Diameter of one dot, in pixels. */
  dotSize?: number;
  /** Space between dots, in pixels. */
  gap?: number;
  /** Seconds for one wave to cross the grid. */
  speed?: number;
  /** Add a blurred copy under each dot. */
  bloom?: boolean;
  /**
   * What the wait is for.
   *
   * Required, and read out rather than drawn: an animation alone tells a
   * screen reader nothing, and "loading" tells it almost as little.
   */
  label: string;
}) {
  const dots = Array.from({ length: size * size }, (_, index) => index);

  return (
    <div role="status" aria-live="polite" className="inline-flex flex-col gap-3">
      <div
        aria-hidden
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${size}, ${dotSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {dots.map((index) => {
          const row = Math.floor(index / size);
          const column = index % size;
          // Diagonal: the wave enters at one corner and leaves at the other,
          // so no two neighbours peak together and the grid never flashes as
          // one block.
          const delay = ((row + column) / (size * 2)) * speed;
          return (
            <span key={index} className="relative" style={{ width: dotSize, height: dotSize }}>
              {bloom && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-cream"
                  style={{ filter: `blur(${dotSize}px)` }}
                  animate={{ opacity: [0.1, 0.9, 0.1], scale: [1, 2.2, 1] }}
                  transition={{ duration: speed * 2, repeat: Infinity, delay, ease: "easeInOut" }}
                />
              )}
              <motion.span
                className="absolute inset-0 rounded-full bg-cream"
                animate={{ opacity: [0.18, 1, 0.18] }}
                transition={{ duration: speed * 2, repeat: Infinity, delay, ease: "easeInOut" }}
              />
            </span>
          );
        })}
      </div>
      <span className="text-sm text-cream-dim">{label}</span>
    </div>
  );
}
