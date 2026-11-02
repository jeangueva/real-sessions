import type { HTMLAttributes, ReactNode } from "react";

export type ChipTone = "soft" | "accent";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** The fact, in 1–3 words, sentence case in the source: the style uppercases it. "Perú", "Recomendado". */
  children: ReactNode;
  /**
   * soft = the amber wash, for a row of facts (the countries the panel follows).
   * accent = the amber fill, for the one chip that marks the recommended tier.
   */
  tone?: ChipTone;
  /** Extra classes, appended. Layout only (shrink-0, margin) — not a fill, colour or radius: that is the tone. */
  className?: string;
}

const TONE: Record<ChipTone, string> = {
  soft: "bg-accent-soft text-cream",
  accent: "bg-accent text-accent-ink",
};

/**
 * A chip in mono caps: a fact, never a control. The countries whose jury
 * format the panel follows, the "Recomendado" over a pricing tier.
 *
 * A plain <span>. It does not press, toggle or dismiss; a row of options the
 * person picks from is Segmented, and a status of the screen is Badge.
 */
export function Chip({ children, tone = "soft", className = "", ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] ${TONE[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
