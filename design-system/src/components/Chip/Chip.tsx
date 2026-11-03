import type { HTMLAttributes, ReactNode } from "react";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** The fact: "LATAM", "HIPÓTESIS · PRIORIZACIÓN". */
  children: ReactNode;
  /**
   * Extra classes, appended: the chip's own placement (a margin, a wrap).
   * Not the fill and not the ink — those are the chip's, and a chip that
   * changes them stops being a fact.
   */
  className?: string;
}

/**
 * A peach chip in mono caps: a fact, never a control.
 *
 * The instrument voice, in a warm wash: the name of a region, the three
 * things a product does, the price of a plan. It has no focus, no hover and
 * no press, so it never looks like something to tap.
 *
 * The peach is the same in both themes: a light fill with the dark ink on it
 * reads as a fact in either.
 */
export function Chip({ children, className = "", ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[0.5625rem] bg-chip px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-chip-ink ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
