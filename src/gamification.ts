/**
 * Points, levels and badges.
 *
 * Every rule here is a pure function over facts already stored — no clock
 * reads inside the scoring, no randomness, no model. That is what makes the
 * whole thing recomputable: XP is an append-only log (see the `xp_events`
 * table), the total is a fold over it, and the level is derived from the
 * total. Nothing is ever stored as a mutable counter, because the first change
 * to these rules would corrupt one and there would be no way back.
 *
 * The anti-farming stance is deliberate. XP is awarded per completed session
 * and capped per day, never per word or per minute — otherwise the optimal
 * strategy becomes talking longer, which is the opposite of the skill this
 * product is supposed to build.
 */
import type { SessionMetrics } from "./metrics.js";
import type { Evaluation } from "./schema.js";
import type { SessionSummary, SessionMode, XpEvent } from "./progress-store.js";

/** Ceiling on what one day of practice can be worth. */
export const DAILY_XP_CAP = 300;

/** Flat award for reaching an evaluation at all. */
const XP_COMPLETION = 50;
/** Half the percentage score, so a strong interview roughly doubles the base. */
const XP_SCORE_DIVISOR = 2;
/** First session of a calendar day. */
const XP_DAILY_FIRST = 25;
/** Beating the mean of your recent sessions. */
const XP_IMPROVEMENT = 25;
/**
 * Real mode withholds live coaching, so it is harder and the only honest
 * progress signal. Paying more for it is what stops practice mode from being
 * the rational choice forever.
 */
const REAL_MODE_MULTIPLIER = 1.25;

/** How many past sessions "improving" is measured against. */
const IMPROVEMENT_WINDOW = 5;

export interface ScoreInput {
  score: number;
  mode: SessionMode;
  /** Prior sessions for this owner, newest first, excluding the one scored. */
  history: SessionSummary[];
  /** Awarded XP from today, used to apply the cap. */
  xpToday: number;
  /** ISO date (YYYY-MM-DD) the session completed on, in the owner's day. */
  today: string;
}

/**
 * The XP events one finished session earns.
 *
 * Returns events rather than a number so the log stays legible: a candidate
 * who gains 120 points can be shown what each part was for, and a rule change
 * can be reasoned about against real history.
 */
export function xpForSession(input: ScoreInput): XpEvent[] {
  const events: XpEvent[] = [{ kind: "completed", amount: XP_COMPLETION }];

  const scoreXp = Math.round(input.score / XP_SCORE_DIVISOR);
  if (scoreXp > 0) events.push({ kind: "score", amount: scoreXp });

  const practisedToday = input.history.some(
    (session) => session.completedAt?.slice(0, 10) === input.today,
  );
  if (!practisedToday) events.push({ kind: "daily-first", amount: XP_DAILY_FIRST });

  const recent = input.history
    .map((session) => session.score)
    .filter((score): score is number => score !== null)
    .slice(0, IMPROVEMENT_WINDOW);
  if (recent.length > 0) {
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (input.score > mean) events.push({ kind: "improved", amount: XP_IMPROVEMENT });
  }

  if (input.mode === "real") {
    const base = events.reduce((total, event) => total + event.amount, 0);
    const bonus = Math.round(base * (REAL_MODE_MULTIPLIER - 1));
    if (bonus > 0) events.push({ kind: "real-mode", amount: bonus });
  }

  return capDaily(events, input.xpToday);
}

/**
 * Trims a day's awards to {@link DAILY_XP_CAP}.
 *
 * Trimming the events rather than the total keeps the log honest: what is
 * stored is exactly what was granted, so folding the log always reproduces the
 * balance. The last event absorbs the reduction and a fully-capped day stores
 * nothing at all.
 */
export function capDaily(events: XpEvent[], xpToday: number): XpEvent[] {
  const remaining = Math.max(0, DAILY_XP_CAP - xpToday);
  if (remaining === 0) return [];

  const kept: XpEvent[] = [];
  let spent = 0;
  for (const event of events) {
    if (spent + event.amount <= remaining) {
      kept.push(event);
      spent += event.amount;
      continue;
    }
    const partial = remaining - spent;
    if (partial > 0) kept.push({ kind: event.kind, amount: partial });
    break;
  }
  return kept;
}

/**
 * Level from total XP, on a widening curve.
 *
 * Each level costs more than the last (level N starts at 50·N²), so early
 * sessions produce visible movement while later ones do not inflate. A linear
 * curve would have someone at level 40 by month two, which stops meaning
 * anything.
 */
export function levelForXp(xp: number): {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  const safe = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safe / 50)) + 1;
  const floorXp = 50 * (level - 1) ** 2;
  const ceilingXp = 50 * level ** 2;
  return {
    level,
    xpIntoLevel: safe - floorXp,
    xpForNextLevel: ceilingXp - floorXp,
  };
}

/* ---------------------------------------------------------------------------
 * Per-axis levels
 * ------------------------------------------------------------------------ */

export const AXES = ["fluency", "vocabulary", "structure", "confidence"] as const;
export type Axis = (typeof AXES)[number];

export const AXIS_LABEL: Record<Axis, string> = {
  fluency: "Fluency",
  vocabulary: "Vocabulary",
  structure: "Structure",
  confidence: "Confidence",
};

export interface AxisInput {
  metrics: SessionMetrics | null;
  evaluation: Pick<Evaluation, "vocabulary_feedback" | "structure_feedback"> | null;
}

