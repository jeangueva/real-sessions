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
