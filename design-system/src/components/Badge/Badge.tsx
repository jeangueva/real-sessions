import type { HTMLAttributes, ReactNode } from "react";

export type BadgeTone = "neutral" | "live";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** The status, in a few words: "Práctica", "Turno 3 de 8". The words carry the meaning. */
  children: ReactNode;
  /**
   * neutral = a fact about the screen: the mode, a setting in force.
   * live = something is happening right now; adds a breathing accent dot.
   */
  tone?: BadgeTone;
  /** Extra classes, appended. For layout — not for recolouring the pill. */
  className?: string;
}

/**
 * Inline status marker. Text carries the meaning; the dot is decoration.
 *
 * Not a control: it has no focus, no hover and no press, so it never looks
 * like something to tap. A status you can change is a Segmented or an Action.
 */
export function Badge({ children, tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-surface-lift px-3 py-1 text-xs font-medium text-cream-dim ${className}`}
      {...props}
    >
      {tone === "live" && (
        // A breath, not a blink, and only when the reader allows motion:
        // motion-safe is a prefers-reduced-motion media query in the class
        // itself, so it needs no provider and follows a change of the setting
        // at once. Otherwise the dot holds still at full strength — it still
        // says "live", it just does not move.
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-live" />
      )}
      {children}
    </span>
  );
}
