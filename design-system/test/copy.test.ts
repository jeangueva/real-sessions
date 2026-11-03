import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { catalog } from "../src/catalog";

/**
 * The copy guard: an example has to be real copy.
 *
 * A contract promises its examples are "good copy, quoted from the product"
 * (see `ContentContract` in src/contract.ts). So every example has to be a
 * string the product actually shows — verbatim, or the product's own template
 * filled in — or a string the system itself ships, like the alt a component
 * renders by default.
 *
 * An invented example is not a small thing: the examples are what a designer
 * copies into a screen, and what a design tool shows as the component's
 * sample copy. One that the product never says teaches a voice that is not
 * the product's.
 *
 * The guard reads the product's own source, so it needs `../web`. It is
 * skipped when the system lives in its own repository (see
 * docs/guides/separate-repo.md).
 */

const ROOT = path.resolve(__dirname, "..");
const WEB_SRC = path.resolve(ROOT, "../web/src");

function readTree(dir: string, extensions: string[]): string {
  let out = "";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out += readTree(full, extensions);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      out += readFileSync(full, "utf8") + "\n";
    }
  }
  return out;
}

/** The product's own text: every string it can show. */
const productText = existsSync(WEB_SRC) ? readTree(WEB_SRC, [".ts", ".tsx"]) : "";

/** The system's own code: the defaults a component ships. */
const systemCode = readTree(path.join(ROOT, "src/components"), [".tsx"]).replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/**
 * A string the source can produce: the words are there, and the numbers may
 * be the source's own placeholders. "Turno 3 de 8" is the product's
 * "Turno {turn} de {total}", and "Mocki, nivel 3" is the system's
 * "Mocki, nivel ${form}".
 */
function theSourceCanShow(source: string, example: string): boolean {
  if (source.includes(example)) return true;
  if (!/\d/.test(example)) return false;
  const pattern = example.replace(/\d+/g, "[^\"\\n]{1,40}").replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`);
  try {
    return new RegExp(pattern).test(source);
  } catch {
    return false;
  }
}

const cases = catalog.flatMap((entry) =>
  entry.contract.content.examples.map((example) => [entry.name, example] as const),
);

describe("the examples are real copy", () => {
  it("every example is the product's own copy or the default the system ships", () => {
    const invented = cases
      .filter(
        ([, example]) =>
          !theSourceCanShow(productText, example) && !theSourceCanShow(systemCode, example),
      )
      .map(([name, example]) => `${name}: ${example}`);
    expect(invented).toEqual([]);
  });

  it("no example is empty, and none is a placeholder", () => {
    for (const [name, example] of cases) {
      expect(example.length, `${name} has an empty example`).toBeGreaterThan(0);
      expect(example, `${name} has a placeholder example`).not.toMatch(
        /^(lorem|ipsum|button|text|label|example|title|your .+ here)$/i,
      );
    }
  });
});
