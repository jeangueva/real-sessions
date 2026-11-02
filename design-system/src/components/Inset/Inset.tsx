import type { HTMLAttributes, ReactNode } from "react";

export interface InsetProps extends HTMLAttributes<HTMLDivElement> {
  /** What the well groups: a numbered row, a price, a step's tile and title. */
  children: ReactNode;
  /**
   * Extra classes, appended. Layout (flex, items-center, gap-3) and a tighter
   * padding for a row (p-3, px-4 py-3) — not a fill or a radius.
   */
  className?: string;
}

/**
 * The darker well inside a Widget: one group of its content — a row of a
 * list, the price of a tier, the number and title of a step.
 *
 * A wash rather than a surface: surface-lift is a few percent of the ink laid
 * over whatever is behind it, so on a card it reads as a recess and on the
 * page ground it reads as nothing. That is why it lives only inside a card.
 */
export function Inset({ children, className = "", ...props }: InsetProps) {
  return (
    <div className={`rounded-2xl bg-surface-lift p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
