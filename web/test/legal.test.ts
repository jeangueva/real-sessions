import { describe, expect, it } from "vitest";
import {
  OPERATOR,
  PLACEHOLDER,
  isDraft,
  privacyFor,
  termsFor,
  type Locale,
} from "../src/legal/content";

/**
 * The terms and the privacy policy.
 *
 * The failure worth guarding against is not a typo. It is publishing a legal
 * document that still names a placeholder company under a placeholder law,
 * which reads as finished to anyone who does not know what to look for — and
 * a payment provider reviewing the site would be reading it exactly then.
 *
 * So `isDraft()` has to keep telling the truth, and the draft banner has to
 * keep depending on it.
 */

const LOCALES: Locale[] = ["en", "es", "pt"];

describe("the draft guard", () => {
  it("reports a draft while any operator detail is a placeholder", () => {
    const unfilled = Object.values(OPERATOR).filter((v) => v.includes(PLACEHOLDER));
    // This assertion inverts once the details are filled in, which is the
    // point: the day it flips is the day the pages become publishable.
    expect(isDraft()).toBe(unfilled.length > 0);
  });

  it("names every detail that still needs an answer", () => {
    // Each one appears in the documents, so a missed field ships as a visible
    // "[COMPLETAR" in the middle of a sentence rather than as a silent gap.
    expect(Object.keys(OPERATOR).sort()).toEqual([
      "country",
      "email",
      "entity",
      "retention",
    ]);
  });
});

describe.each(LOCALES)("%s", (locale) => {
  const docs = [privacyFor(locale), termsFor(locale)];

  it("has a title, an intro and a date", () => {
    for (const doc of docs) {
      expect(doc.title.trim()).not.toBe("");
      expect(doc.intro.trim()).not.toBe("");
      expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("leaves no section empty", () => {
    for (const doc of docs) {
      expect(doc.sections.length).toBeGreaterThan(4);
      for (const section of doc.sections) {
        expect(section.heading.trim(), section.heading).not.toBe("");
        expect(section.body.length, section.heading).toBeGreaterThan(0);
        for (const block of section.body) {
          if (Array.isArray(block)) {
            expect(block.length, section.heading).toBeGreaterThan(0);
            for (const item of block) expect(item.trim()).not.toBe("");
          } else {
            expect(block.trim(), section.heading).not.toBe("");
          }
        }
      }
    }
  });

  it("discloses every vendor that receives a candidate's words", () => {
    // Naming a subprocessor is the substance of a privacy policy, and this is
    // the list the server actually calls. A vendor added to the code and not
    // to this list is the failure — the test is here so the two move together.
    const text = JSON.stringify(privacyFor(locale)).toLowerCase();
    for (const vendor of ["render", "openrouter", "deepgram", "resend", "mercado pago"]) {
      expect(text, vendor).toContain(vendor);
    }
  });

  it("says the employers named in the product are not involved", () => {
    // The single most important sentence in the terms: the product names real
    // employers, and a reader must not think any of them endorsed it.
    const text = JSON.stringify(termsFor(locale)).toLowerCase();
    expect(text).toContain("stripe");
    for (const claim of [["not affiliated"], ["no estamos afiliados"], ["não somos afiliados"]].flat()) {
      if (text.includes(claim)) return;
    }
    throw new Error("no disclaimer of affiliation found");
  });
});

describe("the two documents agree", () => {
  it("covers the same sections in every language", () => {
    // A section present in English and missing in Spanish is a different
    // policy for a different reader, which is the thing to avoid.
    const shape = (fn: (l: Locale) => { sections: unknown[] }) =>
      LOCALES.map((l) => fn(l).sections.length);
    expect(new Set(shape(privacyFor)).size).toBe(1);
    expect(new Set(shape(termsFor)).size).toBe(1);
  });
});
