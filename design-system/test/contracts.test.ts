import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalog, filesOf, folders } from "../src/catalog";

/**
 * The contract tests: a contract is a promise, so every field is checked
 * against the component it describes.
 */

const ROOT = path.resolve(__dirname, "..");
const LEVELS = ["atom", "molecule", "organism", "template", "utility"];
const WEB_SRC = path.resolve(ROOT, "../web/src");

describe("every component folder is complete", () => {
  it.each(folders)("%s has code, contract, previews and docs", (name) => {
    expect(filesOf(name)).toEqual({ code: true, contract: true, previews: true, docs: true });
    expect(existsSync(path.join(ROOT, "src/components", name, "index.ts")), `${name}/index.ts`).toBe(true);
  });

  it("is exported from the package entry", () => {
    const entry = readFileSync(path.join(ROOT, "src/index.ts"), "utf8");
    for (const name of folders) expect(entry, name).toContain(`./components/${name}"`);
  });
});

describe.each(catalog.map((entry) => [entry.name, entry] as const))("%s", (name, entry) => {
  const { contract, previews, source, docs } = entry;

  it("names itself after its folder and points at its own file", () => {
    expect(contract.name).toBe(name);
    expect(contract.source).toBe(`src/components/${name}/${name}.tsx`);
    expect(existsSync(path.join(ROOT, contract.source))).toBe(true);
  });

  it("has a level, a status and a one-sentence summary", () => {
    expect(LEVELS).toContain(contract.level);
    expect(["stable", "beta", "deprecated"]).toContain(contract.status);
    expect(contract.summary.length).toBeGreaterThan(20);
    expect(contract.summary.length).toBeLessThan(220);
  });

  it("documents props the component actually accepts", () => {
    // Each documented prop must appear in the source: in the props type, in
    // the destructuring, or (for native attributes) via the extended HTML
    // attributes the props interface declares.
    const extendsNative = /extends\s+(?:Omit<)?\s*(?:React\.)?(?:\w*HTMLAttributes|ButtonHTMLAttributes|InputHTMLAttributes|AnchorHTMLAttributes)/.test(source);
    for (const prop of Object.keys(contract.props)) {
      const mentioned = new RegExp(`\\b${prop}\\b`).test(source);
      expect(mentioned || extendsNative, `${name}.${prop} is documented but not in the source`).toBe(true);
    }
  });

  it("documents every prop declared in its props interface", () => {
    const iface = source.match(/export (?:interface|type) \w*Props\b[^{]*\{([\s\S]*?)\n\}/);
    if (!iface) return;
    const declared = [...iface[1]!.matchAll(/^\s{2}(?:readonly\s+)?["']?([A-Za-z][\w-]*)["']?\??:/gm)].map((m) => m[1]!);
    for (const prop of declared) expect(Object.keys(contract.props), `${name}.${prop} is accepted but undocumented`).toContain(prop);
  });

  it("gives required props no default and optional props one, or says why not", () => {
    for (const [prop, spec] of Object.entries(contract.props)) {
      if (spec.required) expect(spec.default, `${name}.${prop}`).toBeUndefined();
      expect(spec.description.length, `${name}.${prop} description`).toBeGreaterThan(10);
    }
  });

  it("shows every state it promises in a preview", () => {
    const shown = new Set(previews.filter((p) => p.kind === "state").map((p) => p.state));
    for (const state of contract.states) {
      if (["default", "hover", "pressed", "focus-visible"].includes(state.name)) continue;
      expect(shown.has(state.name), `${name}: state "${state.name}" has no preview`).toBe(true);
    }
  });

  it("has a default preview, unique ids, code for each, and reasons for misuse", () => {
    expect(previews.some((p) => p.kind === "default"), `${name}: no default preview`).toBe(true);
    const ids = previews.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preview of previews) {
      expect(preview.code.trim().length, `${name}/${preview.id} code`).toBeGreaterThan(0);
      if (preview.kind === "misuse") expect(preview.why, `${name}/${preview.id} why`).toBeTruthy();
      else expect(preview.why, `${name}/${preview.id} has why but is not misuse`).toBeUndefined();
    }
  });

  it("covers accessibility, content and usage", () => {
    const a11y = contract.accessibility;
    for (const field of ["role", "reducedMotion", "contrast", "focus", "targetSize", "screenReader"] as const) {
      expect(a11y[field].length, `${name}.accessibility.${field}`).toBeGreaterThan(3);
    }
    expect(contract.usage.when.length, `${name}.usage.when`).toBeGreaterThan(0);
    expect(contract.usage.whenNot.length, `${name}.usage.whenNot`).toBeGreaterThan(0);
    expect(contract.usage.do.length + contract.usage.dont.length).toBeGreaterThan(1);
    expect(contract.content.voice.length, `${name}.content.voice`).toBeGreaterThan(0);
  });

  it("lists events that exist as props", () => {
    for (const event of contract.events) expect(Object.keys(contract.props), `${name} event ${event.name}`).toContain(event.name);
  });

  it("composes only components that exist", () => {
    for (const child of contract.composes) expect(folders, `${name} composes ${child}`).toContain(child);
    for (const rel of contract.related) expect(folders, `${name} related ${rel.name}`).toContain(rel.name);
  });

  it("covers i18n, responsive behaviour, the design tool and its version", () => {
    for (const field of ["rtl", "textExpansion", "formatting"] as const) {
      expect(contract.i18n[field].length, `${name}.i18n.${field}`).toBeGreaterThan(3);
    }
    for (const s of contract.i18n.strings) expect(Object.keys(contract.props), `${name} string "${s.text}" is overridden by ${s.prop}`).toContain(s.prop);
    expect(contract.responsive.behaviour.length, `${name}.responsive.behaviour`).toBeGreaterThan(0);
    expect(contract.responsive.minWidth).toMatch(/^\d+px$/);
    expect(contract.designTool.registryItem).toBe(name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase());
    expect(contract.designTool.importStatement).toContain(`{ ${name} }`);
    for (const prop of contract.designTool.canvasProps) expect(Object.keys(contract.props), `${name} canvas prop ${prop}`).toContain(prop);
    expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.changelog[0]?.version, `${name}: the newest changelog entry is the current version`).toBe(contract.version);
  });

  // The drift guard: the product keeps its own copy of most components (it
  // cannot import across the web/ boundary), so the contract names that copy
  // and this test fails the day it is renamed, moved or deleted.
  it.runIf(existsSync(WEB_SRC))("points at a product counterpart that still exists", () => {
    const counterpart = contract.appCounterpart;
    if (!counterpart) return;
    const file = path.join(WEB_SRC, counterpart.file);
    expect(existsSync(file), `${name}: ${counterpart.file} is gone`).toBe(true);
    const text = readFileSync(file, "utf8");
    const exported =
      counterpart.exportName === "default"
        ? /export default/.test(text)
        : new RegExp(`export (?:function|const|class) ${counterpart.exportName}\\b`).test(text);
    expect(exported, `${name}: ${counterpart.file} no longer exports ${counterpart.exportName}`).toBe(true);
  });

  it("has Markdown guidance with the required sections", () => {
    expect(docs).toMatch(new RegExp(`^---[\\s\\S]*?name: ${name}`));
    for (const heading of ["## Anatomy", "## When to use it", "## When not to use it", "## Interaction", "## Writing", "## Accessibility", "## Do and don't"]) {
      expect(docs, `${name}.md is missing "${heading}"`).toContain(heading);
    }
  });

  it("does not import app code", () => {
    expect(source).not.toMatch(/from ["']@\//);
    expect(source).not.toMatch(/useT\(|useLocale\(|useThesisT\(/);
  });
});

// figma-map.js says where each component lives in the Figma library, or why
// it is not drawn there. A folder without an entry is a component the library
// silently lacks; an entry without a folder points designers at nothing.
describe("the Figma library", () => {
  it("accounts for every component folder, and only those", async () => {
    const { COMPONENTS } = await import("../src/tokens/figma-map.js");
    expect(Object.keys(COMPONENTS).sort()).toEqual([...folders].sort());
    for (const [name, entry] of Object.entries(COMPONENTS)) {
      if (entry.figma === null) expect(entry.reason.length, `${name} needs a reason to stay out of Figma`).toBeGreaterThan(10);
      else expect(entry.figma, `${name}: a Figma node id like "14:103"`).toMatch(/^\d+:\d+$/);
    }
  });
});

// The brand art is the one place the system keeps literals instead of tokens,
// so the token tests cannot see it drift. Compare it with the product's own
// copy directly: the same colours in the mark, the same bytes in Mocki.
describe("the brand art", () => {
  const WEB = path.resolve(__dirname, "../../web");
  const hexes = (text: string) =>
    new Set(
      [...text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => {
        const h = m[1]!;
        return (h.length === 3 ? [...h].map((c) => c + c).join("") : h).toUpperCase();
      }),
    );

  it.runIf(existsSync(path.join(WEB, "src/design-system/mark.tsx")))("draws the mark in the product's colours", () => {
    const product = readFileSync(path.join(WEB, "src/design-system/mark.tsx"), "utf8");
    const system = readFileSync(path.resolve(__dirname, "../src/components/Mark/Mark.tsx"), "utf8").match(/const BRAND = \{[\s\S]*?\}/)![0];
    expect([...hexes(system)].sort()).toEqual([...hexes(product.slice(product.indexOf("<svg")))].sort());
  });

  it.runIf(existsSync(path.join(WEB, "public/avatars")))("ships the product's six Mocki stages", () => {
    for (let level = 1; level <= 6; level += 1) {
      const product = readFileSync(path.join(WEB, `public/avatars/level-${level}.png`));
      const system = readFileSync(path.resolve(__dirname, `../src/components/Mascot/assets/level-${level}.png`));
      expect(system.equals(product), `Mascot level-${level}.png differs from web/public/avatars`).toBe(true);
    }
  });
});

// What the Figma agent reads to pick a component: a description written from
// the contract, with the names people search for.
describe("the Figma descriptions", () => {
  it("cover every drawn component, with aliases and a doc link", async () => {
    const { COMPONENTS } = await import("../src/tokens/figma-map.js");
    const docs = JSON.parse(readFileSync(path.resolve(__dirname, "../src/tokens/figma-components.json"), "utf8")) as {
      components: { name: string; description: string; docUrl: string }[];
    };
    const drawn = Object.entries(COMPONENTS).filter(([, entry]) => entry.figma).map(([name]) => name).sort();
    expect(docs.components.map((c) => c.name).sort()).toEqual(drawn);
    for (const [name, entry] of Object.entries(COMPONENTS)) expect(entry.aliases.length, `${name} needs at least three aliases`).toBeGreaterThanOrEqual(3);
    for (const c of docs.components) {
      expect(c.description, c.name).toMatch(/\*\*Also known as:\*\*/);
      expect(existsSync(path.resolve(__dirname, `../src/components/${c.name}/${c.name}.md`)), `${c.name} doc link`).toBe(true);
    }
  });
});
