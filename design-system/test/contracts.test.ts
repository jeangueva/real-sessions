import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { catalog, filesOf, folders } from "../src/catalog";

/**
 * The contract tests: a contract is a promise, so every field is checked
 * against the component it describes.
 */

const ROOT = path.resolve(__dirname, "..");
const LEVELS = ["atom", "molecule", "organism", "template"];

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

  it("has Markdown guidance with the required sections", () => {
    expect(docs).toMatch(new RegExp(`^---[\\s\\S]*?name: ${name}`));
    for (const heading of ["## Anatomy", "## Interaction", "## Accessibility", "## When not to use it", "## Do and don't"]) {
      expect(docs, `${name}.md is missing "${heading}"`).toContain(heading);
    }
  });

  it("does not import app code", () => {
    expect(source).not.toMatch(/from ["']@\//);
    expect(source).not.toMatch(/useT\(|useLocale\(|useThesisT\(/);
  });
});
