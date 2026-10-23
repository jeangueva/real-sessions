import { describe, expect, it } from "vitest";
import type { ModelProvider } from "../src/providers/index.js";
import { writeDemoDefense } from "../src/demo-defense.js";
import type { ThesisAnalysis } from "../src/thesis.js";

const fact = (text: string, page: number | null = null) => ({ text, page });
const thesis = {
  title: "Estrés laboral y desempeño docente",
  language: "es",
  ficha: {
    problem: fact("¿Cómo se relaciona el estrés con el desempeño?"),
    general_objective: fact("Determinar la relación"),
    specific_objectives: [],
    hypotheses: [],
    design: fact("Correlacional"),
    population_sample: fact("120 docentes", 40),
    instruments: fact("Cuestionario"),
    main_results: [fact("Rho = -0,62", 55)],
    conclusions: [],
  },
} as unknown as ThesisAnalysis;

const provider = (value: unknown) =>
  ({
    name: "stub",
    chat: async () => {
      throw new Error("not used");
    },
    json: async () => ({ value, refused: value === null }),
  }) as unknown as ModelProvider;

describe("writeDemoDefense", () => {
  it("keeps the transcript in order and drops empty lines", async () => {
    const demo = await writeDemoDefense(thesis, {
      provider: provider({
        lines: [
          { speaker: "presidente", text: "Tiene la palabra.", weak: false, lesson: "" },
          { speaker: "estudiante", text: "  ", weak: false, lesson: "" },
          { speaker: "estudiante", text: "Mi tesis estudia…", weak: false, lesson: "" },
          { speaker: "metodologo", text: "¿Por qué 120?", weak: false, lesson: "" },
          { speaker: "estudiante", text: "Porque sí.", weak: true, lesson: "Una respuesta sin datos no convence." },
        ],
      }),
    });
    expect(demo.lines.map((line) => line.speaker)).toEqual(["presidente", "estudiante", "metodologo", "estudiante"]);
    expect(demo.lines[3]).toMatchObject({ weak: true });
  });

  it("says so when the model refuses", async () => {
    await expect(writeDemoDefense(thesis, { provider: provider(null) })).rejects.toThrow(/sustentación modelo/);
  });
});
