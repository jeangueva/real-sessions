import type { HTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface ScoreRingProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The score as a percentage, 0–100. The ring clamps to that range; the number inside is whatever children say. */
  value: number;
  /** Width and height of the ring, in pixels. 168 for the end-of-interview report, 132, 128 or 96 elsewhere. */
  size?: number;
  /** What sits in the middle: the number with its "%", or a mark when a goal is met. It carries the meaning. */
  children?: ReactNode;
  /** Extra classes, appended to the wrapper. For layout (margin, self-alignment) — not for recolouring the ring. */
  className?: string;
}

/** The ring's colour by score band: grow from 70, accent from 40, step below. Never red. */
function strokeFor(value: number): string {
  if (value >= 70) return "text-grow";
  if (value >= 40) return "text-accent";
  return "text-step";
}

/**
 * The score as a ring that fills, the lesson-complete moment.
 *
 * Rare and earned — it plays once, at the end of an interview — so it is
 * allowed the delight budget: the stroke draws itself on a spring with a
 * little settle. The number sits inside, so the colour is never the only
 * thing carrying the meaning, and the ring itself is hidden from assistive
 * technology: a screen reader reads the children.
 */
export function ScoreRing({ value, size = 168, children, className = "", style, ...props }: ScoreRingProps) {
  const still = useReducedMotion() === true;
  // A score that is not a number yet (NaN while data loads) draws an empty
  // ring instead of an invalid path.
  const safe = Number.isFinite(value) ? value : 0;
  const pct = Math.max(0, Math.min(100, safe)) / 100;
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size, ...style }} {...props}>
      {/* Turned a quarter back so the stroke starts at twelve o'clock. */}
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="12" className="text-surface-lift" />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={strokeFor(safe)}
          // Under reduced motion the ring is drawn at its value from the first
          // frame, and a later change jumps rather than springs.
          initial={{ pathLength: still ? pct : 0 }}
          animate={{ pathLength: pct }}
          transition={still ? { duration: 0 } : { type: "spring", duration: 1.2, bounce: 0.15, delay: 0.25 }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
