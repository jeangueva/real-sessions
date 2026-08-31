import { describe, expect, it } from "vitest";
import { takeSpeakablePhrases } from "../src/lib/voice";

describe("takeSpeakablePhrases", () => {
  it("emits complete sentences and keeps the remainder", () => {
    const { phrases, rest } = takeSpeakablePhrases(
      "Hi Mariana. Tell me about a project you led. What was the",
    );
    expect(phrases).toEqual([
      "Hi Mariana.",
      "Tell me about a project you led.",
    ]);
    expect(rest).toBe("What was the");
  });

  it("holds a sentence until its punctuation arrives", () => {
    // Speaking a half sentence is worse than waiting a beat for the rest.
    expect(takeSpeakablePhrases("Tell me about").phrases).toEqual([]);
    expect(takeSpeakablePhrases("Tell me about").rest).toBe("Tell me about");
  });

  it("does not split on a decimal point mid-sentence", () => {
    const { phrases, rest } = takeSpeakablePhrases("Drop-off fell to 22.5 percent overall");
    expect(phrases).toEqual([]);
    expect(rest).toContain("22.5");
  });

  it("handles question and exclamation marks", () => {
    const { phrases } = takeSpeakablePhrases("Really? That is good! Now ");
    expect(phrases).toEqual(["Really?", "That is good!"]);
  });

  it("returns nothing for empty input", () => {
    expect(takeSpeakablePhrases("")).toEqual({ phrases: [], rest: "" });
  });
});
