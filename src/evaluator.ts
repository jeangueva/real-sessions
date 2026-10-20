import { EVALUATOR_FALLBACKS, EVALUATOR_MODEL } from "./client.js";
import { findLanguage } from "./languages.js";
import { resolveProvider } from "./providers/index.js";
import type {
  LatencyStats,
  ModelProvider,
  ProviderUsage,
} from "./providers/index.js";
import { buildEvaluatorPrompt, formatTranscript } from "./prompts/evaluator.js";
import { DEFENSE_EVALUATOR_TEMPLATE } from "./prompts/defense-evaluator.js";
import type { DefenseSetup } from "./prompts/interviewer.js";
import { juryNames } from "./defense-extras.js";
import { renderTemplate } from "./prompts/template.js";
import { findFormat, verdictFor } from "./defense-formats.js";
import { disciplineBar, withFamily } from "./careers-pe.js";
import { FOCUSES, SCENARIOS } from "./prompts/defense.js";
import { EvaluationSchema, RetryFeedbackSchema, type Evaluation, type RetryFeedback } from "./schema.js";
import type { InterviewContext, TranscriptTurn } from "./types.js";

/** Raised when the model returns nothing that validates against the schema. */
export class EvaluationParseError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "EvaluationParseError";
  }
}

export interface EvaluateOptions {
  /**
   * The rounds the interview covered, in order. Passed explicitly because a
   * combined session records its stage as a joined label, which no lookup
   * resolves — leaving the evaluator grading everything as behavioural.
   */
  stages?: readonly string[];
  /** What the interview was conducted in, so it is graded in that language. */
  language?: string;
  /** The level the interview was conducted at, so the bar matches it. */
  level?: string;
  /** Whether it ran under pressure, so recovery is judged rather than polish. */
  pressure?: boolean;
  /** The language the report is written in — the reader's interface language. */
  reportLanguage?: string;
  /** A thesis defence: the dossier the panel read, so the jury deliberates on it. */
  defense?: DefenseSetup | null;
  /** Defaults to the vendor implied by `model`. Inject a stub in tests. */
  provider?: ModelProvider;
  model?: string;
  maxTokens?: number;
  /**
   * Thinking depth. Evaluation is the quality-sensitive half — default high.
   * Ignored on models without effort control (Haiku 4.5, Sonnet 4.5).
   */
  effort?: "low" | "medium" | "high";
  /**
   * Models to try in order if the primary is unavailable. Server-side routing
   * on OpenRouter; ignored by providers without it.
   */
  fallbackModels?: string[];
  /** Called with the metering for this call, before the result is validated. */
  onUsage?: (meta: { usage: ProviderUsage; latency: LatencyStats }) => void;
}

/**
 * Phase 2 — runs after `[INTERVIEW_COMPLETE]` is detected. The JSON shape is
 * enforced by the provider's structured-output mode using
 * {@link EvaluationSchema}, so no markdown-fence stripping is needed and a
 * malformed payload fails loudly instead of landing in the database.
 */
export async function evaluateInterview(
  context: InterviewContext,
  transcript: readonly TranscriptTurn[],
  options: EvaluateOptions = {},
): Promise<Evaluation> {
  const model = options.model ?? EVALUATOR_MODEL;
  const provider = options.provider ?? resolveProvider(model);

  if (options.defense) {
    return evaluateDefense(context, transcript, options.defense, options, model, provider);
  }

  const response = await provider.json({
    model,
    system: buildEvaluatorPrompt(
      context,
      options.stages,
      options.language,
      options.level,
      options.pressure,
      options.reportLanguage,
    ),
    // The language rule restated after the transcript, where the model reads
    // last: buried mid-prompt it was ignored, and Spanish readers got English.
    prompt:
      formatTranscript(transcript, context) +
      `\n\nWrite all feedback in ${options.reportLanguage ?? "English"}. Keep only the candidate's quoted words, the corrected phrasings and every \`better\` answer in ${findLanguage(options.language).promptLabel} — never invent numbers they did not say; use [placeholders]. Always fill \`english_level\` with your CEFR estimate and screen outlook unless the candidate said fewer than 40 words in total. \`acta\` is always null. Be brief.`,
    maxTokens: options.maxTokens ?? 4096,
    schema: EvaluationSchema,
    ...(options.effort ? { effort: options.effort } : {}),
    ...((options.fallbackModels ?? EVALUATOR_FALLBACKS).length > 0
      ? { fallbacks: options.fallbackModels ?? EVALUATOR_FALLBACKS }
      : {}),
  });

  options.onUsage?.({ usage: response.usage, latency: response.latency });

  if (response.refused) {
    throw new EvaluationParseError(
      "The evaluator model declined to analyze this transcript.",
      response.raw,
    );
  }

  if (!response.value) {
    throw new EvaluationParseError(
      `Evaluator returned no schema-valid JSON (stop reason: ${response.raw ? "unparsable output" : "empty output"}).`,
      response.raw,
    );
  }

  // Re-validate locally: the same guarantee then applies to rows read back
  // out of Supabase, not just to this response.
  return EvaluationSchema.parse(response.value);
}

