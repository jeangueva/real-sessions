/**
 * Re-exported from the server's module so both sides read one curve.
 *
 * The tiers decide what a level looks like, and a copy in the client is a copy
 * that drifts the first time the curve moves. This file exists only so the
 * browser can import it through the `@` alias.
 */
export {
  TIER_COUNT,
  dominantAxis,
  nextEvolution,
  tierForLevel,
  type AvatarAxis,
  type AvatarTier,
  type AvatarTraits,
} from "../../../src/avatar";
