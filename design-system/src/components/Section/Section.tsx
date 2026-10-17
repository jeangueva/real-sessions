import type { HTMLAttributes, ReactNode } from "react";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** The band's content. It is centred in a max-w-7xl column inside the section. */
  children: ReactNode;
  /**
   * Extra classes for the outer <section>: the band's background
   * (bg-surface-base, bg-surface-deep) and positioning (relative). They land on
   * the full-bleed element, not on the content column, so a grid goes inside.
   */
  className?: string;
  /** The anchor the landing nav scrolls to: "pricing", "features". */
  id?: string;
}

/**
 * A band of a marketing page.
 *
 * It owns the vertical rhythm and the side gutters so individual landing
 * sections never hand-tune padding and drift apart: 80px above and below on a
 * phone, 112px from sm, 144px from lg. Two elements on purpose — the
 * background in className bleeds to both edges of the window, while the
 * content stays in one centred column.
 *
 * Every other <section> attribute is passed through, so the band can be named
 * by its heading (aria-labelledby) and appear in the landmarks list.
 */
export function Section({ children, className = "", id, ...props }: SectionProps) {
  return (
    <section id={id} className={`px-4 py-20 sm:px-6 sm:py-28 lg:px-10 lg:py-36 ${className}`} {...props}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
