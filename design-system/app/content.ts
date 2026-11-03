/**
 * What the site reads: the components from the catalogue, and the Markdown
 * a person wrote.
 *
 * Nothing here is registered by hand. A component that lands in
 * `src/components` appears in the catalogue; a guide that lands in `docs/`
 * appears in the navigation. The site cannot fall behind the system because
 * there is no list to forget to update.
 */
import { catalog } from "@ds/catalog";
import { parseMarkdown, slugOf, type Frontmatter } from "./markdown";

export interface Doc extends Frontmatter {
  /** The piece of the URL: `contributing` for `docs/guides/contributing.md`. */
  slug: string;
  /** Where it came from, shown on the page so a reader can find the file. */
  path: string;
}

const guideSources = import.meta.glob<string>("../docs/guides/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

const foundationSources = import.meta.glob<string>("../docs/foundations/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

/** "separate-repo" → "Separate repo", for a document without a frontmatter. */
function humanize(slug: string): string {
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function collect(sources: Record<string, string>): Doc[] {
  return Object.entries(sources)
    .map(([path, source]) => {
      const front = parseMarkdown(source);
      const slug = slugOf(path);
      return {
        ...front,
        title: front.title || humanize(slug),
        group: front.group || "Guides",
        order: front.order || 99,
        slug,
        path: path.replace(/^\.\.\//, ""),
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

/** The four bases of the system: colour, type, motion, voice. */
export const foundations: Doc[] = collect(foundationSources);

/** The guides: how the system is used, built and shipped. */
export const guides: Doc[] = collect(guideSources);

/** Every component, from the folder layout. */
export const components = catalog;

/** The component with that name, or undefined. */
export function componentByName(name: string) {
  return components.find((entry) => entry.name === name);
}

/** The document with that slug, from either group. */
export function docBySlug(slug: string): { doc: Doc; group: "Foundations" | "Guides" } | undefined {
  const foundation = foundations.find((doc) => doc.slug === slug);
  if (foundation) return { doc: foundation, group: "Foundations" };
  const guide = guides.find((doc) => doc.slug === slug);
  if (guide) return { doc: guide, group: "Guides" };
  return undefined;
}
