import type { CareerCatalogue, CareerResolution, DefenseFormatInfo, StoredThesis } from "@/lib/api";

const cited = { text: "Texto de prueba", page: 1 };
export const thesis: StoredThesis = {
  fileName: "tesis-prueba.pdf", pageCount: 16, approximate: false, uploadedAt: "2026-10-20",
  analysis: {
    title: "Recuperación de información de Placas Vehiculares en base al método Optical Character Recognition (OCR)",
    degree: "pregrado", field: "Ingeniería de Sistemas", language: "es", summary: "Prototipo de reconocimiento de placas.",
    ficha: { problem: cited, general_objective: cited, specific_objectives: [], hypotheses: [], variables: [], design: cited, population_sample: cited, instruments: cited, main_results: [], conclusions: [] },
    consistency: [], risks: [], chapters: [],
  },
};
const roles = (field: string) => ({
  presidente: { m: "Presidente del jurado", f: "Presidenta del jurado" },
  metodologo: { m: `Metodólogo en ${field}`, f: `Metodóloga en ${field}` },
  especialista: { m: `Especialista en ${field}`, f: `Especialista en ${field}` },
});
export const catalogue: CareerCatalogue = {
  families: [
    { id: "systems", name: "Ingeniería de Sistemas", roles: roles("sistemas") },
    { id: "law", name: "Derecho", roles: roles("derecho") },
  ], careers: [],
};
export const career: CareerResolution = { careerId: null, careerName: "Ingeniería de Sistemas", family: "systems", familyName: "Ingeniería", confidence: 1, source: "field" };
export const format: DefenseFormatInfo = {
  country: "PE", countryName: "Perú", language: "es", scale: { min: 0, max: 20, pass: 11, decimals: false },
  jurors: { presidente: { name: "Dr. Ramírez", role: "Presidente" }, metodologo: { name: "Dra. Vidal", role: "Metodóloga" }, especialista: { name: "Dr. Paredes", role: "Especialista" } },
};
export const response = { thesis, career, formats: [format], allowance: { credits: null, freeLeft: 1, unlimited: true, modes: true, paid: true }, progress: [], offers: [] };
