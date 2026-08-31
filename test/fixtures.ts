import type { InterviewContext } from "../src/types.js";

export const context: InterviewContext = {
  candidateName: "Mariana",
  targetRole: "Senior Product Designer",
  companyName: "Stripe",
  companyCulture: "Craft, user obsession, high trust",
  industry: "Fintech",
  interviewStage: "Behavioral",
};

/** A schema-valid evaluation, for store and rendering tests. */
export const SAMPLE_EVALUATION = {
  overall_score_percentage: 62,
  strengths: ["Concrete metrics"],
  areas_for_improvement: ["Preposition errors"],
  vocabulary_feedback: {
    score_out_of_10: 7,
    good_usage: ["drop-off"],
    missed_opportunities_or_errors: ["depends of → depends on"],
  },
  structure_feedback: { score_out_of_10: 8, feedback_text: "Clear STAR shape." },
  actionable_next_steps: ["Rehearse two stories out loud."],
};
