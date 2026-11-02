import type { HTMLAttributes, ReactNode } from "react";

export interface MonoLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  /** The label itself: the card's own name, in capitals. "GENERAL", "TU CUENTA". */
  children: ReactNode;
  /** Extra classes, appended. For layout (margin, a grid span) — not for colour or case. */
  className?: string;
}

/**
 * The name of a block, in the instrument voice: mono, capitals, a tight "::"
 * in front.
 *
 * It is the voice the dashboards are written in — the label on a card, the
 * section marker on a page. It is not a heading: the heading under it says
 * what the thing is, and this says which one it is.
 */
export function MonoLabel({ children, className = "", ...props }: MonoLabelProps) {
  return (
    <p className={`font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim ${className}`} {...props}>
      {/* The "::" is punctuation, not a word: it is hidden from screen readers
          so the label is read as "GENERAL" and not as "colon colon GENERAL". */}
      <span aria-hidden className="tracking-[-0.1em]">::</span>
      {children}
    </p>
  );
}
