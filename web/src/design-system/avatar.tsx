import { tierForLevel, type AvatarAxis } from "@/lib/avatar";

/**
 * The avatar, drawn.
 *
 * SVG built from the level rather than an image picked from a set. Six
 * illustrations would be six files to art-direct, ship and keep consistent
 * with a curve that may still move; geometry derived from the tier costs
 * nothing, scales to any size, and cannot get out of step with the XP that
 * produced it.
 *
 * It is drawn in `currentColor` and one accent, so it inherits the theme like
 * any other mark on the page and needs no dark-mode variant.
 */

/** Which axis lends its hue. Muted on purpose — this sits beside text. */
const AXIS_HUE: Record<AvatarAxis, string> = {
  fluency: "#6E9BD1",
  vocabulary: "#B58BC8",
  structure: "#5FA88C",
  confidence: "#D19A5C",
};

export function Avatar({
  level,
  axis = null,
  size = 64,
  className = "",
}: {
  level: number;
  /** The strongest axis, which tints the core. Null before any interview. */
  axis?: AvatarAxis | null;
  size?: number;
  className?: string;
}) {
  const { traits, index } = tierForLevel(level);
  const accent = axis ? AXIS_HUE[axis] : "currentColor";

  // A 100×100 viewBox keeps the arithmetic below readable as percentages.
  const coreR = 16 + traits.core * 4;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Level ${level} avatar, form ${index + 1} of 6`}
    >
      {/* The ring. Drawn first so everything else sits inside it. */}
      {traits.ring && (
        <circle
          cx="50"
          cy="52"
          r="34"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.28"
          strokeWidth="2"
        />
      )}

      {/* Sound, once the candidate is the one talking. Arcs on the right,
          because that is the side a headset's mic is not on. */}
      {Array.from({ length: traits.waves }, (_, i) => (
        <path
          key={i}
          d={`M ${84 + i * 5} ${44 - i * 4} a ${10 + i * 5} ${10 + i * 5} 0 0 1 0 ${16 + i * 8}`}
          fill="none"
          stroke={accent}
          strokeOpacity={0.5 - i * 0.12}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      {/* The headset: a band over the top and one earcup. */}
      {traits.headset && (
        <>
          <path
            d="M 26 50 a 24 24 0 0 1 48 0"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.65"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect
            x="20"
            y="46"
            width="9"
            height="16"
            rx="4"
            fill="currentColor"
            fillOpacity="0.65"
          />
          {/* The mic boom, which is what makes it read as a headset rather
              than as headphones. */}
          <path
            d="M 24 62 q 0 12 14 13"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.65"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}

      {/* The core. Always present, and the only thing at the first tier. */}
      <circle cx="50" cy="52" r={coreR} fill={accent} fillOpacity="0.22" />
      <circle
        cx="50"
        cy="52"
        r={coreR}
        fill="none"
        stroke={accent}
        strokeOpacity="0.75"
        strokeWidth="2"
      />

      {/* Eyes: the tier where it stops being a shape. */}
      {traits.eyes && (
        <>
          <circle cx={50 - coreR * 0.34} cy="49" r="2.6" fill="currentColor" />
          <circle cx={50 + coreR * 0.34} cy="49" r="2.6" fill="currentColor" />
        </>
      )}

      {/* The crown, at the end of a curve most accounts will not finish.
          Sits clear above the headset band rather than on it: the two
          overlapped at first and the payoff for the longest climb in the
          product read as a smudge. */}
      {traits.crown && (
        <path
          d="M 36 16 l 6 8 8 -12 8 12 6 -8 -3 12 h -22 z"
          fill={accent}
          fillOpacity="0.9"
          stroke={accent}
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
