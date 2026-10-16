import egg from "./assets/level-1.png";
import hatchling from "./assets/level-2.png";
import young from "./assets/level-3.png";
import headset from "./assets/level-4.png";
import stage from "./assets/level-5.png";
import crowned from "./assets/level-6.png";

/** The six growth stages, in order: egg, hatchling, young parrot, headset on, on stage with a mic, crowned. */
export type MascotLevel = 1 | 2 | 3 | 4 | 5 | 6;

const FORMS: Record<MascotLevel, string> = {
  1: egg,
  2: hatchling,
  3: young,
  4: headset,
  5: stage,
  6: crowned,
};

export interface MascotProps {
  /** The growth stage, 1 to 6. Not the XP level: the product maps XP to a stage before it gets here. */
  level: MascotLevel;
  /** Width and height in px. The masters are 200px, so up to 100px is sharp on a 2x screen. */
  size?: number;
  /** The text alternative. Defaults to "Mocki, nivel {level}"; pass the translated sentence for other locales. */
  alt?: string;
  /** Empties the alt, for a Mocki that sits beside text which already says what is happening. */
  decorative?: boolean;
  /** Extra classes on the <img>: shrink-0 in a flex row, a negative margin to tuck it over a name. */
  className?: string;
}

/** Out-of-range input from untyped callers becomes the nearest stage rather than a broken image. */
function toStage(level: number): MascotLevel {
  if (!Number.isFinite(level)) return 1;
  return Math.min(6, Math.max(1, Math.round(level))) as MascotLevel;
}

/**
 * Mocki: the parrot that grows up as the candidate does.
 *
 * A parrot because parrots learn to speak by repeating out loud, which is the
 * whole of what the interview product asks of someone. Six illustrated forms,
 * each a step rather than a gradient, so reaching the next one is an event.
 *
 * Transparent PNGs that ship with the component, so the character sits on a
 * card in either theme and needs no public folder in the consuming app.
 */
export function Mascot({ level, size = 64, alt, decorative = false, className = "" }: MascotProps) {
  const form = toStage(level);
  return (
    <img
      src={FORMS[form]}
      width={size}
      height={size}
      alt={decorative ? "" : (alt ?? `Mocki, nivel ${form}`)}
      draggable={false}
      // A soft shadow under the character so it stands on the card rather
      // than floating over it. drop-shadow, not a shadow token: the box
      // shadows would draw a square around a transparent picture.
      className={`select-none object-contain drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)] ${className}`}
    />
  );
}
