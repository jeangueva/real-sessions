/**
 * Study material from the student's own thesis: a one-page defence sheet and
 * a deck of review cards.
 *
 * What a student actually revises from the night before: the thesis in a
 * page, and the questions a jury will ask with what to answer, on cards they
 * can flip on the bus. Written once per thesis version and kept with it.
 */
import { z } from "zod";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { labelledText, THESIS_MODEL, ThesisAnalysisError, type ThesisAnalysis } from "./thesis.js";

export const StudySchema = z.object({
  sheet: z.object({
    one_liner: z.string(),
    problem: z.string(),
    objective: z.string(),
    method: z.string(),
    key_results: z.array(z.string()),
    contribution: z.string(),
    limitations: z.array(z.string()),
    hard_questions: z.array(z.object({ question: z.string(), answer: z.string(), page: z.number().int().nullable() })),
  }),
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      page: z.number().int().nullable(),
      topic: z.enum(["contenido", "metodologia", "estadistica", "marco-teorico", "resultados", "conclusiones"]),
    }),
  ),
});

export type Study = z.infer<typeof StudySchema>;

const STUDY_TEMPLATE = `You prepare a student for their thesis defence from their own thesis. Every page is labelled "[p. N]". Write everything in {{language}}, in the student's own voice where it is an answer.

Never invent a result, a number or a source the thesis does not contain. Where an honest answer means admitting a limitation, admit it and say how it would be addressed.

RETURN:
- \`sheet\`: a one-page defence sheet. \`one_liner\`: the thesis in one sentence a non-specialist understands. \`problem\`, \`objective\`, \`method\` (design, sample, instruments, analysis — one sentence each). \`key_results\`: 3 to 5, each with its number. \`contribution\`: one sentence. \`limitations\`: 2 or 3, said honestly. \`hard_questions\`: the 5 questions a jury is most likely to press on, each with a 2–3 sentence answer the student can give, and the page it rests on.
- \`cards\`: 15 review cards. \`front\`: a question a juror could ask. \`back\`: the short answer, at most 40 words, from the thesis. \`page\` where the answer is. \`topic\` from the list. Cover every chapter, weighted toward methodology, statistics and conclusions.`;

export async function writeStudy(
  pages: readonly string[],
  analysis: ThesisAnalysis,
  options: { provider?: ModelProvider } = {},
): Promise<Study> {
  const provider = options.provider ?? resolveProvider(THESIS_MODEL);
  const language = analysis.language === "pt" ? "Brazilian Portuguese" : analysis.language === "en" ? "English" : "Spanish";
  const response = await provider.json({
    model: THESIS_MODEL,
    system: STUDY_TEMPLATE.replace("{{language}}", language),
    prompt: labelledText(pages, 250_000),
    maxTokens: 6_000,
    schema: StudySchema,
  });
  if (response.refused || !response.value) {
    throw new ThesisAnalysisError("No pudimos preparar tu material de repaso. Inténtalo de nuevo en un momento.");
  }
  const valid = (page: number | null) => (page !== null && page >= 1 && page <= pages.length ? page : null);
  const study = response.value;
  return {
    sheet: { ...study.sheet, hard_questions: study.sheet.hard_questions.map((q) => ({ ...q, page: valid(q.page) })) },
    cards: study.cards.map((card) => ({ ...card, page: valid(card.page) })),
  };
}
