import type { HTMLAttributes, ReactNode } from "react";

export interface ScreenFrameProps extends HTMLAttributes<HTMLDivElement> {
  /** The product, drawn as the product draws it: the interface itself. */
  children: ReactNode;
  /**
   * Extra classes, appended: the frame's size and the padding of the
   * interface inside it. Not the fill and not the edge — those are the
   * frame's.
   */
  className?: string;
  /** The call is always dark, as a video call is, whatever the theme. */
  dark?: boolean;
}

/**
 * A piece of the product, drawn as the product draws it: a window with a
 * hairline, and the interface inside.
 *
 * Stripe's way of showing what a thing is instead of describing it. The
 * interface inside is the real thing — a live transcript, a real card — so
 * what the reader sees on the landing page is what they will meet in the
 * product.
 *
 * The frame is hidden from assistive technology: it is a picture of the
 * product, and the page says the same thing in words next to it. A screen
 * reader that read both would say everything twice.
 */
export function ScreenFrame({ children, className = "", dark = false, ...props }: ScreenFrameProps) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-card ring-1 ring-line ${dark ? "on-media bg-surface-base" : "bg-surface-card"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
