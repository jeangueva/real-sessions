import type { HTMLAttributes, ReactNode } from "react";

export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * A step number in two digits ("01") or one icon at h-5 w-5. Decoration:
   * the tile is hidden from assistive technology, so the words beside it (or
   * an <ol>) must carry the meaning.
   */
  children: ReactNode;
  /** Extra classes, appended. Layout only (margin, self-start) — not a size, fill or colour. */
  className?: string;
}

/**
 * The small amber-tint square of the widget kit, holding a step number or an
 * icon at the head of a row or a step.
 *
 * Always aria-hidden: "01" beside "Sube tu tesis" is drawing the order an
 * <ol> already announces, and an icon beside words repeats them. A tile that
 * would be the only carrier of meaning is the wrong component.
 */
export function IconTile({ children, className = "", ...props }: IconTileProps) {
  return (
    <span
      {...props}
      aria-hidden
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-mono text-sm font-medium text-accent-text ${className}`}
    >
      {children}
    </span>
  );
}
