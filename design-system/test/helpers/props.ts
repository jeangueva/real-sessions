import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Reading a component's props out of its source.
 *
 * The system cannot import the product, and the product cannot import the
 * system, so the only way to know whether a contract still tells the truth
 * about a component is to read the two texts and compare them. That means
 * parsing TypeScript loosely — not compiling it — well enough to answer three
 * questions:
 *
 *   - which props does the component accept?
 *   - what type does each one carry?
 *   - which string values does that type allow?
 *
 * A component declares its props in one of two ways: a named interface
 * (`}: ActionProps)`) or inline (`}: { title: string })`). A type may be a
 * union written out, a named alias in the same file, or an alias imported
 * from a sibling. All four shapes are handled here.
 */

const fileCache = new Map<string, string | null>();

function read(file: string): string | null {
  if (fileCache.has(file)) return fileCache.get(file)!;
  const text = existsSync(file) ? readFileSync(file, "utf8") : null;
  fileCache.set(file, text);
  return text;
}

/** The file a relative import points at, resolved against the importing file. */
function importedFile(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (existsSync(candidate) && candidate !== base) return candidate;
  }
  return existsSync(base) ? base : null;
}

/**
 * The source without its comments.
 *
 * A doc comment is prose, and prose has colons in it: "the XP level: the
 * product maps XP to a stage before it gets here" reads to a naive parser as
 * a prop named `level` typed as the sentence that follows. Comments are
 * stripped before anything is searched for.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // A line comment, but not the `//` in a URL.
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** The component's own source: from its `export function` to the next export. */
export function componentRegion(source: string, name: string): string | null {
  const clean = stripComments(source);
  const start = clean.search(new RegExp(`export function ${name}\\b`));
  if (start === -1) return null;
  const rest = clean.slice(start);
  const next = rest.search(/\nexport (?:function|const|interface|type)\b/);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * The type a prop is declared with.
 *
 * `tone?: Tone` gives "Tone"; `tone?: "neutral" | "live"` gives the union
 * itself. A default (`type = "button"`) is not a type and is left alone, and
 * an inline props object (`}: { children: ReactNode })`) stops at its brace.
 */
export function propTypeText(text: string, prop: string): string | null {
  const declared = new RegExp(`\\b${prop}\\??\\s*:\\s*([^;\\n}]+)`).exec(stripComments(text));
  if (!declared) return null;
  const type = declared[1]!.trim().replace(/[,\s]+$/, "").replace(/\)+$/, "");
  return type || null;
}

/**
 * The literals a type allows.
 *
 * An inline union gives its literals directly. A named alias is looked up in
 * the same file, and then in the file it was imported from. Returns null when
 * the type is not a set of literals — `string`, `boolean`, a generic — because
 * then there is nothing to compare.
 *
 * Both strings and numbers count: Mascot's stage is `1 | 2 | 3 | 4 | 5 | 6`.
 */
export function literalValues(file: string, typeText: string, depth = 0): string[] | null {
  const source = read(file);
  if (!source) return null;
  const clean = stripComments(source);

  const inline = literals(typeText);
  if (inline.length) return inline;
  if (depth > 4) return null;

  const alias = new RegExp(`(?:export\\s+)?type\\s+${typeText}\\s*=\\s*([^;]+);`).exec(clean);
  if (alias) return literals(alias[1]!);

  const imported = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${typeText}\\b[^}]*\\}\\s+from\\s+["']([^"']+)["']`,
  ).exec(clean);
  if (imported) {
    const target = importedFile(file, imported[1]!);
    if (target) return literalValues(target, typeText, depth + 1);
  }
  return null;
}

/** The literals of a union: quoted strings, or bare numbers. */
function literals(text: string): string[] {
  return [...text.matchAll(/"([^"]+)"|(?<![\w.$])(\d+)(?![\w.])/g)].map((m) => m[1] ?? m[2]!);
}

/**
 * The props type a component names, and the block that declares it.
 *
 * A component either writes its props inline — `}: { children: ReactNode })` —
 * or names an interface — `}: ActionProps)`. The named one lives elsewhere in
 * the file, so it has to be looked up.
 */
export function propsBlock(source: string, region: string): string {
  const propsType = /:\s*([A-Za-z_][\w.]*)\s*\)/.exec(region)?.[1] ?? null;
  if (!propsType) return "";
  // The whole declaration, header included: the `extends ...Attributes` that
  // makes a native prop acceptable lives there, not in the body.
  const clean = stripComments(source);
  return new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${propsType}\\b[^{]*\\{[\\s\\S]*?\\n\\}`).exec(clean)?.[0] ?? "";
}

