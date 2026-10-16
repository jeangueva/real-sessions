/**
 * Clean-room implementation for @mockio/design-system; not derived from React Bits.
 *
 * Written from a behaviour spec and from how the product uses a text shine
 * (the "Premium" chip in the app's top bar), with no reference to any
 * third-party implementation.
 */
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

export interface ShimmerTextProps {
  /** The text the light crosses: one to three words, such as "Premium". A plain string. */
  children: string;
  /** Seconds the light takes to cross the text once. Higher is slower. */
  speed?: number;
  /** Seconds the text stays still between two sweeps. 0 runs the sweeps back to back. */
  pause?: number;
  /** Stops the sweep and draws the text in the base colour, in the same box. */
  disabled?: boolean;
  /** Extra classes, appended. For type size, weight and layout. */
  className?: string;
}

const DEFAULT_SPEED = 2.4;
const DEFAULT_PAUSE = 4;

/** Width of the band of light, as a share of the text's own width: a soft light, not a stripe. */
const BAND = 0.6;

const BASE = "rgb(var(--accent-text))";
const LIGHT = "rgb(var(--cream-bright))";

/**
 * The parts that do not change per instance.
 *
 * The text keeps its base colour until the browser is known to clip a
 * background to glyphs (@supports), so it can never render invisible. Reduced
 * motion, forced colours and print each drop the gradient and draw plain
 * text — `!important` because the gradient itself is an inline style.
 *
 * No quotes, no `>` and no `&` in here: React escapes text children when it
 * renders on the server, and a <style> element does not decode entities.
 */
const CSS = `
@keyframes mockio-shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0% 0; }
}
.mockio-shimmer {
  color: ${BASE};
  background-repeat: no-repeat;
  animation-name: mockio-shimmer;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .mockio-shimmer {
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
  }
}
.mockio-shimmer::selection {
  color: rgb(var(--accent-ink));
  -webkit-text-fill-color: rgb(var(--accent-ink));
  background-color: rgb(var(--accent));
}
.mockio-shimmer:dir(rtl) {
  animation-direction: reverse;
}
@media (prefers-reduced-motion: reduce) {
  .mockio-shimmer {
    animation: none;
    background-image: none !important;
    color: ${BASE} !important;
  }
}
@media (forced-colors: active) {
  .mockio-shimmer {
    animation: none;
    background-image: none !important;
    color: CanvasText !important;
  }
}
@media print {
  .mockio-shimmer {
    animation: none;
    background-image: none !important;
    color: ${BASE} !important;
  }
}
`;

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

/**
 * Where the light sits and how far it travels, so one keyframe serves every
 * speed and pause.
 *
 * The gradient is k text-widths wide and slides from background-position 100%
 * to 0% over one cycle, which moves it (k − 1) widths to the right. The band
 * has to cover its own width plus the text's in `speed` seconds and spend the
 * rest of the cycle off to the left, so k − 1 = (1 + BAND) × cycle / speed.
 * The band is placed so it leaves the right edge exactly as the cycle ends:
 * the jump back to the start happens while it is out of sight.
 */
function geometry(speed: number, pause: number) {
  const sweep = Number.isFinite(speed) && speed > 0 ? speed : DEFAULT_SPEED;
  const rest = Number.isFinite(pause) && pause > 0 ? pause : 0;
  const cycle = sweep + rest;
  const k = 1 + ((1 + BAND) * cycle) / sweep;
  const centre = (1 + BAND / 2) / k;
  const half = BAND / 2 / k;
  return {
    cycle,
    size: k,
    image: `linear-gradient(90deg, ${BASE} 0%, ${BASE} ${pct(centre - half)}, ${LIGHT} ${pct(centre)}, ${BASE} ${pct(centre + half)}, ${BASE} 100%)`,
  };
}

/**
 * Text with a slow, soft light crossing it every few seconds.
 *
 * CSS only: a gradient of two tokens clipped to the glyphs, its position
 * animated. The text is real text — selectable, translatable, read as
 * written — and every pixel of it is a mix of accent-text and cream-bright,
 * so no frame has less contrast than the base colour alone.
 */
export function ShimmerText({ children, speed = DEFAULT_SPEED, pause = DEFAULT_PAUSE, disabled = false, className = "" }: ShimmerTextProps) {
  // Read on mount; the media query in CSS covers a server render and a
  // setting changed while the page is open.
  const reduce = useReducedMotion() === true;

  if (disabled || reduce) {
    return <span className={`inline-block text-accent-text ${className}`}>{children}</span>;
  }

  const { cycle, size, image } = geometry(speed, pause);
  const style: CSSProperties = {
    backgroundImage: image,
    backgroundSize: `${(size * 100).toFixed(3)}% 100%`,
    animationDuration: `${Number(cycle.toFixed(3))}s`,
  };

  return (
    <>
      <style>{CSS}</style>
      <span className={`mockio-shimmer inline-block ${className}`} style={style}>
        {children}
      </span>
    </>
  );
}
