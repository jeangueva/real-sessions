import { ChevronDown } from "lucide-react";

/**
 * The sign that a card opens.
 *
 * A `<details>` summary drawn as a card reads as a card: nothing about it says
 * there is more inside. This mark sits at the summary's right edge — a pill
 * with a chevron that turns over as it opens, and on the larger ones the word
 * for what clicking does ("Completar", "Ver planes"), swapped for "Cerrar"
 * once open. The turn and the swap are CSS on `details[open] > summary`, so
 * they follow the element's own state with no JavaScript, and only the
 * nearest disclosure answers — a closed one inside an open one stays closed.
 */
export function DisclosureMark({
  label,
  openLabel,
  className = "",
}: {
  /** What opening does, for the larger disclosures. Icon only when absent. */
  label?: string;
  /** What it says once open. */
  openLabel?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`disclosure-pill inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-surface-lift text-sm font-semibold text-cream-bright transition-colors duration-150 ease-press ${
        label ? "px-3 py-1.5" : "h-8 w-8"
      } ${className}`}
    >
      {label && (
        <>
          <span className="disclosure-when-closed">{label}</span>
          <span className="disclosure-when-open">{openLabel ?? label}</span>
        </>
      )}
      <ChevronDown className="disclosure-mark h-4 w-4" />
    </span>
  );
}
