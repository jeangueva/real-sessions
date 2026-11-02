import type { HTMLAttributes, ReactNode } from "react";

/**
 * What the verdict means for the student, not which colour it is:
 * attention = deal with this first, caution = it will cost something,
 * positive = it holds, neutral = a minor point.
 */
export type TagTone = "attention" | "caution" | "positive" | "neutral";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** The verdict, in one to three words: "Grave", "Débil", "Coherente". The words carry the meaning. */
  children: ReactNode;
  /**
   * attention = the most serious ("Grave", "Incoherente"), on step.
   * caution = will cost something ("Te costará puntos", "Débil"), on the accent.
   * positive = it holds ("Coherente"), on grow.
   * neutral = a minor point ("De forma"), on the lifted surface.
   */
  tone?: TagTone;
  /** Extra classes, appended. For layout (margin, shrink-0) — not for recolouring the pill. */
  className?: string;
}

// Soft fill and its paired text token, so every tone keeps its contrast in
// both themes. Step is orange: nothing in this product is red.
const TONE: Record<TagTone, string> = {
  attention: "bg-step-soft text-step-text",
  caution: "bg-accent-soft text-accent-text",
  positive: "bg-grow-soft text-grow-text",
  neutral: "bg-surface-lift text-cream-dim",
};

/**
 * A verdict on one piece of the student's work — a risk the jury will see,
 * an objective checked for coherence — as a small coloured pill.
 *
 * Not a control and not a status of the screen (that is Badge): the words
 * are the verdict, and the colour only helps the eye sort a list by it.
 */
export function Tag({ children, tone = "neutral", className = "", ...props }: TagProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}
