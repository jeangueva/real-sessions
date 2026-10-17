import type { ComponentContract } from "./contract";
import type { Preview } from "./preview";

/**
 * Every component in the system, discovered from the folder layout.
 *
 * A component lives in src/components/<Name>/ and owns five files:
 *
 *   <Name>.tsx            the code — what ships
 *   <Name>.contract.ts    the promises — props, states, a11y, content, usage
 *   <Name>.previews.tsx   the specimens — every state and edge, rendered
 *   <Name>.md             the guidance — anatomy, interaction, writing, do/don't
 *   index.ts              the public exports
 *
 * The docs site and the tests both read this catalogue, so a component that
 * exists on disk appears on the site and is tested without being registered
 * anywhere by hand.
 */

export interface CatalogEntry {
  name: string;
  contract: ComponentContract;
  previews: readonly Preview[];
  /** The Markdown guidance, raw. */
  docs: string;
  /** The component's source, raw — shown on the Code tab. */
  source: string;
  /** The contract's source, raw. */
  contractSource: string;
  /** The previews' source, raw. */
  previewsSource: string;
}

const contracts = import.meta.glob<Record<string, unknown>>("./components/*/*.contract.ts", { eager: true });
const previews = import.meta.glob<Record<string, unknown>>("./components/*/*.previews.tsx", { eager: true });
const docs = import.meta.glob<string>("./components/*/*.md", { eager: true, query: "?raw", import: "default" });
const sources = import.meta.glob<string>(
  ["./components/*/*.tsx", "!./components/*/*.previews.tsx"],
  { eager: true, query: "?raw", import: "default" },
);
const contractSources = import.meta.glob<string>("./components/*/*.contract.ts", { eager: true, query: "?raw", import: "default" });
const previewSources = import.meta.glob<string>("./components/*/*.previews.tsx", { eager: true, query: "?raw", import: "default" });

/** The folder a glob key points into: "./components/Action/Action.md" → "Action". */
export function folderOf(path: string): string {
  return path.split("/")[2] ?? "";
}

function single<T>(module: Record<string, unknown> | undefined, suffix: string): T | undefined {
  if (!module) return undefined;
  const key = Object.keys(module).find((k) => k.endsWith(suffix));
  return key ? (module[key] as T) : undefined;
}

function byFolder<T>(record: Record<string, T>): Map<string, T> {
  const map = new Map<string, T>();
  for (const [path, value] of Object.entries(record)) map.set(folderOf(path), value);
  return map;
}

const contractByFolder = byFolder(contracts);
const previewsByFolder = byFolder(previews);
const docsByFolder = byFolder(docs);
const sourceByFolder = new Map<string, string>();
for (const [path, value] of Object.entries(sources)) {
  const folder = folderOf(path);
  // The component file is <Folder>/<Folder>.tsx; ignore helpers beside it.
  if (path.endsWith(`/${folder}.tsx`)) sourceByFolder.set(folder, value);
}
const contractSourceByFolder = byFolder(contractSources);
const previewSourceByFolder = byFolder(previewSources);

/** Folders present on disk, whatever they contain — for the completeness test. */
export const folders: string[] = [
  ...new Set([...contractByFolder.keys(), ...previewsByFolder.keys(), ...docsByFolder.keys(), ...sourceByFolder.keys()]),
].sort();

export const catalog: CatalogEntry[] = folders
  .map((name) => {
    const contract = single<ComponentContract>(contractByFolder.get(name), "Contract");
    const specimens = single<readonly Preview[]>(previewsByFolder.get(name), "Previews");
    if (!contract || !specimens) return null;
    return {
      name,
      contract,
      previews: specimens,
      docs: docsByFolder.get(name) ?? "",
      source: sourceByFolder.get(name) ?? "",
      contractSource: contractSourceByFolder.get(name) ?? "",
      previewsSource: previewSourceByFolder.get(name) ?? "",
    };
  })
  .filter((entry): entry is CatalogEntry => entry !== null);

/** Raw access for the completeness test: which of the five files a folder has. */
export function filesOf(name: string) {
  return {
    code: sourceByFolder.has(name),
    contract: contractByFolder.has(name),
    previews: previewsByFolder.has(name),
    docs: docsByFolder.has(name),
  };
}
