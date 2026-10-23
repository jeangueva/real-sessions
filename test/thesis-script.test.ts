import { describe, expect, it } from "vitest";
import type { ModelProvider } from "../src/providers/index.js";
import { writeThesisScript } from "../src/slides.js";
import type { ThesisAnalysis } from "../src/thesis.js";

const fact = (text: string, page: number | null = null) => ({ text, page });

// Only the fields the script reads.
const thesis = {
  title: "Estrés laboral y desempeño docente",
  language: "es",
  ficha: {
    problem: fact("¿Cómo se relaciona el estrés con el desempeño?"),
    general_objective: fact("Determinar la relación"),
    specific_objectives: [fact("Medir el estrés", 12)],
    hypotheses: [fact("Existe relación inversa")],
    design: fact("Correlacional"),
    population_sample: fact("120 docentes", 40),
    instruments: fact("Cuestionario"),
    main_results: [fact("Rho = -0,62", 55)],
    conclusions: [fact("Relación inversa moderada", 70)],
  },
} as unknown as ThesisAnalysis;

function stub(value: unknown): { provider: ModelProvider; prompts: { system: string; prompt: string }[] } {
  const prompts: { system: string; prompt: string }[] = [];
  const provider = {
    name: "stub",
    chat: async () => {
      throw new Error("not used");
    },
    json: async (request: { system: string; prompt: string }) => {
      prompts.push(request);
      return { value, refused: false };
    },
  } as unknown as ModelProvider;
  return { provider, prompts };
}

describe("writeThesisScript", () => {
  it("returns the script in the shape of a deck review, one slide per block", async () => {
    const { provider, prompts } = stub({
      summary: "Más tiempo a los resultados.",
      total_seconds: 9999,
      blocks: [
        { title: "Saludo", seconds: 60, say: "Buenos días, señores del jurado.", pages: [] },
        { title: "Resultados", seconds: 300, say: "Encontramos una relación inversa.", points: ["Rho = -0,62"], pages: [55] },
      ],
    });
    const review = await writeThesisScript(thesis, 20 * 60, { provider });

    // Summed rather than trusted.
    expect(review.total_seconds).toBe(360);
    expect(review.slides.map((slide) => slide.n)).toEqual([1, 2]);
    expect(review.slides[1]).toMatchObject({ title: "Resultados", verdict: "ok", note: "p. 55", points: ["Rho = -0,62"] });
    expect(review.script).toEqual([
      { slide: 1, say: "Buenos días, señores del jurado." },
      { slide: 2, say: "Encontramos una relación inversa." },
    ]);
    expect(review.inconsistencies).toEqual([]);

    expect(prompts[0]!.system).toContain("20 minutes");
    expect(prompts[0]!.system).toContain("Spanish");
    expect(prompts[0]!.prompt).toContain("120 docentes (p. 40)");
  });

  it("says so when the model refuses", async () => {
    const provider = {
      name: "stub",
      chat: async () => {
        throw new Error("not used");
      },
      json: async () => ({ value: null, refused: true }),
    } as unknown as ModelProvider;
    await expect(writeThesisScript(thesis, 1200, { provider })).rejects.toThrow(/guion/);
  });
});
