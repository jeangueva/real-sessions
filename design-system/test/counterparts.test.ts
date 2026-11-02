import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalog } from "../src/catalog";

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
 */

const ROOT = path.resolve(__dirname, "..");
const WEB_SRC = path.resolve(ROOT, "../web/src");

/** The component's own source: from its `export function` to the next export. */
function componentRegion(source: string, name: string): string | null {
  const start = source.search(new RegExp(`export function ${name}\\b`));
  if (start === -1) return null;
  const rest = source.slice(start);
  const next = rest.search(/\nexport (?:function|const|interface|type)\b/);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * The type a prop is declared with, in the component's own region.
 *
 * `tone?: Tone` gives "Tone"; `tone?: "neutral" | "live"` gives the union
 * itself. A default (`type = "button"`) is not a type and is left alone, and
 * an inline props object (`}: { children: ReactNode })`) stops at its brace.
 */
function propTypeText(region: string, prop: string): string | null {
  const declared = new RegExp(`\\b${prop}\\??\\s*:\\s*([^;\\n}]+)`).exec(region);
  if (!declared) return null;
  const type = declared[1]!.trim().replace(/[,\s]+$/, "").replace(/\)+$/, "");
  return type || null;
}

/** The string literals of a type: an inline union, or a named alias in the file. */
function literalValues(source: string, typeText: string): string[] | null {
  const inline = [...typeText.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
  if (inline.length) return inline;
  const alias = new RegExp(`(?:export\\s+)?type\\s+${typeText}\\s*=\\s*([^;]+);`).exec(source);
  if (!alias) return null;
  return [...alias[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
}

/**
 * The props type a component names, and the block that declares it.
 *
 * A component either writes its props inline — `}: { children: ReactNode })` —
 * or names an interface — `}: ActionProps)`. The named one lives elsewhere in
 * the file, so it has to be looked up.
 */
function propsBlock(source: string, region: string): string {
  const propsType = /:\s*([A-Za-z_][\w.]*)\s*\)/.exec(region)?.[1] ?? null;
  if (!propsType) return "";
  // The whole declaration, header included: the `extends ...Attributes` that
  // makes a native prop acceptable lives there, not in the body.
  return new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${propsType}\\b[^{]*\\{[\\s\\S]*?\\n\\}`).exec(source)?.[0] ?? "";
}

/** Whether the props type extends the HTML attributes of the element it renders. */
function extendsNative(text: string): boolean {
  return /extends\s+(?:Omit<)?\s*(?:React\.)?(?:\w*HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|AnchorHTMLAttributes)/.test(
    text,
  );
}

/** The names the component pulls out of its props. */
function destructured(region: string): string {
  return /export function \w+\s*\(\s*\{([^}]*)\}/.exec(region)?.[1] ?? "";
}

/**
 * The props the product's copy declares by name.
 *
 * The props type is either inline — `}: { title: string; meta?: string })` — or
 * named — `}: ActionProps)`, in which case the declaration lives elsewhere in
 * the file. Native props inherited from the element's attributes are not
 * listed, so only what the component itself promises comes back.
 */
function declaredProps(source: string, region: string): string[] {
  const inline = /:\s*\{([^{}]*)\}\s*\)/.exec(region);
  const block = propsBlock(source, region);
  const open = block.indexOf("{");
  const close = block.lastIndexOf("}");
  const body = inline ? inline[1]! : open === -1 || close === -1 ? "" : block.slice(open + 1, close);

  const names = new Set<string>();
  for (const match of body.matchAll(/(?:^|[;{])\s*(?:"([^"]+)"|([A-Za-z_][\w-]*))\??\s*:/gm)) {
    names.add(match[1] ?? match[2]!);
  }
  return [...names];
}

/**
 * Whether the product's copy accepts a prop, and which values it takes.
 *
 * `native` is true when the props type extends the HTML attributes of the
 * element it renders, so every native prop — onClick, disabled, className,
 * id, role — is accepted without being named.
 */
function counterpartProp(
  source: string,
  region: string,
  prop: string,
): { accepted: boolean; values: string[] | null } {
  const block = propsBlock(source, region);

  // The type may be written in the signature or in a props type it names.
  const typeText = propTypeText(region, prop) ?? propTypeText(block, prop);
  if (typeText) return { accepted: true, values: literalValues(source, typeText) };

  // Pulled straight out of the props, so it is accepted whatever its type.
  if (new RegExp(`\\b${prop}\\b`).test(destructured(region))) {
    return { accepted: true, values: null };
  }

  // Inherited from the element's own attributes.
  if (extendsNative(`${region}\n${block}`)) return { accepted: true, values: null };

  return { accepted: false, values: null };
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
});
