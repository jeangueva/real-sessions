import { describe, expect, it } from "vitest";
import { catalog } from "../src/catalog";

/**
 * The pointer guard.
 *
 * A contract points at other things all the time: "instead: a radio group",
 * "related: Panel", "the eyebrow goes above a heading". Those pointers are
 * how a reader of the contract finds the right thing to use next, and they
 * are the one part of a contract no other test can check, because they are
 * prose.
 *
 * A pointer to something the system does not have is a promise the system
 * cannot keep. The product has a `Segmented`; the system does not, and its
 * contracts keep telling whoever reads them to reach for one. The reader looks
 * for it in the catalogue, does not find it, and either stops trusting the
 * contracts or goes and writes a second one. A pointer to a screen of the
 * product ("as RecentSessions does") is the same kind of lie: it describes one
 * product's internals in a system meant to be read by anyone building on it.
 *
 * The rule is therefore narrow and mechanical:
 *
 *   - Every name in a contract is a component of this system, or a proper
 *     noun listed below with the reason it is not one.
 *   - The alternative a contract offers starts with a component's name, a
 *     native element, or plain lowercase prose. It never starts with the name
 *     of something that does not exist.
 *
 * The contracts are written in English and in sentence case, so a capitalised
 * word in the middle of a sentence is a name and not a word. That is what
 * makes the check possible at all.
 */

const NAMES = new Set(catalog.map((entry) => entry.name));

/**
 * Proper nouns that are not components of this system. Each one is a decision:
 * it is a real thing the contracts talk about, and it is not something a
 * reader can import.
 */
const PROPER_NOUNS = new Map<string, string>([
  ["Arabic", "a language"],
  ["Apple", "the company the type references come from"],
  ["Airbnb", "the company the surface references come from"],
  ["CanvasText", "the colour the browser's forced-colours mode asks for"],
  ["English", "a language"],
  ["Figma", "the design tool"],
  ["German", "a language"],
  ["Hebrew", "a language"],
  ["Intl", "the internationalisation API"],
  ["Mocki", "the mascot"],
  ["MotionConfig", "the motion provider of the animation library"],
  ["Portuguese", "a language"],
  ["React", "the library the components are written in"],
  ["Spanish", "the language the product speaks first"],
  ["Sustentación", "the product's thesis space"],
  ["Tailwind", "the utility CSS framework"],
]);

/**
 * A component's name in plural, and the same word used as a verb: "the Panels
 * in a grid", "the Screen it replaces".
 */
function asName(word: string): string {
  if (NAMES.has(word)) return word;
  if (word.endsWith("es") && NAMES.has(word.slice(0, -2))) return word.slice(0, -2);
  if (word.endsWith("s") && NAMES.has(word.slice(0, -1))) return word.slice(0, -1);
  return word;
}

/**
 * The capitalised words of a piece of prose that are not at the start of a
 * sentence — those are the names it mentions.
 *
 * Quoted copy and italics are skipped: they are the product's words, not
 * names. A sentence starts after a full stop, a colon, a semicolon, an arrow
 * or an em dash.
 */
export function namesIn(text: string): string[] {
  const clean = text.replace(/"[^"]*"/g, " ").replace(/_[^_]*_/g, " ").replace(/`[^`]*`/g, " ");
  const found: string[] = [];
  for (const segment of clean.split(/(?<=[.!?:;])\s+|→\s+|\s+—\s+|\s+\/\s+/)) {
    const words = segment.split(/\s+/).filter(Boolean);
    for (const raw of words.slice(1)) {
      // A name starts with a capital and carries a lowercase letter: that is
      // how a component is written, and it leaves a colour like #FFFFFF or an
      // acronym like WCAG out of the way. A possessive is the name itself.
      const word = raw
        .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "")
        .replace(/'s$/, "");
      if (!/^[A-Z][a-z]/.test(word)) continue;
      found.push(word);
    }
  }
  return found;
}

/**
 * Every piece of prose in a contract, and where it came from.
 *
 * Two fields are left out on purpose. `content.examples` is copy quoted from
 * the product — its capitalised words are Spanish sentences, not names. The
 * `key` of a keyboard entry is a key name ("Enter", "Tab"), not a component.
 */
function proseOf(value: unknown, path: string = "", out: [string, string][] = []): [string, string][] {
  if (typeof value === "string") {
    out.push([path, value]);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => proseOf(item, `${path}[${index}]`, out));
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (path === "content" && key === "examples") continue;
      // The name of the product's own export: it is a fact about a file, not a
      // pointer the reader has to follow.
      if (path === "appCounterpart" && key === "exportName") continue;
      if (path === "accessibility" && key === "keyboard") {
        for (const [index, entry] of (item as { effect: string }[]).entries()) {
          out.push([`${path}.keyboard[${index}].effect`, entry.effect]);
        }
        continue;
      }
      proseOf(item, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

describe.each(catalog.map((entry) => [entry.name, entry] as const))("%s", (name, entry) => {
  const { contract } = entry;

  it("names only components that exist", () => {
    for (const [where, text] of proseOf(contract)) {
      for (const word of namesIn(text)) {
        expect(
          NAMES.has(asName(word)) || PROPER_NOUNS.has(word),
          `${name}.${where}: "${word}" is not a component of this system. Name a component that exists, describe the alternative in plain words, or add it to PROPER_NOUNS with its reason.`,
        ).toBe(true);
      }
    }
  });

  it("offers an alternative that exists", () => {
    for (const { situation, instead } of contract.usage.whenNot) {
      const first = /^[A-Za-z]+/.exec(instead)?.[0] ?? "";
      const startsWithAComponent = NAMES.has(first);
      const startsLower = /^[a-z]/.test(instead);
      const startsNative = instead.startsWith("<");
      expect(
        startsWithAComponent || startsLower || startsNative,
        `${name}.usage.whenNot: the alternative to "${situation}" starts with "${first}", which is not a component of this system. Start it with a component's name, a native element, or plain lowercase words.`,
      ).toBe(true);
    }
  });

  it("names only components that exist in its guidance", () => {
    // The Markdown repeats the contract in prose a person reads. The pointers
    // live in "When not to use it"; the rest of the file may name anything the
    // system owns.
    const section = entry.docs.split("## When not to use it")[1]?.split("\n## ")[0] ?? "";
    for (const match of section.matchAll(/`([A-Z][A-Za-z0-9]*)`/g)) {
      const word = match[1]!;
      expect(
        NAMES.has(asName(word)) || PROPER_NOUNS.has(word),
        `${name}.md: "${word}" is not a component of this system. Name a component that exists, or describe it in plain words.`,
      ).toBe(true);
    }
  });
});
