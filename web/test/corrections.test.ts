import { describe, expect, it } from "vitest";
import { parseCorrection } from "../src/lib/corrections";

describe("parseCorrection", () => {
  it("splits the evaluator's arrow into what was said and the natural version", () => {
    expect(parseCorrection("“depends of the team” → “depends on the team”")).toEqual({
      kind: "pair",
      said: "depends of the team",
      natural: "depends on the team",
    });
  });

  it("accepts an ASCII arrow and straight quotes", () => {
    expect(parseCorrection('"explain me" -> "explain to me"')).toEqual({
      kind: "pair",
      said: "explain me",
      natural: "explain to me",
    });
  });

  it("leaves a note without an arrow as a note", () => {
    expect(parseCorrection("Could have used “stakeholder” instead of “people”.")).toEqual({
      kind: "note",
      text: "Could have used “stakeholder” instead of “people”.",
    });
  });

  it("reads the older \"(should be …)\" shape from stored reports", () => {
    expect(parseCorrection("assist to meetings (should be attend or participate in)")).toEqual({
      kind: "pair",
      said: "assist to meetings",
      natural: "attend or participate in",
    });
    expect(parseCorrection("depends of (should be depends on or is based on)")).toEqual({
      kind: "pair",
      said: "depends of",
      natural: "depends on or is based on",
    });
  });

  it("leaves an ordinary parenthesis alone", () => {
    expect(parseCorrection("Used “leverage” (a little stiff) where “use” fits").kind).toBe("note");
  });

  it("does not guess when there is more than one arrow", () => {
    expect(parseCorrection("a → b → c").kind).toBe("note");
  });
});
