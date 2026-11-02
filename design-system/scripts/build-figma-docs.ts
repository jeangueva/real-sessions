/**
 * src/tokens/figma-components.json — what each component's Figma node must
 * say about itself, written from its contract so the two cannot disagree.
 *
 * For every component drawn in the library (figma-map.js → COMPONENTS):
 *
 *   description   Markdown: the contract's summary, when to use it, what to
 *                 use instead, its aliases and its import line. The Figma
 *                 agent reads this to pick the right component.
 *   docUrl        The component's guidance (<Name>.md) on GitHub.
 *   preferred     Instances a swap or slot property should offer first.
 *   slot          The description of each native slot.
 *   do / dont     The contract's usage pairs, for the Guidelines page.
 *
 * Plus `rules`: the numbered rules of AGENTS.md, for the same page.
 *
 *   npx tsx scripts/build-figma-docs.ts           write it
 *   npx tsx scripts/build-figma-docs.ts --check   fail if it is out of date
 *
 * scripts/figma-script.mjs pushes it into the file and reads it back.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { ComponentContract } from "../src/contract";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/jeangueva/real-sessions/blob/main/design-system";
const { COMPONENTS } = await import(pathToFileURL(path.join(root, "src/tokens/figma-map.js")).href);

const sentence = (text: string) => text.trim().replace(/\.$/, "");

function describe(name: string, contract: ComponentContract, aliases: string[]): string {
  const lines = [contract.summary.trim(), ""];
  lines.push(`**Use it for:** ${contract.usage.when.slice(0, 2).map(sentence).join("; ")}.`);
  if (contract.usage.whenNot.length > 0) {
    lines.push("");
    lines.push(`**Not for:** ${contract.usage.whenNot.slice(0, 2).map((n) => `${sentence(n.situation)} → ${sentence(n.instead)}`).join("; ")}.`);
  }
  lines.push("", `**Also known as:** ${aliases.join(", ")}.`, "", `\`${contract.designTool.importStatement}\``);
  return lines.join("\n");
}

const out = [];
for (const [name, entry] of Object.entries(COMPONENTS) as [string, any][]) {
  if (!entry.figma) continue;
  const module = await import(pathToFileURL(path.join(root, `src/components/${name}/${name}.contract.ts`)).href);
  const contract = module[`${name}Contract`] as ComponentContract;
  out.push({
    name,
    node: entry.figma,
    properties: entry.properties,
    description: describe(name, contract, entry.aliases),
    docUrl: `${REPO}/src/components/${name}/${name}.md`,
    ...(entry.preferred ? { preferred: entry.preferred } : {}),
    ...(entry.slot ? { slot: entry.slot } : {}),
    do: contract.usage.do,
    dont: contract.usage.dont,
  });
}

// The library's guidelines page: the rules in AGENTS.md, numbered, in their own
// words, so a designer's agent and a coding agent read the same rules.
const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
const rulesBlock = agents.slice(agents.indexOf("## The rules"), agents.indexOf("\n## ", agents.indexOf("## The rules") + 1));
const rules = rulesBlock
  .split(/\n(?=\d+\. )/)
  .slice(1)
  .map((rule) => rule.replace(/^\d+\. /, "").replace(/\s*\n\s*/g, " ").trim());

const text =
  JSON.stringify(
    {
      $description:
        "What each component's Figma node must say about itself. Generated from the contracts and src/tokens/figma-map.js by scripts/build-figma-docs.ts — edit those, not this file.",
      rules,
      components: out,
    },
    null,
    2,
  ) + "\n";

const target = path.join(root, "src/tokens/figma-components.json");
if (process.argv.includes("--check")) {
  if (!existsSync(target) || readFileSync(target, "utf8") !== text) {
    console.error("src/tokens/figma-components.json out of date: run npm run figma:docs");
    process.exit(1);
  }
  console.log(`figma-components.json up to date (${out.length} components)`);
} else {
  writeFileSync(target, text);
  console.log(`figma-components.json: ${out.length} components`);
}
