import { afterEach, describe, expect, it } from "vitest";
import { foreverEmails, holdsForeverPremium } from "../src/forever.js";

/**
 * The list that holds the paid plan without paying.
 *
 * Worth testing for the same reason the reviewer list is: it is read from the
 * environment, matched against an address someone typed, and getting the
 * match wrong either locks out the founder or hands the product to a stranger
 * whose address merely looks similar.
 */
const before = { ...process.env };
afterEach(() => {
  process.env = { ...before };
});

describe("the forever list", () => {
  it("is empty unless the environment names someone", () => {
    delete process.env.REALSESSIONS_FOREVER_PREMIUM;
    expect(foreverEmails().size).toBe(0);
    expect(holdsForeverPremium("anyone@example.com")).toBe(false);
  });

  it("matches the way an address is matched at sign-up", () => {
    // Normalised through the same function the account store uses, so a
    // capitalised entry here still matches the account it refers to.
    process.env.REALSESSIONS_FOREVER_PREMIUM = "Founder@Example.com";
    expect(holdsForeverPremium("founder@example.com")).toBe(true);
    expect(holdsForeverPremium("  FOUNDER@EXAMPLE.COM  ")).toBe(true);
  });

  it("takes several, separated by commas", () => {
    process.env.REALSESSIONS_FOREVER_PREMIUM = "a@x.com, b@x.com";
    expect(holdsForeverPremium("a@x.com")).toBe(true);
    expect(holdsForeverPremium("b@x.com")).toBe(true);
  });

  it("does not match an address that merely looks similar", () => {
    // The failure that matters: a near-miss handing the paid plan away.
    process.env.REALSESSIONS_FOREVER_PREMIUM = "founder@example.com";
    for (const near of [
      "founder@example.co",
      "founder@examp1e.com",
      "founder+x@example.com",
      "xfounder@example.com",
    ]) {
      expect(holdsForeverPremium(near), near).toBe(false);
    }
  });

  it("refuses what is not an address at all", () => {
    process.env.REALSESSIONS_FOREVER_PREMIUM = "founder@example.com";
    for (const bad of [null, undefined, "", "   ", "not-an-address"]) {
      expect(holdsForeverPremium(bad)).toBe(false);
    }
  });
});
