import type { HTMLAttributes, ReactNode } from "react";

export interface InsetPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** What the inset holds: a row, a list, a short piece of copy. */
  children: ReactNode;
  /**
   * Extra classes, appended: the panel's own layout (a flex row, a grid)
   * and its padding when the content needs less or more room. Not the fill.
   */
  className?: string;
}

/**
 * The recessed panel inside a widget.
 *
 * A step of the widget's own surface, so a row inside a card reads as
 * belonging to it rather than floating next to it. `Panel` is the other
 * half of the pair: the block, and the well inside it.
 */
export function InsetPanel({ children, className = "", ...props }: InsetPanelProps) {
  return (
    <div className={`rounded-2xl bg-surface-lift p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
