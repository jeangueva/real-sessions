import { tierForLevel, type AvatarAxis } from "@/lib/avatar";

/**
 * The avatar: Mocki, a parrot that grows up as the candidate does.
 *
 * A parrot because parrots learn to speak by repeating out loud — which is the
 * whole of what this product asks of someone. Six forms, one per tier of the
 * level curve in `lib/avatar.ts`, each an illustration rather than geometry:
 *
 *   1 egg · 2 hatchling · 3 young parrot · 4 headset on ·
 *   5 on stage with a mic · 6 crowned
 *
 * The first version was drawn in SVG from the tier's traits — a circle that
 * gained a ring, then eyes, then a headset. Correct, and nobody wanted to
 * reach the next one. A character is what makes a level worth chasing.
 *
 * Transparent PNGs in `public/avatars`, so they sit on a card in either
 * theme. 200px masters, drawn at up to ~100px for a sharp 2x.
 */
export function Avatar({
  level,
  size = 64,
  className = "",
}: {
  level: number;
  /** Kept for callers that pass it; the character carries its own colour. */
  axis?: AvatarAxis | null;
  size?: number;
  className?: string;
}) {
  const { index } = tierForLevel(level);
  return (
    <img
      src={`/avatars/level-${index + 1}.png`}
      width={size}
      height={size}
      alt={`Level ${level} avatar, form ${index + 1} of 6`}
      draggable={false}
      // A soft shadow under the character so it stands on the card rather
      // than floating over it, the way the reference 3D icons are lit.
      className={`select-none object-contain drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)] ${className}`}
    />
  );
}
