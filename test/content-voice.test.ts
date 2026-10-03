import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The one rule about how this product talks that a machine can check.
 *
 * CONTENT.md holds the rest, and the rest is checked by reading. This checks
 * the failure that keeps happening by accident rather than by taste: a string
 * written for a developer reaching a user unchanged.
 *
 * It had happened four times before this test existed. `cardTokenId is
 * required.` was shown to somebody filling in a card; `text is required.` to
 * somebody speaking; `Could not reconcile.` to somebody who had just paid and
 * does not know the word. The promotion panel renders the server's error text
 * verbatim, which is how a sentence meant for a log ends up under somebody's
 * credit card.
 */

const source = readFileSync(
  fileURLToPath(new URL("../src/server.ts", import.meta.url)),
  "utf8",
);

/** Every string this file sends back as `error`. */
const messages = [...source.matchAll(/error:\s*"([^"]{8,})"/g)].map(
  (match) => match[1] as string,
);

/**
 * A word only this codebase uses.
 *
 * camelCase is the giveaway — no sentence a person says out loud contains
 * `externalReference`. Single capitals inside a word, with no space around
 * them, and not a proper noun we deliberately name.
 */
const JARGON = /\b[a-z]+[A-Z][a-zA-Z]*\b/;

/** Names we do say on purpose. */
const ALLOWED = ["Mercado Pago", "Mockio", "Google", "PDF"];

describe("what the server says out loud", () => {
  it("found some messages to check", () => {
    // If the regex above ever stops matching, every assertion below passes
    // for the wrong reason.
    expect(messages.length).toBeGreaterThan(20);
  });

  it("uses no word that only exists inside this codebase", () => {
    const jargon = messages.filter((message) => {
      const stripped = ALLOWED.reduce((text, name) => text.replaceAll(name, ""), message);
      return JARGON.test(stripped);
    });
    expect(jargon).toEqual([]);
  });

  it("never leaves somebody at a dead end", () => {
    /**
     * "Internal error." is the shape: a statement that something failed, with
     * no sentence after it. Checked as a list rather than a pattern, because
     * what makes a message a dead end is whether it says what to do, and no
     * regex knows that — but these exact phrasings have all been in the
     * product and all of them stranded somebody.
     */
    const deadEnds = [
      "Internal error.",
      "Could not reconcile.",
      "Session not found or expired.",
      "Already decided by someone else.",
    ];
    expect(messages.filter((message) => deadEnds.includes(message))).toEqual([]);
  });

  it("does not shout", () => {
    // Nobody reading this product is in the mood for one.
    expect(messages.filter((message) => message.includes("!"))).toEqual([]);
  });
});
