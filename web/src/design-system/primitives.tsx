/**
 * UI primitives. Every surface, button, and label in the product is one of
 * these — a new screen should compose them, not restyle from scratch.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Tone = "solid" | "glass" | "ghost";

interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** solid = the one primary action per view. glass = over video. ghost = tertiary. */
  tone?: Tone;
  /** Adds the trailing arrow disc. Reserve it for the primary path forward. */
  withArrow?: boolean;
}

const TONE: Record<Tone, string> = {
  solid: "bg-cream text-black hover:gap-3",
  glass: "liquid-glass text-cream-bright hover:bg-white/5",
  ghost: "text-cream-dim hover:text-cream-bright",
};

export function Action({
  children,
  tone = "solid",
  withArrow = false,
  className = "",
  ...props
}: ActionProps) {
  return (
    <button
      className={`focus-ring group inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-all duration-300 ease-cinematic sm:text-base ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
      {withArrow && (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black transition-transform duration-300 ease-cinematic group-hover:scale-110 sm:h-10 sm:w-10">
          <ArrowRight className="h-4 w-4 text-cream-bright" aria-hidden />
        </span>
      )}
    </button>
  );
}

/** Small uppercase-ish section marker. Sets context above a headline. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.18em] text-cream sm:text-xs">
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
}: {
  children: ReactNode;
  variant?: "card" | "raised" | "glass";
  className?: string;
}) {
  const surface =
    variant === "glass"
      ? "liquid-glass"
      : variant === "raised"
        ? "bg-surface-raised"
        : "bg-surface-card";
  return (
    <div className={`overflow-hidden rounded-2xl ${surface} ${className}`}>
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
    <div className="h-screen p-4 md:p-6">
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
    <li className="flex items-start gap-2 text-xs text-cream-dim sm:text-sm">
      <span
        aria-hidden
        className="mt-[0.35em] h-1 w-1 shrink-0 rounded-full bg-cream"
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
        <span className="text-sm font-bold text-cream-bright">
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
        className="h-1 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-cream transition-[width] duration-700 ease-cinematic"
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
    <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-cream-dim">
      {tone === "live" && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream animate-blink" />
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
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-xs text-cream-dim">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-cream-faint">{hint}</p>}
    </div>
  );
}
