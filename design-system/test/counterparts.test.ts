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
 *   - When the two render differently — a different size, weight, case or
 *     colour — the contract has to say so too. Two components can share a
 *     name and an API and still be different components, and that is exactly
 *     the kind of difference a reader of the contract cannot see.
 */

const ROOT = path.resolve(__dirname, "..");
const WEB_SRC = path.resolve(ROOT, "../web/src");

/**
 * The class names that say how a thing looks: its size, weight, case and
 * colour. Arbitrary values are left out — `text-[1.5rem]` says nothing about
 * the scale the component is on — and so are the decorative ones (shadows,
 * rings, paddings), which components may disagree about without becoming
 * different components.
 */
const TYPOGRAPHY = /^(?:text|font)-[a-z][a-z0-9-]*$|^(?:uppercase|lowercase|italic|tabular-nums)$/;

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
      const onlyMine = [...mine].filter((t) => TYPOGRAPHY.test(t) && !theirs.has(t));
      const onlyTheirs = [...theirs].filter((t) => TYPOGRAPHY.test(t) && !mine.has(t));
      if (!onlyMine.length && !onlyTheirs.length) return;

      const differences = counterpart.differences.join(" ").toLowerCase();
      const named = [...onlyMine, ...onlyTheirs].some((t) => differences.includes(t.toLowerCase()));
      expect(
        named,
        `${name}: the two render differently and the contract says nothing about it. The system uses [${onlyMine.join(", ") || "—"}] where the product's copy uses [${onlyTheirs.join(", ") || "—"}]. Write it down in appCounterpart.differences, naming one of them.`,
      ).toBe(true);
    },
  );
});
