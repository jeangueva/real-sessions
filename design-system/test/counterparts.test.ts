import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalog } from "../src/catalog";
import { classTokens, componentRegion, counterpartProp, declaredProps } from "./helpers/props";

/**
 * The counterpart guard.
 *
 * The product cannot import this package — the web client builds from `web/`
 * alone — so it keeps its own copy of most components. The contract names that
 * copy in `appCounterpart`, and says in prose what deliberately differs.
 *
 * That prose is the weak point. A contract can promise a value the product
 * never accepted, or the product can grow a capability the contract has never
 * heard of, and nothing notices: the file still exists, the name is still
 * exported, the test stays green. The promise is quietly false, and the next
 * person builds on it.
 *
 * These checks compare the two sides for real:
 *
 *   - When the product's copy declares a prop the contract enumerates, the two
 *     must accept the same values. A tone, a width, a variant: the contract's
 *     list and the product's union are compared value for value, in both
 *     directions. Adding a value to one side and not the other fails here.
 *   - When the product's copy does not accept a prop at all, the difference
 *     must be written down. "The app's copy is always max-w-[110rem]" is a
 *     recorded difference; a prop that vanished without a word is not.
 *   - When the product's copy accepts a prop the contract has never heard of,
 *     the same holds in the other direction: either the contract declares it
 *     or the difference says so. A capability that grew in the product and
 *     stayed out of the contract is a promise nobody made and nobody keeps.
 *   - When the two render differently — a padding, a radius, a colour, a
 *     shadow, a press — the contract has to say so too. Two components can
 *     share a name and an API and still be different components, and that is
 *     exactly the kind of difference a reader of the contract cannot see.
 *     The whole vocabulary of class names is compared, not only the type: a
 *     contract that says "the app's copy is this component" has to mean it.
 */

const ROOT = path.resolve(__dirname, "..");
const WEB_SRC = path.resolve(ROOT, "../web/src");

/**
 * The whole class vocabulary is compared, not only the type: a padding, a
 * radius, a colour, a shadow, a press — a difference the reader of the
 * contract cannot see, and the contract that says "the app's copy is this
 * component" has to mean it.
 *
 * Naming one class name is not enough. A contract that explains the press
 * but says nothing about the fill has not explained the difference, so the
 * explanation has to cover every *aspect* of it: the fill, the ink, the
 * type, the shape, the shadow, the space, the layout — and every state the
 * difference is in (the hover, the press, the disabled one).
 */

/** What a class name is about. The utility's first word, grouped. */
const ASPECT: Record<string, string> = {
  bg: "fill",
  from: "fill",
  via: "fill",
  to: "fill",
  fill: "fill",
  stroke: "fill",
  divide: "fill",
  outline: "fill",
  decoration: "fill",
  font: "type",
  leading: "type",
  tracking: "type",
  uppercase: "type",
  lowercase: "type",
  italic: "type",
  rounded: "shape",
  ring: "shape",
  border: "shape",
  shadow: "shadow",
  p: "space",
  px: "space",
  py: "space",
  pt: "space",
  pr: "space",
  pb: "space",
  pl: "space",
  m: "space",
  mx: "space",
  my: "space",
  gap: "space",
  space: "space",
  w: "size",
  h: "size",
  min: "size",
  max: "size",
  flex: "layout",
  grid: "layout",
  items: "layout",
  justify: "layout",
  inline: "layout",
  block: "layout",
  order: "layout",
  opacity: "opacity",
  transition: "motion",
  duration: "motion",
  ease: "motion",
  animate: "motion",
  translate: "transform",
  scale: "transform",
  rotate: "transform",
};

/** The sizes the type scale names, so a size is not read as a colour. */
const TYPE_SIZES = new Set([
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl", "8xl", "9xl",
  "title", "display", "headline",
]);

/** What a class name is about, so a contract can explain the difference. */
function aspectOf(token: string): string {
  const parts = token.split(":");
  // A state is an aspect of its own: the hover, the press, the disabled one.
  if (parts.length > 1) return parts[0]!;
  const utility = parts[0]!;
  if (utility.startsWith("text-")) {
    const rest = utility.slice(5);
    if (TYPE_SIZES.has(rest)) return "type";
    if (["balance", "pretty", "nowrap", "ellipsis", "wrap"].includes(rest)) return "wrap";
    return "ink";
  }
  const head = utility.split("-")[0]!;
  return ASPECT[head] ?? head;
}

