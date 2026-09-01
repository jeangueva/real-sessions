/**
 * Variables injected from Supabase before a prompt is sent.
 * Mirrors the `{{...}}` placeholders in the Real Sessions spec.
 */
export interface InterviewContext {
  /** User's name. */
  candidateName: string;
  /** e.g. "Senior Product Designer", "Backend Engineer", "Growth PM". */
  targetRole: string;
  /** e.g. "Amazon", "Airbnb", "Stripe", "Web3 Startup". */
  companyName: string;
  /** Cultural traits, e.g. "Customer obsession, data-driven, scalable architecture". */
  companyCulture: string;
  /** e.g. "E-commerce", "Fintech", "HealthTech". */
  industry: string;
  /** e.g. "Technical Deep Dive", "Behavioral", "System Design". */
  interviewStage: string;
}

/** One exchange in the interview, in the order it happened. */
export interface TranscriptTurn {
  speaker: "interviewer" | "candidate";
  text: string;
}

/** Sentinel the interviewer emits at the end of its final response. */
export const INTERVIEW_COMPLETE_FLAG = "[INTERVIEW_COMPLETE]";

/** Result of a single interviewer turn. */
export interface InterviewerTurn {
  /** Response text with the completion flag stripped — safe to send to TTS. */
  text: string;
  /** True when the model emitted `[INTERVIEW_COMPLETE]`. */
  isComplete: boolean;
  /** 1-based index of this interviewer turn within the session. */
  turnNumber: number;
  /** Raw stop reason from the API. `"refusal"` means the model declined. */
  stopReason: string | null;
}
