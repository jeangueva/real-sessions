import type { HTMLAttributes, ReactNode } from "react";

export interface MonoLabelProps extends HTMLAttributes<HTMLParagraphElement> {
  /** The card's or the section's own name, in a word or two: "Cómo funciona", "Pack Sustentación". Uppercased by the style. */
  children: ReactNode;
  /** Extra classes, appended. For layout (margin, shrink-0 in a row) — not for colour, size or case. */
  className?: string;
}

/**
 * "::LABEL", the name of a card or a section in the instrument voice: mono,
 * spaced caps, cream-dim, led by two colons.
 *
 * A paragraph, like Eyebrow: the heading under it (if any) is the block's
 * name in a screen reader's list of headings, and the label is context read
 * on the way in. The colons are drawing, not words, so they are hidden from
 * assistive technology and the label reads as its text.
 */
export function MonoLabel({ children, className = "", ...props }: MonoLabelProps) {
  return (
    <p className={`font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim ${className}`} {...props}>
      <span aria-hidden className="tracking-[-0.1em]">
        ::
      </span>
      {children}
    </p>
  );
}
