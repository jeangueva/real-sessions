import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export type ActionTone = "solid" | "neutral" | "glass" | "ghost";

export interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The label. A verb first: "Ensayar", "Sube tu tesis gratis". */
  children: ReactNode;
  /**
   * solid = the one primary action per view, in the accent.
   * neutral = a confident secondary — ink on paper.
   * glass = over video or imagery. ghost = tertiary.
   */
  tone?: ActionTone;
  /** Adds a trailing arrow. Reserve it for the primary path forward. */
  withArrow?: boolean;
}

const TONE: Record<ActionTone, string> = {
  // Disabled is grey rather than the accent at 40%: a pale violet pill still
  // reads as "press me", just faintly. The darker edge underneath is the key's
  // side; the press translates by its height, so the face lands where the
  // edge was — it reads as pushed, not as shrunk.
  solid:
    "bg-accent text-accent-ink shadow-[0_4px_0_rgb(var(--accent-depth))] hover:brightness-110 active:translate-y-[4px] active:shadow-[0_0_0_rgb(var(--accent-depth))] disabled:bg-surface-lift disabled:text-cream-faint disabled:opacity-100 disabled:shadow-none",
  neutral:
    "bg-cream-bright text-surface-base shadow-[0_4px_0_rgb(0_0_0/0.35)] hover:bg-cream-bright/90 active:translate-y-[4px] active:shadow-none",
  glass:
    "liquid-glass text-cream-bright shadow-[inset_0_0_0_1px_var(--line),0_3px_0_var(--line-strong)] hover:bg-surface-lift active:translate-y-[3px] active:shadow-[inset_0_0_0_1px_var(--line)]",
  ghost: "text-cream-dim hover:bg-surface-lift hover:text-cream-bright",
};

/**
 * The only button.
 *
 * Feedback lives on the press, not the release: the press answers the finger
 * in 75ms, which is the difference between a control and a picture of one.
 * No lift on hover and no coloured glow — a pill in the accent is already the
 * loudest thing on the screen.
 */
export function Action({ children, tone = "solid", withArrow = false, className = "", type = "button", ...props }: ActionProps) {
  return (
    <button
      type={type}
      className={`focus-ring group inline-flex select-none items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-[-0.01em] transition-[transform,box-shadow,background-color,color,opacity,filter] duration-150 ease-press active:duration-75 disabled:pointer-events-none disabled:opacity-40 sm:text-base ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
      {withArrow && (
        <ArrowRight
          // Forward is leftward in Arabic and Hebrew, so the arrow turns with
          // the document. It nudges toward where it points on hover.
          className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
          aria-hidden
        />
      )}
    </button>
  );
}
