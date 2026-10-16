import type { HTMLAttributes, ReactNode } from "react";

export interface EyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  /** The kicker: a few words that place the heading under it. "Precios", "Acta simulada". */
  children: ReactNode;
  /** Extra classes, appended. For layout (margin, a grid span) — not for colour or case. */
  className?: string;
}

/**
 * The line above a headline: the accent, in weight, not spaced caps.
 *
 * It is a paragraph on purpose. The heading under it is the section's name
 * and its entry in a screen reader's list of headings; the eyebrow is context
 * read on the way in. Making it a heading would give every section two names,
 * the first one the vaguer of the two.
 */
export function Eyebrow({ children, className = "", ...props }: EyebrowProps) {
  return (
    <p className={`text-sm font-semibold text-accent-text ${className}`} {...props}>
      {children}
    </p>
  );
}
