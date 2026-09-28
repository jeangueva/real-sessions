import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The Spanish interface belongs to a region, not to a capital.
 *
 * It was written in River Plate Spanish and converted to tuteo, by hand, in
 * one pass. That pass missed `call.you`, which still read "Vos" — the label on
 * the candidate's own turns, on screen for the whole interview. A conversion
 * done by reading is a conversion that misses one, and the cost is a Peruvian
 * or a Colombian hearing an accent that is not theirs from a product asking to
 * be trusted with their job interview.
 *
 * So the line is held mechanically. These lists are deliberately narrow:
 * unambiguous verb forms and pronouns, nothing that a legitimate word could
 * collide with. `vale` is absent on purpose — "vale más XP" is the verb
 * *valer*, not the peninsular interjection, and a check that flags it would be
 * turned off within a week.
 */
const here = dirname(fileURLToPath(import.meta.url));
const spanish = readFileSync(join(here, "../src/lib/locales/es.ts"), "utf8");

/** Second-person forms that exist only in voseo. */
const VOSEO = [
  "vos", "sos", "tenés", "querés", "podés", "hacés", "sabés", "decís",
  "venís", "ponés", "elegís", "seguís", "vivís", "sentís", "creés",
  "andá", "mirá", "fijate", "acordate", "tomá", "dejá", "probá",
  "empezá", "escribí", "revisá", "contá", "vení", "tené", "poné",
];

/** Forms that place the reader in Spain rather than in Latin America. */
const PENINSULAR = ["vosotros", "vuestro", "vuestra", "vuestros", "ordenador", "móvil"];

/** Only the string values: a comment may well discuss the words themselves. */
function values(source: string): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  const pattern = /"([a-z][a-zA-Z.]+)":\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) out.push({ key: match[1]!, text: match[2]! });
  return out;
}

const entries = values(spanish);

describe("the Spanish interface", () => {
  it("has entries to check", () => {
    // Guards the regex above: a parser that silently matches nothing would
    // make every assertion below pass while checking no text at all.
    expect(entries.length).toBeGreaterThan(400);
  });

  it("uses tuteo, never voseo", () => {
    const found = entries.flatMap(({ key, text }) =>
      VOSEO.filter((form) => new RegExp(`\\b${form}\\b`, "i").test(text)).map(
        (form) => `${key}: "${form}"`,
      ),
    );
    expect(found).toEqual([]);
  });

  it("does not address the reader as someone in Spain", () => {
    const found = entries.flatMap(({ key, text }) =>
      PENINSULAR.filter((form) => new RegExp(`\\b${form}\\b`, "i").test(text)).map(
        (form) => `${key}: "${form}"`,
      ),
    );
    expect(found).toEqual([]);
  });

  // Dropped from `solo` by the 2010 orthography, and the file spells it
  // without one everywhere else.
  it("spells solo without the old accent", () => {
    const found = entries.filter(({ text }) => /\bsólo\b/i.test(text)).map((e) => e.key);
    expect(found).toEqual([]);
  });
});
