import { describe, expect, it } from "vitest";
import { labelledText, paginate } from "../src/thesis.js";

describe("paginate", () => {
  it("cuts running text into page-sized pieces at paragraph breaks", () => {
    const paragraph = "x".repeat(1_000);
    const pages = paginate(Array(9).fill(paragraph).join("\n"));
    // Two 1,000-character paragraphs fit under the 2,800 cap; a third does not.
    expect(pages.length).toBe(5);
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

describe("the thesis panel", () => {
  it("runs a defence alone, whatever else was asked for", async () => {
    const { resolveStages } = await import("../src/stages.js");
    expect(resolveStages("Backend Engineer", ["behavioral", "sustentacion-pe"]).map((s) => s.id)).toEqual([
      "sustentacion-pe",
    ]);
  });

  it("gives the express rehearsal a single juror", async () => {
    const { buildInterviewerPrompt } = await import("../src/prompts/interviewer.js");
    const ctx = {
      candidateName: "Ana",
      targetRole: "Administración",
      companyName: "U",
      companyCulture: "",
      industry: "",
      interviewStage: "sustentacion-express",
    };
    const defense = { dossier: "Title: X", difficulty: "estandar" as const, university: "Universidad X", field: "F" };
    const express = buildInterviewerPrompt(ctx, { stages: ["sustentacion-express"], defense, minTurns: 5, maxTurns: 5 });
    expect(express).toContain("Universidad X");
    expect(express).not.toContain("[[metodologo]] Dra.");
    const full = buildInterviewerPrompt(ctx, { stages: ["sustentacion-pe"], defense, minTurns: 9, maxTurns: 12 });
    expect(full).toContain("[[metodologo]] Dra. Lucía Vidal");
  });
});
