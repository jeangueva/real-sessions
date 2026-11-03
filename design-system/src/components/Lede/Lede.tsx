import type { HTMLAttributes, ReactNode } from "react";

export interface LedeProps extends HTMLAttributes<HTMLParagraphElement> {
  /** The sentence under the title: what this block is, in one paragraph. */
  children: ReactNode;
  /**
   * Extra classes, appended: the paragraph's own spacing and its measure.
   * Not the size or the colour — those are the lede's.
   */
  className?: string;
}

/**
 * The sentence under a title: what the block is, in one paragraph.
 *
 * Larger than the body's text and lighter than the title, so the eye reads
 * the title, then this, and then the block. `text-pretty` keeps it from
 * leaving a word alone on the last line, which is what a paragraph of copy
 * about a product tends to do.
 */
export function Lede({ children, className = "", ...props }: LedeProps) {
  return (
    <p className={`text-pretty text-lg leading-relaxed text-cream-dim sm:text-xl ${className}`} {...props}>
      {children}
    </p>
  );
}
