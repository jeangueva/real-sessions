/**
 * The pieces the public product pages are built from — the defence landing,
 * the affiliate page, the institutions page — so they read as one site:
 * one column width, one title size, one way of showing the product.
 */
import type { ReactNode } from "react";

/** The page's one column: 1200px of content, the same gutters everywhere. */
export function Wrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[75rem] px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** A section title, Apple's way: big, tight, left-aligned, nothing above it. */
export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-cream-bright ${className}`}
    >
      {children}
    </h2>
  );
}

export function Lede({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-pretty text-lg leading-relaxed text-cream-dim sm:text-xl ${className}`}>{children}</p>;
}

/**
 * A piece of the product, drawn as the product draws it: a window with a
 * hairline, a soft wide shadow, and the interface inside. Stripe's way of
 * showing what a thing is instead of describing it.
 */
export function Screen({
  children,
  className = "",
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  /** The call is always dark, as a video call is, whatever the theme. */
  dark?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`overflow-hidden rounded-[1.25rem] shadow-[0_0_0_1px_var(--line),0_24px_60px_-20px_rgb(0_0_0/0.25)] ${
        dark ? "bg-[#0b0b0f]" : "bg-surface-card"
      } ${className}`}
    >
      {children}
    </div>
  );
}

