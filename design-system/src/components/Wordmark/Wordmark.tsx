import { Mark } from "../Mark/Mark";

export interface WordmarkProps {
  /** Shows the Mark before the name. Off where the mark is already on screen or a character sits above the name. */
  mark?: boolean;
  /** Size and colour come from here: a text-* size and an ink, e.g. "text-xl font-semibold text-cream-bright". */
  className?: string;
}

/**
 * The wordmark: the Mark and the name, as one lockup.
 *
 * Defined once because it appears in places that are nothing alike — a
 * display-size line on a landing, a 16px label in a footer — and a logo that
 * drifts between them is not a logo.
 *
 * Always lowercase, in the mark face rather than the page's heading font.
 * The name is a literal, not a prop and not a dictionary key: a product name
 * is not translated, and routing it through a translation function would
 * invite exactly that.
 */
export function Wordmark({ mark = true, className = "" }: WordmarkProps) {
  return (
    <span
      className={`inline-flex items-center gap-[0.35em] font-mark lowercase tracking-[-0.03em] ${className}`}
      // The name, not a sentence: translation tools leave it alone.
      translate="no"
      // A logo does not mirror. In Arabic or Hebrew the mark stays before
      // the name; the lockup is placed by the page's direction but drawn
      // in its own.
      dir="ltr"
    >
      {/* The mark at the height of the name's capitals plus a little, so the
          two read as one unit at any size the name is set. */}
      {mark && <Mark className="h-[1.3em] w-[1.3em]" />}
      mockio
    </span>
  );
}
