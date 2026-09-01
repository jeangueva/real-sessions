import { z } from "zod";

/**
 * Phase 2 output contract. This schema is the single source of truth: it is
 * handed to the API as a structured-output format (so the model cannot emit
 * prose or markdown fences around the JSON) and reused to validate anything
 * read back out of the database.
 */
export const VocabularyFeedbackSchema = z.object({
  score_out_of_10: z.number().min(0).max(10),
  good_usage: z.array(z.string()),
  missed_opportunities_or_errors: z.array(z.string()),
});

export const StructureFeedbackSchema = z.object({
  score_out_of_10: z.number().min(0).max(10),
  feedback_text: z.string(),
});

export const EvaluationSchema = z.object({
  overall_score_percentage: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1),
  areas_for_improvement: z.array(z.string()).min(1),
  vocabulary_feedback: VocabularyFeedbackSchema,
  structure_feedback: StructureFeedbackSchema,
  actionable_next_steps: z.array(z.string()).min(1),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;
export type VocabularyFeedback = z.infer<typeof VocabularyFeedbackSchema>;
export type StructureFeedback = z.infer<typeof StructureFeedbackSchema>;

/**
 * Live coaching output — the sidebar shown beside the transcript during a
 * practice session.
 *
 * Deliberately tiny. This runs on every candidate turn, so it has to be cheap,
 * and a reader mid-interview can act on one or two notes, not a report. The
 * cap of three is enforced here rather than asked for in the prompt, because a
 * model that ignores the instruction would otherwise fill the sidebar.
 */
export const CoachTipSchema = z.object({
  /**
   * No "filler" category: disfluency is counted deterministically in
   * metrics.ts, for free and without variance. Asking a model to do it too
   * would produce a second, disagreeing number on the same screen.
   */
  kind: z.enum(["structure", "specificity", "vocabulary", "grammar"]),
  /** One sentence, second person, actionable in the next answer. */
  note: z.string().min(1).max(200),
});

export const CoachFeedbackSchema = z.object({
  tips: z.array(CoachTipSchema).max(3),
});

export type CoachTip = z.infer<typeof CoachTipSchema>;
export type CoachFeedback = z.infer<typeof CoachFeedbackSchema>;
