/**
 * The Markdown of the system: the frontmatter the guides carry and the body
 * marked renders.
 *
 * The guides are written by hand and read by a person, so they stay
 * Markdown. The site reads them the way a person would: the frontmatter is
 * the title and the group, and the body is the text.
 */
import { marked } from "marked";

export interface Frontmatter {
  title: string;
  group: string;
  order: number;
  summary: string;
  body: string;
}

/** The frontmatter between the first two `---` lines, and the body under it. */
export function parseMarkdown(source: string): Frontmatter {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
  if (!match) {
    return { title: "", group: "", order: 0, summary: "", body: source };
  }
  const head = match[1] ?? "";
  const body = match[2] ?? "";
  const fields: Record<string, string> = {};
  for (const line of head.split("\n")) {
    const pair = /^([a-zA-Z]+):\s*(.*)$/.exec(line.trim());
    if (pair) fields[pair[1]!] = pair[2]!.trim();
  }
  return {
    title: fields.title ?? "",
    group: fields.group ?? "",
    order: Number(fields.order ?? 0),
    summary: fields.summary ?? "",
    body: body.trim(),
  };
}

/** The Markdown as HTML. The system's own text, so it is trusted. */
export function renderMarkdown(body: string): string {
  const html = marked.parse(body, { async: false, gfm: true, breaks: false }) as string;
  // A table is the way a contract is read, so it is never allowed to break
  // the page: it scrolls inside its own frame instead.
  return html.replace(/<table>[\s\S]*?<\/table>/g, (table) => `<div class="table-scroll">${table}</div>`);
}

/** The file name as a slug: `contributing.md` → `contributing`. */
export function slugOf(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

/**
 * The body's own first heading, when it repeats the title the page already
 * shows. A document that opens with its own title should not say it twice.
 */
export function withoutLeadingTitle(body: string, title: string): string {
  const lines = body.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (!first.startsWith("# ")) return body;
  if (first.slice(2).trim().toLowerCase() !== title.toLowerCase()) return body;
  return lines.slice(1).join("\n").trim();
}
