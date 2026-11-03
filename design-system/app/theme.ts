/**
 * Reading a theme out of the product stylesheet, at runtime.
 *
 * A preview can ask for the light theme while the site is dark, or the other
 * way round. The product stylesheet declares the light theme on
 * `:root[data-theme="light"]` — the html element only — so a subtree cannot
 * ask for it by itself.
 *
 * So the site asks the browser: it puts the theme on the document for a
 * moment, reads the variables the stylesheet computed, and puts the document
 * back. The values come from the stylesheet, so a preview cannot show a
 * palette the product does not have.
 */
import stylesCss from "@ds/styles.css?raw";

export type Theme = "dark" | "light";

/**
 * Every custom property the stylesheet declares, by name. The names are read
 * from the stylesheet rather than written down here, so a new token does not
 * need to be added in two places to show up in a preview.
 */
const VARIABLES = [...new Set([...stylesCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]!))];

const cache = new Map<Theme, Record<string, string>>();

/**
 * The variables a theme computes, as a style object. Read once per theme and
 * kept: the stylesheet does not change while the site is open.
 */
export function themeVariables(theme: Theme): Record<string, string> {
  const known = cache.get(theme);
  if (known) return known;

  const root = document.documentElement;
  const before = root.getAttribute("data-theme");
  root.setAttribute("data-theme", theme);

  const computed = getComputedStyle(root);
  const values: Record<string, string> = {};
  for (const name of VARIABLES) {
    const value = computed.getPropertyValue(name).trim();
    if (value) values[name] = value;
  }

  if (before === null) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", before);

  cache.set(theme, values);
  return values;
}
