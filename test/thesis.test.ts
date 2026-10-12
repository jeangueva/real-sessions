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

describe("the countdown to a defence", () => {
  it("writes each day in the thesis's language, with the jury's first questions", async () => {
    const { defenseCountdownEmail } = await import("../src/email.js");
    const mail = defenseCountdownEmail("ana@example.test", {
      day: 5,
      language: "es",
      risks: ["¿Por qué 30 casos?", "¿Verificó la normalidad?"],
      url: "https://x/app/thesis",
      unsubscribeUrl: "https://x/u",
    });
    expect(mail.subject).toBe("Faltan 5 días: tus 3 puntos débiles");
    expect(mail.text).toContain("¿Por qué 30 casos?");
    expect(defenseCountdownEmail("a@b.test", { day: 0, language: "pt", risks: [], url: "u", unsubscribeUrl: "u" }).subject).toContain("Hoje");
  });

  it("finds theses defended within the week and remembers what was sent", async () => {
    const { createThesisStore } = await import("../src/thesis.js");
    const store = createThesisStore(null);
    const analysis = {
      title: "T", degree: "pregrado", field: "F", language: "es", summary: "S",
      ficha: { problem: { text: "p", page: 1 }, general_objective: { text: "o", page: 1 }, specific_objectives: [], hypotheses: [], variables: [], design: { text: "d", page: null }, population_sample: { text: "m", page: null }, instruments: { text: "i", page: null }, main_results: [], conclusions: [] },
      consistency: [],
      risks: [
        { area: "forma", severity: "baja", issue: "x", page: null, likely_question: "baja?" },
        { area: "muestra", severity: "alta", issue: "y", page: 4, likely_question: "alta?" },
      ],
      chapters: [],
    } as const;
    await store.put("ana", "t.pdf", { pages: ["x"], approximate: false }, analysis as never);
    await store.setDefenseDate("ana", "2026-10-20");
    const [row] = await store.countdownCandidates("2026-10-13", "2026-10-20");
    expect(row?.risks[0]).toBe("alta?");
    await store.markCountdown("ana", 7);
    expect((await store.countdownCandidates("2026-10-13", "2026-10-20"))[0]?.sent).toEqual([7]);
    await store.setDefenseDate("ana", "2026-10-21");
    expect((await store.countdownCandidates("2026-10-13", "2026-10-21"))[0]?.sent).toEqual([]);
  });
});
