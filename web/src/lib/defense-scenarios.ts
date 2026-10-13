/**
 * Which defence, by degree — the client's copy of the server's table in
 * src/prompts/defense.ts, for the labels and the exposition clock. The server
 * decides the panel; these numbers only describe it.
 */
import type { ThesisKey } from "./thesis-copy";

export type DefenseScenario = "proyecto" | "bachiller" | "titulo" | "suficiencia" | "maestria" | "doctorado";

export const SCENARIO_OPTIONS: Record<
  DefenseScenario,
  { label: ThesisKey; hint: ThesisKey; exposition: number; questions: number }
> = {
  proyecto: { label: "scenProyecto", hint: "scenProyectoHint", exposition: 10, questions: 9 },
  bachiller: { label: "scenBachiller", hint: "scenBachillerHint", exposition: 10, questions: 10 },
  titulo: { label: "scenTitulo", hint: "scenTituloHint", exposition: 15, questions: 12 },
  suficiencia: { label: "scenSuficiencia", hint: "scenSuficienciaHint", exposition: 15, questions: 10 },
  maestria: { label: "scenMaestria", hint: "scenMaestriaHint", exposition: 20, questions: 14 },
  doctorado: { label: "scenDoctorado", hint: "scenDoctoradoHint", exposition: 30, questions: 16 },
};

/** The starting choice, from what the diagnosis read on the cover. */
export function scenarioForDegree(degree: string | null | undefined): DefenseScenario {
  return degree === "maestria" ? "maestria" : degree === "doctorado" ? "doctorado" : "titulo";
}
