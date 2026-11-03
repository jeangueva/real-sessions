import type { HTMLAttributes, ReactNode } from "react";
import { MonoLabel } from "../MonoLabel";

export interface WidgetProps extends HTMLAttributes<HTMLDivElement> {
  /** The block's content: a list, a card, a piece of the interface. */
  children: ReactNode;
  /** The block's label, in the instrument voice: "03 · Método". */
  label?: ReactNode;
  /**
   * Extra classes, appended: the block's own layout (a grid, a flex column)
   * and its height. Not the fill, the edge or the padding — those are the
   * widget's.
   */
  className?: string;
}

/**
 * A cream card floating on the page: no shadow, a hairline at most.
 *
 * The public site's own block, and the one the signed-in product borrows for
 * its training screens. Its label is a `MonoLabel` — the instrument voice,
 * two colons and a word in caps — so the eye knows what it is reading
 * before it reads it.
 */
export function Widget({ children, label, className = "", ...props }: WidgetProps) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-[1.375rem] bg-surface-card p-5 ring-1 ring-line sm:p-6 ${className}`}
      {...props}
    >
      {label && <MonoLabel>{label}</MonoLabel>}
      {children}
    </div>
  );
}
