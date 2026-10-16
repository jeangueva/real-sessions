/**
 * registry.json — the system, described for tools.
 *
 * Follows the shadcn registry format (https://ui.shadcn.com/schema/registry.json)
 * so anything that can install a shadcn component — the shadcn CLI, design
 * tools built on it, an AI assistant — can install these, file by file. Each
 * item also carries its full Mockio contract under `meta`, so a tool learns
 * the props, states, accessibility and usage rules along with the code.
 *
 *   npx tsx scripts/build-registry.ts           write registry.json
 *   npx tsx scripts/build-registry.ts --check   fail if it is out of date
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ComponentContract } from "../src/contract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentsDir = path.join(root, "src/components");

const folders = readdirSync(componentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const items = [];
for (const name of folders) {
  const contractFile = path.join(componentsDir, name, `${name}.contract.ts`);
  if (!existsSync(contractFile)) continue;
  const module = (await import(pathToFileURL(contractFile).href)) as Record<string, ComponentContract>;
  const contract = Object.values(module)[0]!;
  const files = [`${name}.tsx`, `${name}.contract.ts`, `${name}.previews.tsx`, `${name}.md`, "index.ts"]
    .filter((file) => existsSync(path.join(componentsDir, name, file)))
    .map((file) => ({
      path: `src/components/${name}/${file}`,
      type: file === `${name}.tsx` ? "registry:ui" : "registry:file",
      target: `components/mockio/${name}/${file}`,
    }));
  items.push({
    name: name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
    type: "registry:ui",
    title: name,
    description: contract.summary,
    dependencies: contract.dependencies,
    registryDependencies: contract.composes.map((c) => c.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()),
    files,
    meta: { level: contract.level, status: contract.status, contract },
  });
}

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "mockio",
  homepage: "https://www.getmockio.com",
  items: [
    {
      name: "mockio-theme",
      type: "registry:theme",
      title: "Mockio tokens",
      description: "CSS variables for both themes, the Tailwind preset and the base stylesheet.",
      dependencies: [],
      files: [
        { path: "src/tokens/tokens.css", type: "registry:style", target: "styles/mockio-tokens.css" },
        { path: "src/tokens/tailwind-preset.js", type: "registry:lib", target: "lib/mockio-tailwind-preset.js" },
        { path: "src/tokens/tokens.json", type: "registry:file", target: "styles/mockio-tokens.json" },
        { path: "src/styles.css", type: "registry:style", target: "styles/mockio.css" },
      ],
    },
    ...items,
  ],
};

const json = JSON.stringify(registry, null, 2) + "\n";
const target = path.join(root, "registry.json");
if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== json) {
    console.error("registry.json is out of date: run npm run registry");
    process.exit(1);
  }
  console.log(`registry.json up to date (${items.length} components)`);
} else {
  writeFileSync(target, json);
  console.log(`registry.json: ${items.length} components`);
}
