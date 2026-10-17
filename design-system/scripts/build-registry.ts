/**
 * registry.json — the system, described for tools.
 *
 * Follows the shadcn registry format (https://ui.shadcn.com/schema/registry.json)
 * so anything that can install a shadcn component — the shadcn CLI, design
 * tools built on it, an AI assistant — can install these, file by file. Each
 * component item also carries its full Mockio contract under `meta`, so a
 * tool learns the props, states, accessibility and usage rules along with
 * the code.
 *
 * Items:
 *   mockio-theme        tokens.css, theme.css (Tailwind v4), the v3 preset,
 *                       tokens.json and styles.css, plus the same palette as
 *                       shadcn `cssVars` and the keyframes as `css`
 *   mockio-contract     contract.ts and preview.ts, which every component's
 *                       .contract.ts and .previews.tsx import
 *   mockio-guidelines   the Markdown in docs/foundations and docs/guides
 *   <component>         every file in src/components/<Name>/, assets included
 *
 * Files land under `mockio/`, mirroring this package's src/ (so
 * src/components/Action/Action.tsx → mockio/components/Action/Action.tsx):
 * the relative imports between components, assets and contract.ts resolve
 * after install exactly as they do here.
 *
 * Dependencies between items are namespaced (`@mockio/mockio-theme`). The
 * shadcn CLI resolves a bare name against its own registry, not this one, so
 * a consumer maps the namespace in their components.json:
 * "registries": { "@mockio": "https://<host>/r/{name}.json" }.
 *
 * Every relative import in a component folder must resolve to a file some
 * item ships, or this script fails: an item that installs and does not
 * compile is worse than no item.
 *
 *   npx tsx scripts/build-registry.ts           write registry.json
 *   npx tsx scripts/build-registry.ts --check   fail if it is out of date
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import type { ComponentContract } from "../src/contract";
// Shared with build-tokens.mjs, so the theme here and theme.css cannot disagree.
import { keyframeRules, readPreset, readTokens, themeVariables } from "./token-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = path.join(root, "src/components");
const NAMESPACE = "@mockio";
const INSTALL_ROOT = "mockio";

type FileType = "registry:ui" | "registry:lib" | "registry:file" | "registry:style";
interface RegistryFile {
  path: string;
  type: FileType;
  target: string;
}

const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const posix = (file: string) => file.split(path.sep).join("/");
const byPath = (a: RegistryFile, b: RegistryFile) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

/** Where a package file lands in the consumer's project: src/x → mockio/x, docs/x → mockio/docs/x. */
function targetOf(packagePath: string): string {
  return `${INSTALL_ROOT}/${packagePath.replace(/^src\//, "")}`;
}

function file(packagePath: string, type: FileType): RegistryFile {
  return { path: packagePath, type, target: targetOf(packagePath) };
}

/** Every file under a folder, recursively, as package-relative POSIX paths, sorted. Dotfiles skipped. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(posix(path.relative(root, full)));
  }
  return out.sort();
}

/** The registry type of a file inside a component folder. */
function typeOf(packagePath: string, folder: string): FileType {
  if (packagePath === `src/components/${folder}/${folder}.tsx`) return "registry:ui";
  if (packagePath.endsWith(".css")) return "registry:style";
  return "registry:file";
}

/** Module specifiers a source file imports (real imports only, not code in strings). */
function importsOf(packagePath: string): string[] {
  if (!/\.(tsx?|jsx?|mjs)$/.test(packagePath)) return [];
  const text = readFileSync(path.join(root, packagePath), "utf8");
  return ts.preProcessFile(text, true, true).importedFiles.map((entry) => entry.fileName);
}

