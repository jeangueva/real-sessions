import { describe, expect, it } from "vitest";
import { TIER_COUNT, dominantAxis, nextEvolution, tierForLevel } from "../src/lib/avatar";

/**
 * The avatar.
 *
 * Two things worth holding still. Evolution has to be additive — a tier that
 * removed something a candidate had already earned would read as a punishment
 * for levelling up — and it has to be derivable from the level alone, because
 * an avatar stored anywhere is one that can disagree with the XP that produced
 * it after a recount or a deleted session.
 */

describe("tiers", () => {
  it("gives a brand-new account the first form", () => {
    expect(tierForLevel(1).index).toBe(0);
  });

  it("never goes backwards as the level rises", () => {
    let previous = -1;
    for (let level = 1; level <= 40; level++) {
      const { index } = tierForLevel(level);
      expect(index, `level ${level}`).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it("only ever adds", () => {
    // The rule that makes levelling up feel like a reward: nothing earned is
    // taken away by the next form.
    let last = tierForLevel(1).traits;
    for (let level = 1; level <= 40; level++) {
      const now = tierForLevel(level).traits;
      expect(now.core, `level ${level}`).toBeGreaterThanOrEqual(last.core);
      expect(now.waves, `level ${level}`).toBeGreaterThanOrEqual(last.waves);
      for (const flag of ["ring", "eyes", "headset", "crown"] as const) {
        if (last[flag]) expect(now[flag], `${flag} at level ${level}`).toBe(true);
      }
      last = now;
    }
  });

  it("reaches every form within a plausible amount of practice", () => {
    // The last tier should be far but not unreachable. At 50·(n-1)² XP per
    // level, level 16 is 11,250 XP — a long run, not an impossible one.
    const top = tierForLevel(99);
    expect(top.index).toBe(TIER_COUNT - 1);
    expect(top.from).toBeLessThanOrEqual(20);
  });

  it("treats nonsense as a new account rather than throwing", () => {
    for (const bad of [0, -5, NaN, Infinity]) {
      expect(tierForLevel(bad).index, String(bad)).toBe(0);
    }
  });
});

describe("nextEvolution", () => {
  it("names a level the interface can promise", () => {
    // "Level 7" means nothing without knowing the curve; "two more levels and
    // it gets a headset" is a reason to run another interview.
    const next = nextEvolution(1);
    expect(next).not.toBeNull();
    expect(tierForLevel(next!).index).toBe(tierForLevel(1).index + 1);
  });

  it("returns null once there is nothing left to become", () => {
    expect(nextEvolution(99)).toBeNull();
  });
});

describe("the tint", () => {
  it("takes the strongest axis", () => {
    expect(
      dominantAxis({ fluency: 60, vocabulary: 82, structure: 70, confidence: null }),
    ).toBe("vocabulary");
  });

  it("breaks ties in a fixed order rather than at random", () => {
    // A colour that changes on reload reads as a bug, not as variety.
    const tied = { fluency: 70, vocabulary: 70, structure: 70, confidence: 70 };
    expect(dominantAxis(tied)).toBe("fluency");
    expect(dominantAxis(tied)).toBe("fluency");
  });

  it("has no opinion before the first scored interview", () => {
    expect(dominantAxis({})).toBeNull();
    expect(dominantAxis({ fluency: null, vocabulary: null })).toBeNull();
  });
});