/** Whether the props type extends the HTML attributes of the element it renders. */
export function extendsNative(text: string): boolean {
  return /extends\s+(?:Omit<)?\s*(?:React\.)?(?:\w*HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|AnchorHTMLAttributes)/.test(
    text,
  );
}

/** The names the component pulls out of its props. */
export function destructured(region: string): string {
  return /export function \w+\s*\(\s*\{([^}]*)\}/.exec(stripComments(region))?.[1] ?? "";
}

/**
 * The default the component gives a prop, if it gives one.
 *
 * `tone = "solid"` gives `"solid"`. A prop the component does not pull out of
 * its props has no default of its own — it keeps the element's — and returns
 * null.
 */
export function codeDefault(region: string, prop: string): string | null {
  const pulled = /export function \w+\s*\(\s*\{([\s\S]*?)\}/.exec(stripComments(region))?.[1] ?? "";
  const match = new RegExp(`\\b${prop}\\s*=\\s*("[^"]*"|'[^']*'|\\d+|true|false|null)`).exec(pulled);
  return match ? match[1]! : null;
}

/**
 * The props the component declares by name.
 *
 * The props type is either inline — `}: { title: string; meta?: string })` — or
 * named — `}: ActionProps)`, in which case the declaration lives elsewhere in
 * the file. Native props inherited from the element's attributes are not
 * listed, so only what the component itself promises comes back.
 */
export function declaredProps(source: string, region: string): string[] {
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
 * Whether the component accepts a prop, and which values it takes.
 *
 * `native` is true when the props type extends the HTML attributes of the
 * element it renders, so every native prop — onClick, disabled, className,
 * id, role — is accepted without being named.
 */
export function counterpartProp(
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

/**
 * The values a prop allows in a component's own code.
 *
 * Same question as `counterpartProp`, asked of a file on disk instead of a
 * string: what does the code accept for this prop?
 */
export function codePropValues(file: string, componentName: string, prop: string): string[] | null {
  const source = read(file);
  if (!source) return null;
  const region = componentRegion(source, componentName);
  if (!region) return null;
  const block = propsBlock(source, region);
  const typeText = propTypeText(region, prop) ?? propTypeText(block, prop);
  if (!typeText) return null;
  return literalValues(file, typeText);
}

/** The literals of a union written as a string, like `'"a" | "b"'`. */
export function unionLiterals(typeText: string): string[] | null {
  const found = literals(typeText);
  // A type that is not a union of literals — "string", "ReactNode" — has
  // nothing to compare, even if a digit appears in it.
  if (!found.length) return null;
  if (!/^\s*(?:"[^"]+"|\d+)\s*(\|\s*(?:"[^"]+"|\d+)\s*)*$/.test(typeText)) return null;
  return found;
}

/**
 * The class names a component renders.
 *
 * Both sides of a counterpart are read this way: the system's component and
 * the copy the product ships. The set of class names says how each one looks,
 * which is the part of a component two copies of it can disagree about
 * without either one breaking.
 */
export function classTokens(file: string, componentName: string): Set<string> {
  const source = read(file);
  if (!source) return new Set();
  const region = componentRegion(source, componentName);
  if (!region) return new Set();

  const tokens = new Set<string>();
  for (const match of region.matchAll(/className=\{?`([^`]*)`\}?/g)) {
    for (const token of match[1]!.split(/\s+/)) if (token) tokens.add(token);
  }
  for (const match of region.matchAll(/className="([^"]*)"/g)) {
    for (const token of match[1]!.split(/\s+/)) if (token) tokens.add(token);
  }
  return tokens;
}
