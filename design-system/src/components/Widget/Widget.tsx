import type { HTMLAttributes, ReactNode } from "react";
import { MonoLabel } from "../MonoLabel";

export interface WidgetProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * What the widget holds, stacked with gap-4: a heading and a line of body,
   * Insets, a list, a price. Widget sets its own padding (p-5, sm:p-6).
   */
  children: ReactNode;
  /**
   * The widget's own name, drawn as a MonoLabel ("::EL PRODUCTO") at its top.
   * 1–4 words in sentence case; leave it off when the content's first line
   * already names the widget.
   */
  label?: ReactNode;
  /**
   * The recommended one of a set (the middle pricing tier): the hairline
   * becomes a 2px accent ring. One per set at most.
   */
  featured?: boolean;
  /** Extra classes, appended. Layout and height (h-full, justify-center) — not a fill, a ring or a radius. */
  className?: string;
}

/**
 * The widget kit's card: the trail-dashboard look the landing's sections
 * share. A card-coloured surface floating on the page with no shadow, only a
 * hairline ring, its content stacked with one gap, and an optional mono
 * "::LABEL" naming it at the top.
 *
 * Not a Panel: a Panel carries the card shadow and no padding, so it can hold
 * anything; a Widget is flat, pads itself and stacks its children, so every
 * widget on a landing reads as one instrument panel. Groups inside it are
 * Insets, never a second Widget.
 */
export function Widget({ children, label, featured = false, className = "", ...props }: WidgetProps) {
  // The ring is swapped, not layered: ring-line is emitted after ring-accent
  // in the generated CSS, so an accent ring added through className would lose.
  const edge = featured ? "ring-2 ring-accent" : "ring-1 ring-line";
  return (
    <div className={`flex flex-col gap-4 rounded-card bg-surface-card p-5 sm:p-6 ${edge} ${className}`} {...props}>
      {label && <MonoLabel>{label}</MonoLabel>}
      {children}
    </div>
  );
}