/**
 * Grades one retried answer against the question it answers and the better
 * version the report suggested.
 *
 * Small on purpose: one question, one answer, four fields. The point of
 * "try this answer again" is a fast loop — say it, see if it got better, say
 * it again — and a full report per attempt would be slow and expensive.
 */
export async function gradeRetry(input: {
  question: string;
  suggested: string;
  answer: string;
  reportLanguage?: string;
  language?: string;
  provider?: ModelProvider;
}): Promise<RetryFeedback> {
  const model = EVALUATOR_MODEL;
  const provider = input.provider ?? resolveProvider(model);
  const language = findLanguage(input.language).promptLabel;
  const report = input.reportLanguage ?? "English";
  const response = await provider.json({
    model,
    system: `You coach a job candidate who is practising one interview answer in ${language}, a language that is not their first. Judge only this answer to this question. Be direct about the answer, kind about the person.
Return:
- verdict: "strong", "ok" or "weak".
- feedback: one sentence of at most 20 words, in ${report}, on what to change next (or what now works).
- better: a stronger version, always in ${language}, at most 35 words, built only from what they said; never invent numbers or facts — use [placeholders] for anything missing.
- improved: true if this answer now does what the suggested version does — as clear, specific and correct — even in different words; false if it still has the original problem.
Plain text only, no markdown.`,
    prompt: `Question: ${input.question}\n\nThe version they were given to aim for: ${input.suggested}\n\nTheir new answer: ${input.answer}\n\nWrite the feedback in ${report}.`,
    maxTokens: 600,
    schema: RetryFeedbackSchema,
  });
  if (!response.value) {
    throw new EvaluationParseError("The retry grader returned no usable JSON.", response.raw);
  }
  return RetryFeedbackSchema.parse(response.value);
}

/**
 * Grades a 60-second micro-rehearsal answer to one likely question from the
 * thesis diagnosis, grounded in the thesis summary and the cited page text.
 */
export async function gradeThesisQuestion(input: {
  thesisTitle: string;
  field: string;
  issue: string;
  question: string;
  pageExcerpt?: string | null;
  answer: string;
  reportLanguage?: string;
  language?: string;
  provider?: ModelProvider;
}): Promise<RetryFeedback> {
  const model = EVALUATOR_MODEL;
  const provider = input.provider ?? resolveProvider(model);
  const language = findLanguage(input.language).promptLabel;
  const report = input.reportLanguage ?? "Spanish";
  const response = await provider.json({
    model,
    system: `You are a thesis defence juror in ${input.field} coaching a student who just practiced answering one critical question from their thesis diagnosis. Judge only this answer against the weak point identified in the thesis. Be direct, academic, and concise.
Return:
- verdict: "strong" (answers the objection directly with methodological/empirical grounding), "ok" (partially answers, lacks precision or page data), or "weak" (evades, rambles, or contradicts the thesis).
- feedback: one sentence of at most 24 words, in ${report}, saying what worked or what is still missing for the jury.
- better: a model spoken answer for the defence, in ${language}, at most 45 words, grounded only in the thesis context and what the student said; never invent data — use [placeholders] if a number is missing.
- improved: true when verdict is "strong", false otherwise.
Plain text only, no markdown.`,
    prompt: `Thesis: ${input.thesisTitle} (${input.field})
Weak point in the thesis: ${input.issue}
${input.pageExcerpt ? `Cited page excerpt:\n${input.pageExcerpt.slice(0, 1200)}\n` : ""}Jury question: ${input.question}

Student's spoken answer: ${input.answer}

Write feedback in ${report}.`,
    maxTokens: 600,
    schema: RetryFeedbackSchema,
  });
  if (!response.value) {
    throw new EvaluationParseError("The thesis question grader returned no usable JSON.", response.raw);
  }
  return RetryFeedbackSchema.parse(response.value);
}

/** A defence model: the deliberation is long reasoning over a long dossier. */
const DEFENSE_EVALUATOR_MODEL =
  process.env.REALSESSIONS_DEFENSE_EVALUATOR_MODEL ?? "anthropic/claude-sonnet-5";

