/**
 * The search on the home screen: one field that finds anything in the app.
 *
 * Everything searchable is a `SearchItem`: a screen, a rehearsal from the
 * catalogue, a product case, a company or role to interview for. The index is
 * small — dozens of items, not thousands — so it is searched in the browser on
 * every keystroke, with no request and no debounce.
 *
 * Matching forgives what people actually type on a phone: no accents
 * ("sustentacion" finds "Sustentación"), any word order ("jefe feedback"
 * finds "Dar feedback difícil a tu jefe"), and the start of a word counts more
 * than its middle. Every word typed has to match somewhere, so adding a word
 * narrows the list instead of widening it.
 */

export type SearchKind = "section" | "scenario" | "case" | "interview";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  /** One line under the title: what it is, or where it lives. */
  subtitle: string;
  /** Extra words it should be found by that are not shown. */
  keywords?: string;
  /** Where choosing it goes. */
  to: string;
  /** Router state for the destination, such as the company to interview for. */
  state?: Record<string, string>;
  /** The workspace it belongs to; absent for screens both share. */
  space?: "defense" | "career";
}

/** Lowercase, without accents, so "Diagnóstico" and "diagnostico" are one word. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * How well one typed word matches one field. Three tiers so the first
 * suggestion never feels random: the whole field, the start of a word, then
 * anywhere.
 */
function wordScore(field: string, word: string): number {
  if (field === word) return 100;
  if (field.startsWith(word)) return 80;
  if (field.includes(` ${word}`) || field.includes(`-${word}`)) return 60;
  return field.includes(word) ? 25 : 0;
}

/**
 * The score of an item for a query; 0 means it does not match.
 *
 * Each word is scored against the title first, then the subtitle and keywords
 * at a discount: a word in the name of a thing is a better signal than one in
 * its description.
 */
export function scoreItem(item: SearchItem, query: string): number {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const title = normalize(item.title);
  const rest = normalize(`${item.subtitle} ${item.keywords ?? ""}`);
  let total = 0;
  for (const word of words) {
    // The description is one run of words, so "the whole field" and "its
    // start" mean nothing there: it counts as a word match at most.
    const best = Math.max(wordScore(title, word), Math.min(wordScore(rest, word), 60) * 0.6);
    if (best === 0) return 0;
    total += best;
  }
  // Screens first on a tie: "progreso" should open the screen before it
  // offers a rehearsal that mentions progress.
  return total + (item.kind === "section" ? 5 : 0);
}

/** The best matches for a query, at most `limit`, best first. */
export function searchItems(items: SearchItem[], query: string, limit = 7): SearchItem[] {
  return items
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item);
}

/**
 * Where the "make one for you" option goes with what was typed. The workspace
 * it was asked from decides whether the rehearsal is academic or professional.
 */
export function customPath(query: string, space?: "defense" | "career"): string {
  const params = new URLSearchParams();
  const text = query.trim();
  if (text) params.set("q", text);
  if (space) params.set("domain", space === "defense" ? "education" : "professional");
  const search = params.toString().replace(/\+/g, "%20");
  return search ? `/app/training/custom?${search}` : "/app/training/custom";
}
