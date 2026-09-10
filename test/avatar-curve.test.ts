import { describe, expect, it } from "vitest";
import { levelForXp } from "../src/gamification.js";
import { tierForLevel } from "../web/src/lib/avatar.js";

/**
 * The one assertion that spans both halves.
 *
 * The avatar lives in the web package — the server never draws it and never
 * needs the tiers — but the curve it rides is the server's. This is the only
 * test that has to see both, so it sits here, where the root suite can reach
 * across into the client. The rest of the avatar's behaviour is tested in
 * `web/test/avatar.test.ts`, beside the module.
 */
describe("the avatar against the XP curve", () => {
  it("evolves once inside the first few sessions", () => {
    // The reward has to arrive before the habit exists, or it never helps
    // form one. A single good session is worth well over 50 XP.
    expect(levelForXp(60).level).toBeGreaterThanOrEqual(2);
    expect(tierForLevel(levelForXp(60).level).index).toBeGreaterThanOrEqual(1);
  });
});
