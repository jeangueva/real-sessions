/**
 * The mark: Mocki, the parrot, reduced to three shapes — head, crest and beak —
 * on the product's indigo tile.
 *
 * A parrot because parrots learn to speak by repeating out loud, which is the
 * whole of what this product asks of someone; reduced so it still reads at
 * 16px in a browser tab. The same drawing is `public/favicon.svg`; keep the
 * two in step.
 *
 * Inline rather than an <img>, so it is there on the first paint and needs no
 * request. The colours are the brand's own and do not follow the theme: a
 * logo that changes colour in the dark is two logos.
 */
export function Mark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden
      focusable="false"
    >
      <rect width="64" height="64" rx="15" fill="#5856D6" />
      <path d="M36 27C50 25 56 39 48 48C48 41 44 38 36 38Z" fill="#EF9F27" />
      <path d="M20 21C19 13 23 8 30 7C27 11 28 15 32 18Z" fill="#fff" />
      <circle cx="28" cy="34" r="17" fill="#fff" />
      <circle cx="33" cy="29" r="3.6" fill="#26215C" />
    </svg>
  );
}