/**
 * The jury's deliberation and record for a thesis defence.
 *
 * The same report shape as an interview — strengths, answer by answer, next
 * steps — so every screen that shows a report shows this one, with the
 * record added on top.
 */
async function evaluateDefense(
  context: InterviewContext,
  transcript: readonly TranscriptTurn[],
  defense: DefenseSetup,
  options: EvaluateOptions,
  model: string,
  provider: ModelProvider,
): Promise<Evaluation> {
  const chosen = options.model ? model : DEFENSE_EVALUATOR_MODEL;
  const runner = options.provider ?? (options.model ? provider : resolveProvider(chosen));
  const report = options.reportLanguage ?? "Spanish";
  // The record names the seats as the panel had them: the discipline's team.
  const format = withFamily(findFormat(defense.country), defense.career?.family);
  const response = await runner.json({
    model: chosen,
    system: renderTemplate(DEFENSE_EVALUATOR_TEMPLATE, {
      university: defense.university,
      country: format.countryName,
      jurors: juryNames(defense.jury ?? [], format.jurors),
      scale_line: `The ${format.countryName} scale: \`grade_max\` ${format.scale.max}, \`pass_mark\` ${format.scale.pass}, grades from ${format.scale.min} to ${format.scale.max}.`,
      rounding: format.scale.decimals ? ", to one decimal" : ", rounded to a whole number",
      difficulty: defense.difficulty,
      scenario_bar: SCENARIOS[defense.scenario ?? "titulo"].bar + disciplineBar(defense.career),
      focus_note:
        (defense.focus ?? "completa") === "completa"
          ? "This was a complete defence."
          : `This rehearsal trained one thing — weigh it above the rest: ${FOCUSES[defense.focus ?? "completa"]}`,
      fluency_note: defense.fluencyNeutral
        ? "ACCESSIBILITY: the student asked that fluency not count (a stutter or a similar condition). Do not lower any grade or axis for pauses, blocks, repetitions, fillers or pace; judge \`seguridad\` on the conviction of what they said, never on how smoothly. Leave \`fluency_neutral\` null."
        : "Leave \`fluency_neutral\` null.",
      rubric_note: defense.rubric
        ? `THE UNIVERSITY'S OWN RUBRIC — grade against these criteria as well, and say in the deliberation where the student met or missed them:\n${defense.rubric}`
        : "Grade against the usual criteria of a thesis jury.",
      members_rule:
        (defense.members?.length ?? 0) > 1
          ? `a group thesis by ${defense.members!.join(", ")}. One entry per member, in that order, with their own grade on the same scale and two sentences on how they did, from the questions addressed to them.`
          : "always an empty list.",
      report_language: report,
      dossier: defense.dossier,
    }),
    prompt:
      formatTranscript(transcript, { ...context, candidateName: "STUDENT" }) +
      `\n\nDeliberate and write the record. Every text field in ${report}.`,
    maxTokens: options.maxTokens ?? 6_000,
    schema: EvaluationSchema,
    ...((options.fallbackModels ?? EVALUATOR_FALLBACKS).length > 0
      ? { fallbacks: options.fallbackModels ?? EVALUATOR_FALLBACKS }
      : {}),
  });
  options.onUsage?.({ usage: response.usage, latency: response.latency });
  if (response.refused || !response.value) {
    throw new EvaluationParseError("The jury could not write the record.", response.raw);
  }
  const parsed = EvaluationSchema.parse(response.value);
  const acta = parsed.acta;
  if (!acta) throw new EvaluationParseError("The jury returned no record.", response.raw);
  // The scale, the verdict and the names come from the country's format, not
  // the model: a model that rounds generously in the prose should not be able
  // to pass someone the numbers fail.
  const { min, max, pass, decimals } = format.scale;
  const clamp = (value: number) => {
    const bounded = Math.min(max, Math.max(min, value));
    return decimals ? Math.round(bounded * 10) / 10 : Math.round(bounded);
  };
  const deliberation = acta.deliberation.map((entry) => ({
    ...entry,
    grade: clamp(entry.grade),
    name: format.jurors[entry.juror].name,
    role: format.jurors[entry.juror].role,
  }));
  const verdict = verdictFor(format, deliberation.map((entry) => entry.grade));
  const grade = clamp(acta.grade);
  return {
    ...parsed,
    first_language_errors: [],
    english_level: null,
    overall_score_percentage: Math.round(((grade - min) / (max - min)) * 100),
    acta: {
      ...acta,
      grade,
      grade_max: max,
      pass_mark: pass,
      verdict: verdict.code,
      verdict_label: verdict.label,
      fluency_neutral: defense.fluencyNeutral ? true : null,
      deliberation,
    },
  };
}
