/**
 * UI primitives. Every surface, button, and label in the product is one of
 * these — a new screen should compose them, not restyle from scratch.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";

type Tone = "solid" | "neutral" | "glass" | "ghost";

interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * solid = the one primary action per view, in the accent.
   * neutral = a confident secondary — ink on paper, the Apple "Buy" pill.
   * glass = over video. ghost = tertiary.
   */
  tone?: Tone;
  /** Adds a trailing arrow. Reserve it for the primary path forward. */
  withArrow?: boolean;
}

const TONE: Record<Tone, string> = {
  solid: "bg-accent text-accent-ink hover:bg-accent/90",
  neutral: "bg-cream-bright text-surface-base hover:bg-cream-bright/85",
  glass: "liquid-glass text-cream-bright hover:bg-surface-lift",
  ghost: "text-cream-dim hover:bg-surface-lift hover:text-cream-bright",
};

/**
 * The only button.
 *
 * Feedback lives on the press, not the release: `active:scale` answers the
 * finger in 100ms, which is the difference between a control and a picture of
 * one. No lift on hover and no coloured glow — both read as a web page trying
 * to be noticed, and a pill in the accent is already the loudest thing here.
 */
export function Action({
  children,
  tone = "solid",
  withArrow = false,
  className = "",
  ...props
}: ActionProps) {
  return (
    <button
      className={`focus-ring group inline-flex select-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-[-0.01em] transition-[transform,background-color,color,opacity] duration-200 ease-press active:scale-[0.97] active:duration-100 disabled:pointer-events-none disabled:opacity-40 sm:text-base ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
      {withArrow && (
        <ArrowRight
          /* Forward is leftward in Arabic and Hebrew, so the arrow turns with
             the document — the browser cannot know this glyph means "next"
             rather than "right". It nudges toward where it points on hover,
             which is the whole of its animation. */
          className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
          aria-hidden
        />
      )}
    </button>
  );
}

/** The line above a headline, Apple's way: the accent, in weight, not spaced caps. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm font-semibold text-accent-text ${className}`}>
      {children}
    </p>
  );
}

/**
 * A raised content block. `card` is the lighter shade used inside grids;
 * `raised` is for a single centered block on the page background.
 */
export function Panel({
  children,
  variant = "card",
  className = "",
  id,
  role,
  "aria-labelledby": labelledBy,
}: {
  children: ReactNode;
  variant?: "card" | "raised" | "glass";
  className?: string;
  /** For a panel a link or a tab has to be able to name. */
  id?: string;
  role?: string;
  "aria-labelledby"?: string;
}) {
  /* A shadow rather than a border: the shadow token carries its own hairline,
     so a card separates from white and from #F5F5F7 alike without a grey
     rule drawn around every panel. */
  const surface =
    variant === "glass"
      ? "liquid-glass"
      : variant === "raised"
        ? "bg-surface-raised shadow-card"
        : "bg-surface-card shadow-card";
  return (
    <div
      id={id}
      role={role}
      aria-labelledby={labelledBy}
      className={`overflow-hidden rounded-card ${surface} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Page section. Owns vertical rhythm so individual screens never hand-tune
 * padding and drift apart.
 */
export function Section({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`px-4 py-20 sm:px-6 sm:py-28 lg:px-10 lg:py-36 ${className}`}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

/**
 * Full-bleed inset frame — the hero treatment. The page background shows as a
 * margin around it, which is what makes the composition feel like film.
 */
export function InsetFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="h-[100svh] p-2 md:p-3">
      <div
        className={`relative h-full overflow-hidden rounded-2xl md:rounded-inset ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Checklist row used across feature cards. */
export function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-cream-dim">
      <Check
        aria-hidden
        strokeWidth={2.5}
        className="mt-[0.2em] h-4 w-4 shrink-0 text-accent-text"
      />
      {children}
    </li>
  );
}

/**
 * Score readout. Colour never carries the meaning on its own — the number is
 * always present — so it stays readable for colour-blind users.
 */
export function Meter({
  value,
  max = 100,
  label,
  suffix = "%",
}: {
  value: number;
  max?: number;
  label: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-cream-dim">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-cream-bright">
          {value}
          {suffix}
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-cinematic"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Inline status marker. Text carries the meaning; the dot is decoration. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "live";
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-lift px-3 py-1 text-xs font-medium text-cream-dim">
      {tone === "live" && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent animate-blink" />
      )}
      {children}
    </span>
  );
}

/** Labeled form control wrapper. Keeps label/field/hint spacing consistent. */
export function Field({
  label,
  hint,
  children,
  htmlFor,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
  /** For a field that spans more than its cell in a grid. */
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-cream">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-cream-faint">{hint}</p>}
    </div>
  );
}

/**
 * The crown on a paid option.
 *
 * One mark for everything the free plan cannot use, wherever it appears — a
 * nav entry, a filter, a template — so a candidate learns it once. It names
 * what is behind it rather than refusing: the option stays visible and
 * clickable, and what happens on the click is the screen's to decide.
 */
export function PremiumMark({
  label,
  className = "",
}: {
  /** Read out instead of the icon, e.g. "Premium". */
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-premium-soft text-premium ${className}`}
    >
      <Crown aria-hidden className="h-3 w-3" strokeWidth={2.5} fill="currentColor" />
    </span>
  );
}
