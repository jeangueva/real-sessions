import { ChevronDown } from "lucide-react";
import type { HTMLAttributes } from "react";

export interface DisclosureMarkProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** What opening does, for the larger disclosures: "Ver", "Ver planes", "Completar". Icon only when absent. */
  label?: string;
  /** What it says once open. Only shown when label is set. */
  openLabel?: string;
  /** Extra classes, appended. For layout (-my-1 in a tight row) or a fill that separates it from a lifted summary (bg-surface-card). */
  className?: string;
}

/**
 * The sign that a card opens.
 *
 * A `<details>` summary drawn as a card reads as a card: nothing about it says
 * there is more inside. This mark sits at the summary's end — a pill with a
 * chevron that turns over as it opens, and on the larger ones the word for
 * what clicking does ("Ver", "Ver planes"), swapped for "Cerrar" once open.
 * The turn and the swap are CSS on `details[open] > summary` (styles.css), so
 * they follow the element's own state with no JavaScript, and only the
 * nearest disclosure answers — a closed one inside an open one stays closed.
 *
 * It must be a descendant of a `<summary>`. It is hidden from assistive
 * technology: the summary's own text names the disclosure, and the browser
 * announces expanded or collapsed.
 */
export function DisclosureMark({ label, openLabel = "Cerrar", className = "", ...props }: DisclosureMarkProps) {
  return (
    <span
      {...props}
      aria-hidden
      className={`disclosure-pill inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-surface-lift text-sm font-semibold text-cream-bright transition-[background-color,transform] duration-150 ease-press ${
        label ? "px-3 py-1.5" : "h-8 w-8"
      } ${className}`}
    >
      {label && (
        <>
          <span className="disclosure-when-closed">{label}</span>
          <span className="disclosure-when-open">{openLabel}</span>
        </>
      )}
      <ChevronDown className="disclosure-mark h-4 w-4" />
    </span>
  );
}