/**
 * Scores one session on each axis, 0–100, or null where the inputs for that
 * axis are missing.
 *
 * Four numbers rather than one on purpose. A single score hides the case this
 * product exists to fix — fluent but disorganised, or well-structured but
 * hesitant — and those are exactly the two situations where a candidate can do
 * something about it.
 */
export function axisScores(input: AxisInput): Record<Axis, number | null> {
  const { metrics, evaluation } = input;

  return {
    // A comfortable interview pace sits near 140 wpm. Both directions are
    // penalised: racing is as hard to follow as stalling.
    fluency:
      metrics?.wpm == null ? null : band(metrics.wpm, 140, 60),
    vocabulary:
      evaluation?.vocabulary_feedback
        ? evaluation.vocabulary_feedback.score_out_of_10 * 10
        : metrics?.vocabularyRange == null
          ? null
          : clamp(metrics.vocabularyRange * 140, 0, 100),
    structure: evaluation?.structure_feedback
      ? evaluation.structure_feedback.score_out_of_10 * 10
      : null,
    // Filler rate is the most responsive signal a candidate has: it moves
    // within a session once someone notices it. Under 2 per 100 words is
    // clean speech; 12 and above reads as consistently hesitant.
    confidence:
      metrics?.fillerPer100 == null
        ? null
        : clamp(100 - (metrics.fillerPer100 - 2) * (100 / 10), 0, 100),
  };
}

/** 100 at `centre`, falling to 0 at `tolerance` away in either direction. */
function band(value: number, centre: number, tolerance: number): number {
  return clamp(100 - (Math.abs(value - centre) / tolerance) * 100, 0, 100);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/* ---------------------------------------------------------------------------
 * Badges
 * ------------------------------------------------------------------------ */

export interface Badge {
  id: string;
  label: string;
  description: string;
}

/**
 * Every badge is a verifiable fact about stored sessions, never a
 * participation trophy. "You practised" is not an achievement; "five sessions
 * in a row under three fillers per hundred words" is something a person did.
 */
export const BADGES: Badge[] = [
  { id: "first-session", label: "First call", description: "Finished your first interview." },
  { id: "five-sessions", label: "Regular", description: "Finished five interviews." },
  { id: "twenty-five-sessions", label: "Committed", description: "Finished twenty-five interviews." },
  { id: "clean-speech", label: "Clean speech", description: "Under three fillers per hundred words." },
  { id: "clean-streak", label: "Consistently clean", description: "Five straight sessions under three fillers per hundred words." },
  { id: "steady-pace", label: "Steady pace", description: "Held 120–160 words per minute across a session." },
  { id: "quick-start", label: "Quick start", description: "Began answering within a second and a half." },
  { id: "scored-80", label: "Strong showing", description: "Scored 80 or above." },
  { id: "scored-90", label: "Interview ready", description: "Scored 90 or above." },
  { id: "real-mode", label: "No safety net", description: "Completed an interview with coaching switched off." },
  { id: "sector-explorer", label: "Sector explorer", description: "Interviewed across three different sectors." },
  { id: "company-explorer", label: "Well travelled", description: "Interviewed at four different companies." },
  { id: "technical-round", label: "Under the hood", description: "Completed a technical deep dive." },
  { id: "system-design", label: "Whiteboard", description: "Completed a system design round." },
];

export interface BadgeInput {
  score: number;
  mode: SessionMode;
  stage: string;
  sectorId: string | null;
  company: string;
  metrics: SessionMetrics;
  /** Prior sessions for this owner, newest first, excluding the one scored. */
  history: SessionSummary[];
}

/**
 * Badge ids this session qualifies for. Awarding is idempotent at the store,
 * so returning one already held is harmless and this stays a pure predicate.
 */
export function badgesForSession(input: BadgeInput): string[] {
  const earned: string[] = [];
  const completed = input.history.length + 1;

  if (completed >= 1) earned.push("first-session");
  if (completed >= 5) earned.push("five-sessions");
  if (completed >= 25) earned.push("twenty-five-sessions");

  if (input.score >= 80) earned.push("scored-80");
  if (input.score >= 90) earned.push("scored-90");
  if (input.mode === "real") earned.push("real-mode");

  const stage = input.stage.toLowerCase();
  if (stage.includes("technical")) earned.push("technical-round");
  if (stage.includes("system design")) earned.push("system-design");

  const clean = input.metrics.fillerPer100 !== null && input.metrics.fillerPer100 < 3;
  if (clean) {
    earned.push("clean-speech");
    // This session plus the four before it. `every` on a short slice is the
    // whole streak check — a gap anywhere in the five breaks it.
    const previous = input.history.slice(0, 4);
    if (
      previous.length === 4 &&
      previous.every(
        (session) =>
          session.metrics?.fillerPer100 !== null &&
          session.metrics?.fillerPer100 !== undefined &&
          session.metrics.fillerPer100 < 3,
      )
    ) {
      earned.push("clean-streak");
    }
  }

  if (input.metrics.wpm !== null && input.metrics.wpm >= 120 && input.metrics.wpm <= 160) {
    earned.push("steady-pace");
  }
  if (input.metrics.timeToFirstMs !== null && input.metrics.timeToFirstMs < 1_500) {
    earned.push("quick-start");
  }

  const sectors = new Set(
    [input.sectorId, ...input.history.map((session) => session.sectorId)].filter(
      (id): id is string => id !== null,
    ),
  );
  if (sectors.size >= 3) earned.push("sector-explorer");

  const companies = new Set([
    input.company,
    ...input.history.map((session) => session.company),
  ]);
  if (companies.size >= 4) earned.push("company-explorer");

  return earned;
}
