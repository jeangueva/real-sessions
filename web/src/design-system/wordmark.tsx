import { Mark } from "./mark";

/**
 * The wordmark.
 *
 * Defined once because it appears in two places that are nothing alike — a
 * display-size headline on the landing and a 14px label in the app sidebar —
 * and a logo that drifts between them is not a logo.
 *
 * Always lowercase, and set in the mark face rather than the page's own
 * heading font. Written as a literal rather than pulled from the dictionary:
 * a product name is not translated, and routing it through `t()` would invite
 * exactly that.
 */
export function Wordmark({ className = "", mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[0.35em] font-mark lowercase tracking-[-0.03em] ${className}`}
      /* The name, not a sentence — so a screen reader says it as a word and
         a translation tool leaves it alone. */
      translate="no"
    >
      {/* The isologo: the mark at the height of the name's capitals plus a
          little, so the two read as one unit at any size the name is set. */}
      {mark && <Mark className="h-[1.3em] w-[1.3em]" />}
      mockio
    </span>
  );
}