/** The npm package an import names, or null for a relative import. */
function packageOf(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

/** Resolves a relative import to a package-relative file, trying the usual extensions. */
function resolveRelative(fromPath: string, specifier: string): string | null {
  const base = path.join(root, path.dirname(fromPath), specifier);
  const candidates = [base, ...[".ts", ".tsx", ".js", ".mjs"].map((ext) => base + ext), ...["index.ts", "index.tsx"].map((name) => path.join(base, name))];
  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return found ? posix(path.relative(root, found)) : null;
}

// ── The theme ───────────────────────────────────────────────────────────────

const { dark, light } = readTokens(root);
const preset = await readPreset(root);
const unprefixed = (map: Map<string, string>) => Object.fromEntries([...map].map(([name, value]) => [name.replace(/^--/, ""), value]));
// shadcn writes `light` to :root and `dark` to .dark. Variables that do not
// change with the theme (the easing curves) live only in Mockio's :root
// block, so they go in `light` too, or a shadcn-installed project would lack
// them on :root.
const shared = new Map([...dark].filter(([name]) => !light.has(name)));

const themeItem = {
  name: "mockio-theme",
  type: "registry:theme",
  title: "Mockio tokens",
  description:
    "Both themes as CSS variables, the Tailwind v4 theme (theme.css), the Tailwind v3 preset, tokens.json and the base stylesheet with the component classes.",
  dependencies: [] as string[],
  files: [
    file("src/styles.css", "registry:style"),
    file("src/tokens/tailwind-preset.js", "registry:lib"),
    file("src/tokens/theme.css", "registry:style"),
    file("src/tokens/tokens.css", "registry:style"),
    file("src/tokens/tokens.json", "registry:file"),
  ].sort(byPath),
  cssVars: {
    theme: Object.fromEntries(themeVariables(preset, dark) as [string, string][]),
    light: { ...unprefixed(shared), ...unprefixed(light) },
    dark: unprefixed(dark),
  },
  css: keyframeRules(preset) as Record<string, unknown>,
  docs:
    "Mockio is dark by default. With shadcn's cssVars, light is :root and dark is .dark, so add class=\"dark\" to <html> for Mockio's default look. Or skip the cssVars and import mockio/tokens/theme.css (Tailwind v4) or the preset in mockio/tokens/tailwind-preset.js (Tailwind v3).",
  categories: ["foundations"],
};

const contractItem = {
  name: "mockio-contract",
  type: "registry:lib",
  title: "Mockio contracts",
  description: "The contract and preview types that every component's .contract.ts and .previews.tsx import.",
  dependencies: [] as string[],
  files: [file("src/contract.ts", "registry:lib"), file("src/preview.ts", "registry:lib")].sort(byPath),
  categories: ["foundations"],
};

const guideFiles = ["docs/foundations", "docs/guides"]
  .filter((dir) => existsSync(path.join(root, dir)))
  .flatMap((dir) => walk(path.join(root, dir)))
  .filter((packagePath) => packagePath.endsWith(".md"))
  .map((packagePath) => file(packagePath, "registry:file"))
  .sort(byPath);

const guidelinesItem = {
  name: "mockio-guidelines",
  type: "registry:file",
  title: "Mockio guidelines",
  description: "The system's guidance as Markdown — foundations (colour, type, motion, voice) and guides — so a tool that installs the components also has the rules for using them.",
  files: guideFiles,
  categories: ["guidelines"],
};

// Which item ships a given package file, for resolving relative imports.
const shippedBy = new Map<string, string>();
for (const item of [themeItem, contractItem, guidelinesItem]) for (const each of item.files) shippedBy.set(each.path, item.name);

// ── The components ──────────────────────────────────────────────────────────

const folders = readdirSync(componentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const folder of folders) for (const each of walk(path.join(componentsDir, folder))) shippedBy.set(each, kebab(folder));

const problems: string[] = [];
const components = [];
for (const name of folders) {
  const contractFile = path.join(componentsDir, name, `${name}.contract.ts`);
  if (!existsSync(contractFile)) continue;
  const module = (await import(pathToFileURL(contractFile).href)) as Record<string, ComponentContract>;
  const contract = Object.values(module)[0]!;
  const itemName = kebab(name);

  const paths = walk(path.join(componentsDir, name));
  const main = `src/components/${name}/${name}.tsx`;
  const files = paths.map((each) => ({ path: each, type: typeOf(each, name), target: targetOf(each) }));
  // The component first, so a tool that reads only the first file gets the code.
  files.sort((a, b) => (a.path === main ? -1 : b.path === main ? 1 : byPath(a, b)));

  const packages = new Set(contract.dependencies);
  const items = new Set(contract.composes.map(kebab));
  for (const each of paths) {
    for (const specifier of importsOf(each)) {
      const pkg = packageOf(specifier);
      if (pkg) {
        if (pkg !== "react" && pkg !== "react-dom") packages.add(pkg);
        continue;
      }
      const resolved = resolveRelative(each, specifier);
      const owner = resolved ? shippedBy.get(resolved) : undefined;
      if (!resolved || !owner) problems.push(`${each} imports "${specifier}", which no registry item ships`);
      else if (owner !== itemName) items.add(owner);
    }
  }
  items.delete(themeItem.name);

  components.push({
    name: itemName,
    type: "registry:ui",
    title: name,
    description: contract.summary,
    dependencies: sorted(packages),
    registryDependencies: [themeItem.name, ...sorted(items)].map((item) => `${NAMESPACE}/${item}`),
    files,
    categories: [contract.level],
    meta: { level: contract.level, status: contract.status, version: contract.version, contract },
  });
}

if (problems.length > 0) {
  console.error(`registry.json not written:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "mockio",
  homepage: "https://www.getmockio.com",
  items: [themeItem, contractItem, guidelinesItem, ...components],
};

const json = JSON.stringify(registry, null, 2) + "\n";
const target = path.join(root, "registry.json");
const summary = `${components.length} components, ${guideFiles.length} guideline files`;
if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== json) {
    console.error("registry.json is out of date: run npm run registry");
    process.exit(1);
  }
  console.log(`registry.json up to date (${summary})`);
} else {
  writeFileSync(target, json);
  console.log(`registry.json: ${summary}`);
}