describe.each(catalog.map((entry) => [entry.name, entry] as const))("%s", (name, entry) => {
  const { contract } = entry;
  const counterpart = contract.appCounterpart;
  const file = counterpart ? path.join(WEB_SRC, counterpart.file) : null;
  const source = file && existsSync(file) ? readFileSync(file, "utf8") : null;
  const region = source ? componentRegion(source, counterpart!.exportName) : null;

  it.runIf(Boolean(source && region))(
    "declares the same values in the product's copy as in the contract",
    () => {
      if (!source || !region) return;
      for (const [prop, spec] of Object.entries(contract.props)) {
        if (!spec.values) continue;
        const { values } = counterpartProp(source, region, prop);
        if (!values) continue;
        const declared = Object.keys(spec.values).sort();
        const inProduct = [...values].sort();
        expect(
          inProduct,
          `${name}.${prop}: the contract declares [${declared.join(", ")}] and the product's copy accepts [${inProduct.join(", ")}]. Declare the new value in the contract, or remove it from the product.`,
        ).toEqual(declared);
      }
    },
  );

  it.runIf(Boolean(source && region))(
    "records a prop the product's copy does not accept",
    () => {
      if (!source || !region || !counterpart) return;
      const differences = counterpart.differences.join(" ").toLowerCase();
      for (const prop of Object.keys(contract.props)) {
        const { accepted } = counterpartProp(source, region, prop);
        if (accepted) continue;
        expect(
          differences,
          `${name}.${prop}: the product's copy (${counterpart.file}) does not accept it. Write the difference down in appCounterpart.differences.`,
        ).toContain(prop.toLowerCase());
      }
    },
  );

  it.runIf(Boolean(source && region))(
    "declares every prop the product's copy accepts",
    () => {
      if (!source || !region || !counterpart) return;
      const differences = counterpart.differences.join(" ").toLowerCase();
      for (const prop of declaredProps(source, region)) {
        if (Object.hasOwn(contract.props, prop)) continue;
        expect(
          differences,
          `${name}.${prop}: the product's copy (${counterpart.file}) accepts it and the contract never declared it. Declare the prop in the contract, or record the difference in appCounterpart.differences.`,
        ).toContain(prop.toLowerCase());
      }
    },
  );

  it.runIf(Boolean(source && region))(
    "records a difference in how the two render",
    () => {
      if (!source || !region || !counterpart) return;
      const mine = classTokens(path.join(ROOT, contract.source), name);
      const theirs = classTokens(path.join(WEB_SRC, counterpart.file), counterpart.exportName);
      const onlyMine = [...mine].filter((t) => !theirs.has(t)).sort();
      const onlyTheirs = [...theirs].filter((t) => !mine.has(t)).sort();
      if (!onlyMine.length && !onlyTheirs.length) return;

      // The whole vocabulary, not just the type: a padding, a radius or a
      // colour that one side has and the other does not is a difference the
      // reader of the contract cannot see, and the contract that says "the
      // app's copy is this component" has to mean it.
      const differences = counterpart.differences.join(" ").toLowerCase();
      const differing = [...onlyMine, ...onlyTheirs];
      const named = (tokens: string[]) => tokens.some((t) => differences.includes(t.toLowerCase()));

      // Every aspect of the difference has to be explained: a contract that
      // explains the press but says nothing about the fill has not explained
      // the difference.
      const aspects = new Map<string, string[]>();
      for (const token of differing) {
        const aspect = aspectOf(token);
        aspects.set(aspect, [...(aspects.get(aspect) ?? []), token]);
      }
      const unexplained = [...aspects.entries()]
        .filter(([, tokens]) => !named(tokens))
        .map(([aspect, tokens]) => `${aspect} (${tokens.join(", ")})`);

      expect(
        unexplained.length === 0,
        `${name}: the two render differently and the contract does not explain the ${unexplained.join("; ")}. The system uses [${onlyMine.join(", ") || "—"}] where the product's copy uses [${onlyTheirs.join(", ") || "—"}]. Write it down in appCounterpart.differences, naming a class name for each aspect.`,
      ).toBe(true);
    },
  );
});
