/**
 * The pieces the public product pages are built from — the landing page, the
 * institutions page, the affiliate page — so they read as one site: one
 * column width, one title size, one way of showing the product.
 *
 * The system's own copy of these lives in the design system package; this
 * one is the product's, and the contract of each component says how the two
 * differ.
 */
import type { ReactNode } from "react";
import { MonoLabel } from "./primitives";

/** The page's one column: 1200px of content, the same gutters everywhere. */
export function ContentColumn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[75rem] px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** A section title: big, light and tight, the trail dashboard's way. */
export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright ${className}`}
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
export function ScreenFrame({
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
      className={`overflow-hidden rounded-card ring-1 ring-line ${
        dark ? "on-media bg-surface-base" : "bg-surface-card"
      } ${className}`}
    >
      {children}
    </div>
  );
}


/* ---------------------------------------------------------------------------
 * The widget kit: the trail-dashboard look the sections below the hero and the
 * signed-in product share. Cream cards with no shadow, darker inset panels
 * inside them, mono "::LABELS", amber-tint icon tiles and peach chips.
 * ------------------------------------------------------------------------- */

/** A cream card floating on the page: no shadow, a hairline at most. */
export function Widget({
  children,
  label,
  className = "",
}: {
  children: ReactNode;
  label?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 rounded-[1.375rem] bg-surface-card p-5 ring-1 ring-line sm:p-6 ${className}`}>
      {label && <MonoLabel>{label}</MonoLabel>}
      {children}
    </div>
  );
}

/** The darker panel inside a widget. */
export function InsetPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface-lift p-4 ${className}`}>{children}</div>;
}

/** A small amber-tint square holding an icon or a number. */
export function IconTile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft font-mono text-sm font-medium text-accent-text ${className}`}
    >
      {children}
    </span>
  );
}

/** A peach chip in mono caps: a fact, never a control. */
export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[0.5625rem] bg-chip px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-chip-ink ${className}`}
    >
      {children}
    </span>
  );
}
