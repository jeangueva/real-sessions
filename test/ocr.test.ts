import { describe, expect, it } from "vitest";
import { splitPages } from "../src/ocr.js";

describe("reading a scan", () => {
  it("puts each transcribed page back in its place, and leaves a missing one empty", () => {
    const reply = "=== PAGE 1 ===\nCapítulo I\n=== PAGE 3 ===\nResultados\n";
    expect(splitPages(reply, 3)).toEqual(["Capítulo I", "", "Resultados"]);
  });

  it("ignores page numbers it was not asked for", () => {
    expect(splitPages("=== PAGE 9 ===\nx", 2)).toEqual(["", ""]);
  });
});
