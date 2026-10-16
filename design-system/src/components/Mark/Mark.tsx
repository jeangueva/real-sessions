/**
 * The brand's own colours, fixed on purpose.
 *
 * These are the only hex literals in the system and they stay literals: a
 * logo that changes colour with the theme is two logos. The tile happens to
 * equal the light theme's accent (#5856D6) but is not read from `--accent`,
 * because the dark theme's accent is a different indigo (#5E5CE6) and the mark
 * must be the same drawing everywhere. `public/favicon.svg` in the product is
 * the same drawing; keep the two in step.
 */
const BRAND = {
  tile: "#5856D6",
  beak: "#EF9F27",
  head: "#FFFFFF",
  eye: "#26215C",
} as const;

export interface MarkProps {
  /** Width and height in px, written as the SVG's attributes. A className with h-/w- overrides it. */
  size?: number;
  /**
   * The accessible name, when the mark stands alone and means "Mockio".
   * Omit it when the name is written next to the mark: the mark is then
   * decorative and hidden from assistive technology.
   */
  label?: string;
  /** Extra classes on the <svg>: sizing in em, rounding to match a shadow, margin. */
  className?: string;
}

/**
 * The isologo: Mocki, the parrot, reduced to three shapes — head, crest and
 * beak — on the brand's indigo tile.
 *
 * Reduced so it still reads at 16px in a browser tab. Inline rather than an
 * <img>, so it is there on the first paint and needs no request.
 */
export function Mark({ size = 32, label, className = "" }: MarkProps) {
  const named = label !== undefined && label.trim() !== "";
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      focusable="false"
      // Decorative unless named: a logo beside the written name would
      // otherwise be read twice.
      {...(named ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <rect width="64" height="64" rx="15" fill={BRAND.tile} />
      <path d="M36 27C50 25 56 39 48 48C48 41 44 38 36 38Z" fill={BRAND.beak} />
      <path d="M20 21C19 13 23 8 30 7C27 11 28 15 32 18Z" fill={BRAND.head} />
      <circle cx="28" cy="34" r="17" fill={BRAND.head} />
      <circle cx="33" cy="29" r="3.6" fill={BRAND.eye} />
    </svg>
  );
}
