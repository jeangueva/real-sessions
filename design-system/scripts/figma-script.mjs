/**
 * Prints a Figma Plugin API script, with src/tokens/figma.json inlined, for an
 * agent to run in the library file through the Figma MCP (`use_figma`).
 *
 *   node scripts/figma-script.mjs drift   read-only: what in Figma differs from figma.json
 *   node scripts/figma-script.mjs push    make Figma hold figma.json, then report what changed
 *   node scripts/figma-script.mjs audit   read-only: the library against the agent-readiness
 *                                         checklist (docs/guides/figma.md#audit)
 *
 * The code is the source. `push` never invents a colour: a semantic variable
 * is aliased to the primitive that already holds its exact value, and when
 * none does it creates one under `unmatched/…` and says so, for a person to
 * name or fold into a scale. Run `drift` after `push`; it must come back empty.
 *
 * See docs/guides/figma.md.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
if (!["drift", "push", "audit"].includes(mode)) {
  console.error("usage: node scripts/figma-script.mjs drift|push|audit");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(path.join(root, "src/tokens/figma.json"), "utf8"));
delete spec.$description;
// Descriptions, doc links and preferred instances, written from the contracts.
spec.docs = JSON.parse(readFileSync(path.join(root, "src/tokens/figma-components.json"), "utf8")).components;

const WEIGHTS = { 300: "Light", 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" };

// Runs inside Figma. Plain JavaScript with top-level await and `return`.
const body = String.raw`
const MODE = ${JSON.stringify(mode)};
const WEIGHTS = ${JSON.stringify(WEIGHTS)};
const hex = (c) => "#" + [c.r, c.g, c.b, c.a ?? 1].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const rgba = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255, a: parseInt(h.slice(7, 9), 16) / 255 });
const pct = (n) => Math.round(n * 1000) / 10;

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const ensureCollection = (name, modes) => {
  let c = collections.find((x) => x.name === name);
  if (!c && MODE === "push") {
    c = figma.variables.createVariableCollection(name);
    c.renameMode(c.modes[0].modeId, modes[0]);
    for (const m of modes.slice(1)) c.addMode(m);
    collections.push(c);
  }
  return c;
};
const prim = ensureCollection("Primitives", ["Value"]);
const color = ensureCollection("Color", ["Light", "Dark"]);
const radius = ensureCollection("Radius", ["Value"]);
const spacing = ensureCollection("Spacing", ["Value"]);
let vars = await figma.variables.getLocalVariablesAsync();
const byId = () => Object.fromEntries(vars.map((v) => [v.id, v]));
const find = (coll, name) => coll && vars.find((v) => v.variableCollectionId === coll.id && v.name === name);
const resolve = (v, modeId, ids = byId()) => {
  const val = v.valuesByMode[modeId] ?? Object.values(v.valuesByMode)[0];
  return val && val.type === "VARIABLE_ALIAS" ? resolve(ids[val.id], Object.keys(ids[val.id].valuesByMode)[0], ids) : val;
};
const report = { drift: [], changed: [], unmatched: [] };

// Colours
const modeId = (name) => color && color.modes.find((m) => m.name === name)?.modeId;
for (const c of SPEC.colors) {
  let v = find(color, c.name);
  if (!v && MODE === "drift") { report.drift.push({ token: c.name, figma: "missing" }); continue; }
  if (!v) { v = figma.variables.createVariable(c.name, color, "COLOR"); vars.push(v); report.changed.push("created " + c.name); }
  for (const [m, want] of [["Light", c.light], ["Dark", c.dark]]) {
    const got = hex(resolve(v, modeId(m)));
    if (got === want) continue;
    if (MODE === "drift") { report.drift.push({ token: c.name, mode: m, figma: got, code: want, css: c.css }); continue; }
    let target = prim && vars.find((p) => p.variableCollectionId === prim.id && hex(Object.values(p.valuesByMode)[0]) === want);
    if (!target) {
      target = figma.variables.createVariable("unmatched/" + c.name.replace(/\//g, "-") + "-" + m.toLowerCase(), prim, "COLOR");
      target.setValueForMode(prim.modes[0].modeId, rgba(want));
      target.scopes = [];
      vars.push(target);
      report.unmatched.push(target.name + " = " + want);
    }
    v.setValueForMode(modeId(m), { type: "VARIABLE_ALIAS", id: target.id });
    report.changed.push(c.name + "/" + m + ": " + got + " → " + want + " (" + target.name + ")");
  }
  if (MODE === "push") {
    v.scopes = c.scopes;
    v.setVariableCodeSyntax("WEB", "rgb(var(" + c.css.split(" @ ")[0] + "))");
    v.description = "Code: " + c.css + " · Tailwind: " + c.tailwind + ". Generated pairing — edit design-system/src/tokens/figma-map.js, not this variable.";
  }
}

// Radii and spacing
for (const [coll, list, scopes] of [[radius, SPEC.radii, ["CORNER_RADIUS"]], [spacing, SPEC.spacing, ["GAP", "WIDTH_HEIGHT"]]]) {
  for (const n of list) {
    let v = find(coll, n.name);
    const got = v ? Object.values(v.valuesByMode)[0] : "missing";
    if (got === n.px) continue;
    if (MODE === "drift") { report.drift.push({ token: n.name, figma: got, code: n.px }); continue; }
    if (!v) { v = figma.variables.createVariable(n.name, coll, "FLOAT"); vars.push(v); }
    v.setValueForMode(coll.modes[0].modeId, n.px);
    v.scopes = scopes;
    v.description = "Code: " + n.tailwind + ".";
    report.changed.push(n.name + ": " + got + " → " + n.px);
  }
}

// Text styles. A family the file cannot load falls back to Inter and is reported, not drift.
const fonts = await figma.listAvailableFontsAsync();
const loadable = (family, style) => fonts.some((f) => f.fontName.family === family && f.fontName.style === style);
const textStyles = await figma.getLocalTextStylesAsync();
report.fontFallbacks = [];
for (const t of SPEC.textStyles) {
  const style = WEIGHTS[t.weight];
  const family = loadable(t.family, style) ? t.family : "Inter";
  if (family !== t.family && !report.fontFallbacks.includes(t.family)) report.fontFallbacks.push(t.family);
  let s = textStyles.find((x) => x.name === t.name);
  const want = { font: family + " " + style, size: t.size, lineHeight: pct(t.lineHeight), letterSpacing: pct(t.letterSpacing), textCase: t.uppercase ? "UPPER" : "ORIGINAL" };
  // Figma stores percentages as floats (95 reads back as 94.99999…): compare to a tenth.
  const tenth = (n) => Math.round(n * 10) / 10;
  const got = s && { font: s.fontName.family + " " + s.fontName.style, size: s.fontSize, lineHeight: tenth(s.lineHeight.value), letterSpacing: tenth(s.letterSpacing.value), textCase: s.textCase };
  if (got && JSON.stringify(got) === JSON.stringify(want)) continue;
  if (MODE === "drift") { report.drift.push({ token: "text/" + t.name, figma: got ?? "missing", code: want }); continue; }
  await figma.loadFontAsync({ family, style });
  if (!s) s = figma.createTextStyle();
  s.name = t.name;
  s.fontName = { family, style };
  s.fontSize = t.size;
  s.lineHeight = { unit: "PERCENT", value: want.lineHeight };
  s.letterSpacing = { unit: "PERCENT", value: want.letterSpacing };
  s.textCase = want.textCase;
  s.description = "Code: " + t.tailwind + " (" + t.family + " " + t.weight + "). Generated from design-system/src/tokens/figma.json." + (family !== t.family ? " Figma shows Inter until " + t.family + " is installed." : "");
  report.changed.push("text/" + t.name);
}

// Effect styles
const effectStyles = await figma.getLocalEffectStylesAsync();
for (const e of SPEC.effectStyles) {
  let s = effectStyles.find((x) => x.name === e.name);
  const want = e.shadows.map((l) => [l.x, l.y, l.blur, l.spread, l.color]);
  const got = s && s.effects.filter((f) => f.type === "DROP_SHADOW").map((f) => [f.offset.x, f.offset.y, f.radius, f.spread ?? 0, hex(f.color)]);
  if (got && JSON.stringify(got) === JSON.stringify(want)) continue;
  if (MODE === "drift") { report.drift.push({ token: "effect/" + e.name, figma: got ?? "missing", code: want }); continue; }
  if (!s) s = figma.createEffectStyle();
  s.name = e.name;
  s.effects = e.shadows.map((l) => ({ type: "DROP_SHADOW", color: rgba(l.color), offset: { x: l.x, y: l.y }, radius: l.blur, spread: l.spread, visible: true, blendMode: "NORMAL", showShadowBehindNode: false }));
  s.description = "Code: " + e.tailwind + ". Generated from design-system/src/tokens/figma.json.";
  report.changed.push("effect/" + e.name);
}

// Components: the node exists and its properties are the ones figma-map.js names.
// Read-only in both modes; a component is drawn by a person or an agent, not pushed.
for (const c of SPEC.components.filter((x) => x.node)) {
  const node = await figma.getNodeByIdAsync(c.node);
  if (!node || (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET")) { report.drift.push({ component: c.name, figma: "missing", code: c.node }); continue; }
  const got = Object.keys(node.componentPropertyDefinitions).map((k) => k.split("#")[0]).sort();
  if (JSON.stringify(got) !== JSON.stringify([...c.properties].sort())) report.drift.push({ component: c.name, figma: got, code: c.properties });
}

// Component documentation: description (Markdown), doc link, slot descriptions
// and preferred instances, from figma-components.json. Preferred names resolve
// to components on the library's pages.
const libraryPages = figma.root.children.filter((p) => /Iconografía|Componentes|Examples/.test(p.name));
for (const p of libraryPages) await p.loadAsync();
const byName = new Map();
for (const p of libraryPages) for (const n of p.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] })) if (!(n.type === "COMPONENT" && n.parent?.type === "COMPONENT_SET")) byName.set(n.name, n);
for (const d of SPEC.docs) {
  const node = await figma.getNodeByIdAsync(d.node);
  if (!node) continue;
  const sameDesc = (node.descriptionMarkdown || "").trim() === d.description.trim();
  const sameLink = (node.documentationLinks?.[0]?.uri ?? "") === d.docUrl;
  if (!sameDesc) { if (MODE === "drift") report.drift.push({ component: d.name, figma: "description differs" }); else { node.descriptionMarkdown = d.description; report.changed.push(d.name + ": description"); } }
  if (!sameLink) { if (MODE === "drift") report.drift.push({ component: d.name, figma: "doc link differs" }); else { node.documentationLinks = [{ uri: d.docUrl }]; report.changed.push(d.name + ": doc link"); } }
  const defs = node.componentPropertyDefinitions;
  for (const [prop, names] of Object.entries(d.preferred ?? {})) {
    const key = Object.keys(defs).find((k) => k.split("#")[0] === prop);
    if (!key) continue;
    const want = names.map((n) => byName.get(n)).filter(Boolean).map((n) => ({ type: n.type, key: n.key }));
    const got = (defs[key].preferredValues ?? []).map((v) => v.key);
    const missing = names.filter((n) => !byName.has(n));
    if (missing.length) report.unresolvedPreferred = [...(report.unresolvedPreferred ?? []), ...missing.map((m) => d.name + "." + prop + " → " + m)];
    if (JSON.stringify(got) !== JSON.stringify(want.map((w) => w.key))) {
      if (MODE === "drift") report.drift.push({ component: d.name, property: prop, figma: "preferred instances differ" });
      else { node.editComponentProperty(key, { preferredValues: want, ...(d.slot?.[prop] ? { description: d.slot[prop] } : {}) }); report.changed.push(d.name + "." + prop + ": preferred"); }
    } else if (d.slot?.[prop] && defs[key].description !== d.slot[prop]) {
      if (MODE === "drift") report.drift.push({ component: d.name, property: prop, figma: "slot description differs" });
      else { node.editComponentProperty(key, { description: d.slot[prop] }); report.changed.push(d.name + "." + prop + ": slot description"); }
    }
  }
}

report.checked = { components: SPEC.components.filter((x) => x.node).length, colors: SPEC.colors.length * 2, radii: SPEC.radii.length, spacing: SPEC.spacing.length, textStyles: SPEC.textStyles.length, effectStyles: SPEC.effectStyles.length };
if (MODE === "drift") { delete report.changed; delete report.unmatched; }
return report;
`;

// The agent-readiness audit, after Figma's own checklist for a library an agent
// can use: meaningful layer names, resizing, properties, focused variants,
// descriptions with aliases, every value on a variable or style, examples.
const audit = String.raw`
// Brand art: Mark draws in fixed colours, Mascot is images, Wordmark is sized in em (gap 0.35em).
const ALLOW_LITERAL = new Set(["Mark", "Mascot", "Wordmark"]);
const GENERIC = /^(Frame|Rectangle|Ellipse|Vector|Group|Text|Line|Polygon|Star|Instance|Component|Slot|Union|Subtract)( \d+)?$/;
const vars = await figma.variables.getLocalVariablesAsync();
const spaceVals = new Set(vars.filter((v) => v.name.startsWith("space/")).map((v) => Object.values(v.valuesByMode)[0]));
const findings = [];
const add = (rule, where, detail) => findings.push({ rule, where, detail });
const pages = figma.root.children.filter((p) => /Componentes|Examples/.test(p.name));
for (const p of pages) await p.loadAsync();
const examplesPage = figma.root.children.find((p) => /Examples/.test(p.name));
if (!examplesPage) add("examples", "file", "no Examples page");
else if (!examplesPage.findAllWithCriteria({ types: ["COMPONENT"] }).some((c) => c.name.endsWith("_example"))) add("examples", examplesPage.name, "no component named *_example");
const path = (n) => { const out = []; let x = n; while (x && x.type !== "PAGE") { out.unshift(x.name); x = x.parent; } return out.join(" / "); };
// Guidelines: a page whose do / don't covers every documented component.
const guidelines = figma.root.children.find((p) => /Guidelines/.test(p.name));
if (!guidelines) add("guidelines", "file", "no Guidelines page");
else { await guidelines.loadAsync(); for (const d of SPEC.docs) if (!guidelines.findOne((n) => n.type === "FRAME" && n.name === d.name)) add("guidelines", d.name, "no do / don't card"); }
// Examples are audited like components (names, values, styles), minus aliases and doc links.
const examples = examplesPage ? examplesPage.findAllWithCriteria({ types: ["COMPONENT"] }).filter((c) => c.name.endsWith("_example")) : [];
for (const e of examples) if (!e.description) add("description", e.name, "example without a description");
const targets = [...SPEC.docs, ...examples.map((e) => ({ name: e.name, node: e.id, example: true }))];
for (const d of targets) {
  const root = await figma.getNodeByIdAsync(d.node);
  if (!root) { add("exists", d.name, "node " + d.node + " missing"); continue; }
  if (d.example) { /* examples skip the library-entry checks below */ } else {
  if (!(root.descriptionMarkdown || root.description)) add("description", d.name, "empty");
  else if (!/Also known as/.test(root.descriptionMarkdown || root.description)) add("description", d.name, "no aliases");
  if (!root.documentationLinks?.length) add("doc link", d.name, "none");
  if (root.type === "COMPONENT_SET" && root.children.length > 30) add("variants", d.name, root.children.length + " variants (max 30)");
  const defs = root.type === "COMPONENT" && root.parent?.type === "COMPONENT_SET" ? {} : root.componentPropertyDefinitions;
  for (const [k, def] of Object.entries(defs)) if ((def.type === "INSTANCE_SWAP" || def.type === "SLOT") && !(def.preferredValues ?? []).length) add("preferred", d.name + "." + k.split("#")[0], def.type + " without preferred instances");
  }
  const variants = root.type === "COMPONENT_SET" ? root.children : [root];
  for (const v of variants) {
    if (v.layoutMode === "NONE" && !ALLOW_LITERAL.has(d.name) && !v.findAll(() => true).every((c) => c.constraints?.horizontal === "SCALE")) add("resize", path(v), "no auto layout and children not set to scale");
    for (const n of [v, ...v.findAll(() => true)]) {
      // Inside an instance the main component owns names and values — except
      // what was put in a slot, which is authored here.
      let inInstance = false;
      for (let x = n.parent; x && x !== v; x = x.parent) { if (x.type === "SLOT") break; if (x.type === "INSTANCE") { inInstance = true; break; } }
      if (n.type === "SLOT" && n.parent?.type === "INSTANCE") inInstance = false;
      if (inInstance) continue;
      if (n !== v && GENERIC.test(n.name)) add("layer name", path(n), "generic name");
      if (ALLOW_LITERAL.has(d.name)) continue;
      for (const key of ["fills", "strokes"]) {
        if (!(key in n) || n[key] === figma.mixed) continue;
        for (const paint of n[key]) if (paint.type === "SOLID" && paint.visible !== false && !paint.boundVariables?.color && !(paint.opacity <= 0.12 && paint.color.r === 1 && paint.color.g === 1 && paint.color.b === 1)) add("unbound colour", path(n), key);
      }
      if (n.type === "TEXT" && !n.textStyleId) add("text style", path(n), "no text style");
      if ("cornerRadius" in n && n.cornerRadius !== figma.mixed && n.cornerRadius > 0 && !n.boundVariables?.topLeftRadius && n.name !== "Focus ring") add("unbound radius", path(n), String(n.cornerRadius));
      if ("layoutMode" in n && n.layoutMode !== "NONE") {
        for (const k of ["itemSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) {
          const val = n[k];
          if (val > 0 && !n.boundVariables?.[k]) add(spaceVals.has(val) ? "unbound spacing" : "off-scale spacing", path(n), k + " " + val);
        }
      }
    }
  }
}
const byRule = {}; for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
return { total: findings.length, byRule, findings: findings.slice(0, 60) };
`;

process.stdout.write(`// Generated by design-system/scripts/figma-script.mjs ${mode} — run with use_figma in ${spec.file.url}\nconst SPEC = ${JSON.stringify(mode === "audit" ? { docs: spec.docs.map(({ name, node }) => ({ name, node })) } : spec)};\n${(mode === "audit" ? audit : body).trim()}\n`);
