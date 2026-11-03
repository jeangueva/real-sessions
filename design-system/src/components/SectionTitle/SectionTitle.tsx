import type { HTMLAttributes, ReactNode } from "react";

export interface SectionTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The title's words: "Ensaya con el panel de 3 jurados". */
  children: ReactNode;
  /**
   * Extra classes, appended: the title's own spacing above it, and the
   * measure when a title has to wrap sooner (max-w-2xl). Not the size, the
   * weight or the colour — those are the title's.
   */
  className?: string;
}

/**
 * The heading of a block of the public site: a section's title, or the title
 * of a Widget inside one.
 *
 * Big, light and tight, the trail-dashboard way. The size follows the
 * viewport, so the title of a phone is 32px and of a wide desktop 56px, and
 * it never gets in the way of the sentence under it.
 *
 * It is an `h2`, never an `h1`: the page's own title is the `h1`, and a
 * heading that says something else about the page's structure is a lie to a
 * screen reader.
 */
export function SectionTitle({ children, className = "", ...props }: SectionTitleProps) {
  return (
    <h2
      className={`text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
}
