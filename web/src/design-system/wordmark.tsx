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
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-mark lowercase tracking-[-0.03em] ${className}`}
      /* The name, not a sentence — so a screen reader says it as a word and
         a translation tool leaves it alone. */
      translate="no"
    >
      mockio
    </span>
  );
}
