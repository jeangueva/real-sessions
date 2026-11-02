/**
 * Prints a Figma Plugin API script, with src/tokens/figma.json inlined, for an
 * agent to run in the library file through the Figma MCP (`use_figma`).
 *
 *   node scripts/figma-script.mjs drift   read-only: what in Figma differs from figma.json
 *   node scripts/figma-script.mjs push    make Figma hold figma.json, then report what changed
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
if (mode !== "drift" && mode !== "push") {
  console.error("usage: node scripts/figma-script.mjs drift|push");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(path.join(root, "src/tokens/figma.json"), "utf8"));
delete spec.$description;

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

report.checked = { components: SPEC.components.filter((x) => x.node).length, colors: SPEC.colors.length * 2, radii: SPEC.radii.length, spacing: SPEC.spacing.length, textStyles: SPEC.textStyles.length, effectStyles: SPEC.effectStyles.length };
if (MODE === "drift") { delete report.changed; delete report.unmatched; }
return report;
`;

process.stdout.write(`// Generated by design-system/scripts/figma-script.mjs ${mode} — run with use_figma in ${spec.file.url}\nconst SPEC = ${JSON.stringify(spec)};\n${body.trim()}\n`);
