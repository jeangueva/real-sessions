import { describe, expect, it } from "vitest";
import { labelledText, paginate } from "../src/thesis.js";

describe("paginate", () => {
  it("cuts running text into page-sized pieces at paragraph breaks", () => {
    const paragraph = "x".repeat(1_000);
    const pages = paginate(Array(9).fill(paragraph).join("\n"));
    expect(pages.length).toBe(4);
    expect(pages.every((page) => page.length <= 2_800 + 1_000)).toBe(true);
  });
});

describe("labelledText", () => {
  it("labels every page with its number", () => {
    expect(labelledText(["uno", "dos"])).toBe("[p. 1]\nuno\n\n[p. 2]\ndos");
  });

  it("trims every page to the same share instead of dropping the end", () => {
    const text = labelledText(["a".repeat(100), "b".repeat(100)], 100);
    expect(text).toContain("[p. 2]");
    expect(text).toContain("b".repeat(50) + " […]");
  });
});
