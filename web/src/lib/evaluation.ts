/**
 * Mirrors `EvaluationSchema` in the backend package (`../../src/schema.ts`),
 * which is the source of truth. It is restated here rather than imported
 * because the web app has its own tsconfig and does not depend on zod.
 *
 * If the backend schema changes, change this too — the dashboard reads these
 * fields directly and a silent drift shows up as blank panels.
 */
export interface Evaluation {
  overall_score_percentage: number;
  strengths: string[];
  areas_for_improvement: string[];
  vocabulary_feedback: {
    score_out_of_10: number;
    good_usage: string[];
    missed_opportunities_or_errors: string[];
  };
  structure_feedback: {
    score_out_of_10: number;
    feedback_text: string;
  };
  actionable_next_steps: string[];
}

export interface SessionSummary {
  id: string;
  company: string;
  role: string;
  stage: string;
  date: string;
  score: number;
}

/** Stand-in until the API is wired. Shaped exactly like a real response. */
export const SAMPLE_EVALUATION: Evaluation = {
  overall_score_percentage: 62,
  strengths: [
    "You opened with concrete numbers — drop-off from 40% to 22% — instead of describing the project in the abstract.",
    "Your answers hold a STAR shape without being asked: situation, your action, then the result.",
  ],
  areas_for_improvement: [
    "You shifted to collaboration when asked about measurement. Answer the question that was asked before widening the story.",
    "Preposition errors recur under pressure: “depends of”, “assisted to the meeting”.",
  ],
  vocabulary_feedback: {
    score_out_of_10: 7,
    good_usage: ["drop-off", "funnel analysis", "cohort", "design system"],
    missed_opportunities_or_errors: [
      "“depends of the team” → “depends on the team”",
      "“I assisted to the meeting” → “I attended the meeting”",
      "“explain me the process” → “explain the process to me”",
    ],
  },
  structure_feedback: {
    score_out_of_10: 8,
    feedback_text:
      "You open with context and close with a measured result, which is what a hiring manager is listening for. Where you lose ground is the middle: when pushed for specifics you widen the story instead of narrowing it. Practice answering the exact question in one sentence before adding context.",
  },
  actionable_next_steps: [
    "Rehearse two STAR stories out loud until the result sentence comes first.",
    "Drill “depends on” and “attend a meeting” — both appeared more than once.",
    "Practice a 15-second answer to “how did you measure that?” with no preamble.",
  ],
};

export const SAMPLE_HISTORY: SessionSummary[] = [
  { id: "s-104", company: "Stripe", role: "Senior Product Designer", stage: "Behavioral", date: "Aug 28", score: 62 },
  { id: "s-103", company: "Airbnb", role: "Senior Product Designer", stage: "Craft deep dive", date: "Aug 21", score: 58 },
  { id: "s-102", company: "Amazon", role: "Product Designer", stage: "Behavioral", date: "Aug 14", score: 49 },
  { id: "s-101", company: "Mercado Libre", role: "Product Designer", stage: "System design", date: "Aug 6", score: 44 },
];
