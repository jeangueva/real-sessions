import type { LiHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

export interface CheckItemProps extends LiHTMLAttributes<HTMLLIElement> {
  /** What is included, as a short phrase: "Entrevistas ilimitadas". */
  children: ReactNode;
  /** Extra classes, appended. For spacing or a grid span — not for the ink. */
  className?: string;
}

/**
 * One row of a checklist: something a plan or an offer includes.
 *
 * It is an <li>, so the caller owns the <ul> — and the label that says what
 * the checks mean ("Qué incluye"). The check itself is decoration: a list of
 * included things reads the same without it, which is why it is hidden from
 * screen readers rather than announced as "check" on every row.
 */
export function CheckItem({ children, className = "", ...props }: CheckItemProps) {
  return (
    <li className={`flex items-start gap-2.5 text-sm text-cream-dim ${className}`} {...props}>
      <Check aria-hidden strokeWidth={2.5} className="mt-[0.2em] h-4 w-4 shrink-0 text-accent-text" />
      {/* One flex item for the words, so a bold phrase or a link inside them
          stays in the sentence instead of becoming a column of its own. */}
      <span className="min-w-0">{children}</span>
    </li>
  );
}
