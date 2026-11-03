import type { HTMLAttributes, ReactNode } from "react";

export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  /** The icon or the figure that goes in the tile. */
  children: ReactNode;
  /**
   * Extra classes, appended: the tile's own size when it has to grow with
   * the icon inside it. Not the fill and not the colour.
   */
  className?: string;
}

/**
 * A small amber-tint square holding an icon or a number.
 *
 * The trail-dashboard way of numbering things: the number is in the tile and
 * the tile is in the accent, so a row of three reads as three steps before
 * the reader has read a word.
 *
 * The tile is hidden from assistive technology: the number or the icon in it
 * is decoration next to words that already say it.
 */
export function IconTile({ children, className = "", ...props }: IconTileProps) {
  return (
    <span
      aria-hidden
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-mono text-sm font-medium text-accent-text ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
