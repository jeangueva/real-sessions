/**
 * The slides a student will present, read against their own thesis.
 *
 * What a jury notices in the first minute: a slide that says something the
 * thesis does not, a wall of text read aloud, an exposition planned for forty
 * minutes in a twenty-minute slot. Each slide is one PDF page — PowerPoint,
 * Google Slides and Canva all export that way, and it spares parsing three
 * proprietary formats for the same text.
 */
import { z } from "zod";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { ExtractionError } from "./extract.js";
import { extractPages, THESIS_MODEL, type ThesisAnalysis } from "./thesis.js";
import { SCRIPT_TEMPLATE, SLIDES_TEMPLATE } from "./prompts/slides.js";

export const MAX_SLIDES = 60;
/** The default exposition slot in Peru, in seconds. */
export const DEFAULT_SLOT_SECONDS = 20 * 60;

export const SlideReviewSchema = z.object({
  summary: z.string(),
  total_seconds: z.number().int().min(0),
  slides: z.array(
    z.object({
      n: z.number().int().min(1),
      title: z.string(),
      seconds: z.number().int().min(0),
      verdict: z.enum(["ok", "recargada", "incoherente", "sobra"]),
      note: z.string(),
    }),
  ),
  inconsistencies: z.array(
    z.object({ slide: z.number().int().min(1), thesis_page: z.number().int().nullable(), issue: z.string() }),
  ),
  script: z.array(z.object({ slide: z.number().int().min(1), say: z.string() })),
});

export type SlideReview = z.infer<typeof SlideReviewSchema>;

export interface StoredSlides {
  /**
   * "deck" when the student uploaded slides; "thesis" when there were none and
   * the script was written from the thesis alone. Absent on older rows, which
   * are all decks.
   */
  source?: "deck" | "thesis";
  fileName: string;
  slideCount: number;
  words: number[];
  slotSeconds: number;
  review: SlideReview;
  reviewedAt: string;
}

export async function readSlides(buffer: Buffer): Promise<string[]> {
  const { pages } = await extractPages(buffer, "pdf", 80).catch((error: unknown) => {
    if (error instanceof ExtractionError) {
      throw new ExtractionError(
        "No encontramos texto en esas diapositivas. Expórtalas a PDF desde PowerPoint, Google Slides o Canva y súbelas de nuevo.",
      );
    }
    throw error;
  });
  if (pages.length > MAX_SLIDES) {
    throw new ExtractionError(`Son ${pages.length} diapositivas; revisamos hasta ${MAX_SLIDES}. Una sustentación rara vez necesita más.`);
  }
  return pages;
}

const THESIS_SCRIPT_SCHEMA = z.object({
  summary: z.string(),
  total_seconds: z.number().int().min(0),
  blocks: z
    .array(
      z.object({
        title: z.string(),
        seconds: z.number().int().min(0),
        say: z.string(),
        pages: z.array(z.number().int().min(1)).default([]),
      }),
    )
    .min(1),
});

function languageName(thesis: ThesisAnalysis): string {
  return thesis.language === "pt" ? "Brazilian Portuguese" : thesis.language === "en" ? "English" : "Spanish";
}

function thesisNotesFor(thesis: ThesisAnalysis): string {
  return [
    `Title: ${thesis.title}`,
    `Problem: ${thesis.ficha.problem.text}`,
    `General objective: ${thesis.ficha.general_objective.text}`,
    ...thesis.ficha.specific_objectives.map((entry) => `Specific objective: ${entry.text}${entry.page ? ` (p. ${entry.page})` : ""}`),
    ...thesis.ficha.hypotheses.map((entry) => `Hypothesis: ${entry.text}`),
    `Design: ${thesis.ficha.design.text}`,
    `Population and sample: ${thesis.ficha.population_sample.text}${thesis.ficha.population_sample.page ? ` (p. ${thesis.ficha.population_sample.page})` : ""}`,
    `Instruments: ${thesis.ficha.instruments.text}`,
    ...thesis.ficha.main_results.map((entry) => `Result: ${entry.text}${entry.page ? ` (p. ${entry.page})` : ""}`),
    ...thesis.ficha.conclusions.map((entry) => `Conclusion: ${entry.text}${entry.page ? ` (p. ${entry.page})` : ""}`),
  ].join("\n");
}

/**
 * The exposition, written from the thesis for a student who has no deck yet.
 *
 * Returned in the shape of a deck review — one block per future slide, with
 * what to say on it — so everything that already reads a review (this screen,
 * the slide stepper inside a rehearsal call) works on it unchanged. Its
 * blocks are also the outline of the deck the student is about to make.
 */
export async function writeThesisScript(
  thesis: ThesisAnalysis,
  slotSeconds: number,
  options: { provider?: ModelProvider } = {},
): Promise<SlideReview> {
  const provider = options.provider ?? resolveProvider(THESIS_MODEL);
  const response = await provider.json({
    model: THESIS_MODEL,
    system: SCRIPT_TEMPLATE.replace("{{slot_minutes}}", String(Math.round(slotSeconds / 60))).replace(
      "{{language}}",
      languageName(thesis),
    ),
    prompt: `THE THESIS:\n${thesisNotesFor(thesis)}`,
    maxTokens: 6_000,
    schema: THESIS_SCRIPT_SCHEMA,
  });
  if (response.refused || !response.value) {
    throw new ExtractionError("No pudimos escribir tu guion. Inténtalo de nuevo en un momento.");
  }
  const { summary, blocks } = response.value;
  return {
    summary,
    // Summed here rather than trusted: the bar on screen compares it with the slot.
    total_seconds: blocks.reduce((sum, block) => sum + block.seconds, 0),
    slides: blocks.map((block, index) => ({
      n: index + 1,
      title: block.title,
      seconds: block.seconds,
      verdict: "ok" as const,
      note: block.pages.length > 0 ? `p. ${block.pages.join(", ")}` : "",
    })),
    inconsistencies: [],
    script: blocks.map((block, index) => ({ slide: index + 1, say: block.say })),
  };
}

export async function reviewSlides(
  slides: readonly string[],
  thesis: ThesisAnalysis,
  slotSeconds: number,
  options: { provider?: ModelProvider } = {},
): Promise<SlideReview> {
  const provider = options.provider ?? resolveProvider(THESIS_MODEL);
  const thesisNotes = thesisNotesFor(thesis);
  const deck = slides.map((text, index) => `[slide ${index + 1}]\n${text || "(no text — image only)"}`).join("\n\n");
  const response = await provider.json({
    model: THESIS_MODEL,
    system: SLIDES_TEMPLATE.replace("{{slot_minutes}}", String(Math.round(slotSeconds / 60))).replace(
      "{{language}}",
      languageName(thesis),
    ),
    prompt: `THE THESIS:\n${thesisNotes}\n\nTHE SLIDES:\n${deck}`,
    maxTokens: 6_000,
    schema: SlideReviewSchema,
  });
  if (response.refused || !response.value) {
    throw new ExtractionError("No pudimos revisar tus diapositivas. Inténtalo de nuevo en un momento.");
  }
  const review = response.value;
  // Slides the deck does not have are dropped rather than shown.
  const valid = (n: number) => n >= 1 && n <= slides.length;
  return {
    ...review,
    slides: review.slides.filter((slide) => valid(slide.n)),
    inconsistencies: review.inconsistencies.filter((entry) => valid(entry.slide)),
    script: review.script.filter((entry) => valid(entry.slide)),
  };
}

export function wordCounts(slides: readonly string[]): number[] {
  return slides.map((text) => (text.trim() === "" ? 0 : text.trim().split(/\s+/).length));
}
