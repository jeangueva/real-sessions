/**
 * A model defence of the student's own thesis, to listen to before their
 * first rehearsal.
 *
 * Almost nobody has watched a defence before giving one. This is one, of
 * their thesis, with the panel they will face: a short exposition, the
 * jury's questions, and answers worth copying the shape of — plus one weak
 * answer on purpose, with the juror saying why it fails, because hearing what
 * not to do teaches as much as a good example. It is a reference, not a
 * script to memorise: the screen says so and the rehearsal comes after it.
 */
import { z } from "zod";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { ExtractionError } from "./extract.js";
import { THESIS_MODEL, type ThesisAnalysis } from "./thesis.js";
import { languageName, thesisNotesFor } from "./slides.js";

export const DEMO_SPEAKERS = ["estudiante", "presidente", "metodologo", "especialista"] as const;

export const DemoDefenseSchema = z.object({
  lines: z
    .array(
      z.object({
        speaker: z.enum(DEMO_SPEAKERS),
        text: z.string(),
        /** The deliberately weak answer, and the juror's reply that names why. */
        weak: z.boolean().default(false),
        /** One sentence for the screen: what this moment teaches. */
        lesson: z.string().default(""),
      }),
    )
    .min(4),
});

export type DemoDefense = z.infer<typeof DemoDefenseSchema>;

export interface StoredDemo {
  demo: DemoDefense;
  writtenAt: string;
}

const DEMO_TEMPLATE = `You write a model thesis defence, as a transcript, for the student whose thesis is below to listen to before their own. Write every text in {{language}}.

The speakers: "estudiante" (the student defending), and the three jurors: "presidente" (chairs, opens and closes), "metodologo" (design, sample, instruments, statistics), "especialista" (the field, the literature, what the results mean).

THE SHAPE, about five minutes spoken in all:
1. The presidente opens in one or two sentences and gives the student the floor.
2. The student's exposition, condensed to about two minutes: problem, objective, method, the main results with their numbers, conclusions. Several lines of a few sentences each, never one long block.
3. Four or five questions, from all three jurors, each answered by the student. The questions press where this thesis is weakest. A good answer is direct, admits a limitation when there is one, cites the thesis's own data and does not get defensive.
4. Exactly one answer is weak on purpose — vague, defensive, or claiming more than the results show — with \`weak\` true; the juror's next line says plainly why it does not convince, and the student then answers well.
5. The presidente closes.

\`lesson\`: one short sentence on the lines worth learning from (each good answer, the weak one, the juror's reply to it); empty elsewhere.

Every fact is the thesis's own. Never invent a result. Each line at most 80 words. Never assume anyone's gender: no gendered adjectives or forms of address for the student ("quedo a su disposición", not "quedo atenta").`;

export async function writeDemoDefense(
  thesis: ThesisAnalysis,
  options: { provider?: ModelProvider } = {},
): Promise<DemoDefense> {
  const provider = options.provider ?? resolveProvider(THESIS_MODEL);
  const response = await provider.json({
    model: THESIS_MODEL,
    system: DEMO_TEMPLATE.replace("{{language}}", languageName(thesis)),
    prompt: `THE THESIS:\n${thesisNotesFor(thesis)}`,
    maxTokens: 6_000,
    schema: DemoDefenseSchema,
  });
  if (response.refused || !response.value) {
    throw new ExtractionError("No pudimos preparar la sustentación modelo. Inténtalo de nuevo en un momento.");
  }
  // Empty lines would be silent gaps in the playback.
  return { lines: response.value.lines.filter((line) => line.text.trim() !== "") };
}
