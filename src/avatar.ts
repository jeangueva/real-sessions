/**
 * The avatar, and how it evolves.
 *
 * The XP and levels already existed and did nothing visible: a number that
 * went up in a corner of the progress screen. A number is a poor reward
 * because it is legible only by comparison — you have to remember what it
 * was — whereas a shape that changed is legible at a glance, and it is the
 * thing people screenshot.
 *
 * Two decisions worth stating.
 *
 * It evolves in steps rather than continuously. A form that morphs a little
 * every level never has a moment; six visible transformations across a long
 * curve means each one is an event, which is what makes a level worth
 * reaching. The bands widen as they go, so the early ones arrive quickly and
 * the last one takes a while.
 *
 * And the traits are derived, never stored. An avatar in a database is a thing
 * that can disagree with the XP that produced it — after a migration, a
 * recount, or a deleted session. Computing it from the level every time means
 * the two cannot drift, and it costs nothing.
 */

export interface AvatarTier {
  /** 0-indexed. The first tier is what a brand-new account looks like. */
  index: number;
  /** The level at which this form appears. */
  from: number;
  /**
   * What the form gains at this tier.
   *
   * Additive on purpose: nothing a candidate has earned is ever taken away by
   * the next stage, so the shape reads as accumulation rather than as
   * replacement.
   */
  traits: AvatarTraits;
}

export interface AvatarTraits {
  /** The core is always there. It grows, slowly. */
  core: number;
  /** A ring, once there is progress worth marking. */
  ring: boolean;
  /** Eyes: the point where it stops being a shape and starts being someone. */
  eyes: boolean;
  /** The headset. This is an interview product; it earns the reference. */
  headset: boolean;
  /** Sound coming out of it — the candidate is talking now, not listening. */
  waves: number;
  /** A crown, at the end of a curve most accounts will not finish. */
  crown: boolean;
}

/**
 * The bands, widening.
 *
 * Level 1 is 0 XP and level 5 is 800, so the first three tiers land inside a
 * handful of sessions and the last needs sustained practice. That shape is
 * deliberate: the reward has to arrive before the habit exists, or it never
 * helps form one.
 */
const TIERS: { from: number; traits: AvatarTraits }[] = [
  { from: 1, traits: { core: 1, ring: false, eyes: false, headset: false, waves: 0, crown: false } },
  { from: 2, traits: { core: 2, ring: true, eyes: false, headset: false, waves: 0, crown: false } },
  { from: 4, traits: { core: 2, ring: true, eyes: true, headset: false, waves: 0, crown: false } },
  { from: 7, traits: { core: 3, ring: true, eyes: true, headset: true, waves: 0, crown: false } },
  { from: 11, traits: { core: 3, ring: true, eyes: true, headset: true, waves: 2, crown: false } },
  { from: 16, traits: { core: 4, ring: true, eyes: true, headset: true, waves: 3, crown: true } },
];

export const TIER_COUNT = TIERS.length;

/** The form for a level. Levels below 1 are treated as 1 rather than refused. */
export function tierForLevel(level: number): AvatarTier {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) {
    if (safe >= TIERS[i]!.from) index = i;
  }
  return { index, from: TIERS[index]!.from, traits: TIERS[index]!.traits };
}

/**
 * The next level that changes the shape, or null at the last tier.
 *
 * This is what the interface can promise. "Level 7" means nothing to someone
 * who does not know the curve; "two more levels and it gets a headset" is a
 * reason to run another interview.
 */
export function nextEvolution(level: number): number | null {
  const current = tierForLevel(level);
  const next = TIERS[current.index + 1];
  return next ? next.from : null;
}

/**
 * The hue, from whichever axis is strongest.
 *
 * The avatar says how much you have practised; this says what you are good
 * at, which is the more interesting half. Ties fall back to the first axis
 * rather than picking at random — a colour that changes on reload reads as a
 * bug, not as variety.
 */
export type AvatarAxis = "fluency" | "vocabulary" | "structure" | "confidence";

export function dominantAxis(
  scores: Partial<Record<AvatarAxis, number | null>>,
): AvatarAxis | null {
  const order: AvatarAxis[] = ["fluency", "vocabulary", "structure", "confidence"];
  let best: AvatarAxis | null = null;
  let bestScore = -Infinity;
  for (const axis of order) {
    const value = scores[axis];
    if (typeof value !== "number") continue;
    if (value > bestScore) {
      best = axis;
      bestScore = value;
    }
  }
  return best;
}
