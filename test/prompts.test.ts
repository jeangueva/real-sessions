import { describe, expect, it } from "vitest";
import {
  buildEvaluatorPrompt,
  formatTranscript,
} from "../src/prompts/evaluator.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { renderTemplate } from "../src/prompts/template.js";
import { context } from "./fixtures.js";

describe("renderTemplate", () => {
  it("substitutes every placeholder", () => {
    expect(renderTemplate("Hi {{name}} at {{co}}", { name: "A", co: "B" })).toBe(
      "Hi A at B",
    );
  });

  it("throws on a missing variable instead of leaking the placeholder", () => {
    expect(() => renderTemplate("Hi {{name}}", {})).toThrow(/name/);
  });

  it("throws on an empty variable", () => {
    expect(() => renderTemplate("Hi {{name}}", { name: "   " })).toThrow(/name/);
  });
});

describe("buildInterviewerPrompt", () => {
  const prompt = buildInterviewerPrompt(context);

  it("leaves no unresolved placeholders", () => {
    expect(prompt).not.toMatch(/\{\{|\}\}/);
  });

  it("injects the full context", () => {
    for (const value of Object.values(context)) {
      expect(prompt).toContain(value);
    }
  });

  it("keeps the completion flag contract", () => {
    expect(prompt).toContain("[INTERVIEW_COMPLETE]");
  });

  it("reflects custom turn bounds", () => {
    expect(buildInterviewerPrompt(context, { minTurns: 3, maxTurns: 4 })).toContain(
      "INTERVIEW STRUCTURE (3-4 Turns)",
    );
  });

  it("rejects inverted turn bounds", () => {
    expect(() =>
      buildInterviewerPrompt(context, { minTurns: 6, maxTurns: 2 }),
    ).toThrow(/turn bounds/);
  });

  it("is byte-stable across calls so the cached prefix holds", () => {
    expect(buildInterviewerPrompt(context)).toBe(prompt);
  });
});

describe("buildEvaluatorPrompt", () => {
  it("resolves every placeholder", () => {
    const prompt = buildEvaluatorPrompt(context);
    expect(prompt).not.toMatch(/\{\{|\}\}/);
    expect(prompt).toContain(context.companyCulture);
  });
});

describe("formatTranscript", () => {
  it("labels speakers with the candidate's real name", () => {
    const out = formatTranscript(
      [
        { speaker: "interviewer", text: "Tell me about a project." },
        { speaker: "candidate", text: "I led a redesign." },
      ],
      context,
    );
    expect(out).toContain("INTERVIEWER: Tell me about a project.");
    expect(out).toContain("Mariana: I led a redesign.");
  });

  it("refuses an empty transcript", () => {
    expect(() => formatTranscript([], context)).toThrow(/empty transcript/);
  });
});
