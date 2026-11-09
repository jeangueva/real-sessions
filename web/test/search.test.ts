import { describe, expect, it } from "vitest";
import { customPath, normalize, scoreItem, searchItems, type SearchItem } from "@/lib/search";

const item = (id: string, title: string, extra: Partial<SearchItem> = {}): SearchItem => ({
  id,
  kind: "scenario",
  title,
  subtitle: "",
  to: `/app/${id}`,
  ...extra,
});

const ITEMS: SearchItem[] = [
  item("thesis", "Ensayo de sustentación", { kind: "section" }),
  item("feedback", "Dar feedback difícil a un diseñador", { keywords: "jefe equipo" }),
  item("founder", "Decirle que no a un fundador"),
  item("analyst", "Data Analyst", { kind: "interview" }),
  item("stripe", "Stripe", { kind: "interview" }),
];

describe("home search", () => {
  it("ignores accents and case", () => {
    expect(normalize("Sustentación")).toBe("sustentacion");
    expect(searchItems(ITEMS, "SUSTENTACION")[0]?.id).toBe("thesis");
  });

  it("needs every word to match, in any order", () => {
    expect(searchItems(ITEMS, "feedback jefe").map((entry) => entry.id)).toEqual(["feedback"]);
    expect(searchItems(ITEMS, "feedback fundador")).toEqual([]);
  });

  it("ranks the start of a name above a match inside a word", () => {
    expect(searchItems(ITEMS, "st").map((entry) => entry.id)).toEqual(["stripe", "thesis", "analyst"]);
  });

  it("ranks a word in the title above the same word in the hidden keywords", () => {
    const withTitle = item("a", "Hablar con tu jefe");
    const withKeyword = item("b", "Pedir un aumento", { keywords: "jefe" });
    expect(scoreItem(withTitle, "jefe")).toBeGreaterThan(scoreItem(withKeyword, "jefe"));
  });

  it("matches nothing for an empty query", () => {
    expect(searchItems(ITEMS, "   ")).toEqual([]);
  });

  it("carries what was typed to the make-one-for-you screen", () => {
    expect(customPath("pedir un aumento")).toBe("/app/training/custom?q=pedir%20un%20aumento");
    expect(customPath("  ")).toBe("/app/training/custom");
  });
});
