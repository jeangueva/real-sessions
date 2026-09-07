/**
 * How hard the English is, as opposed to how hard the questions are.
 *
 * The product already lets someone pick a round and a company, which set what
 * the interview is *about*. Neither one changes the thing most of our
 * candidates are actually blocked on: an interviewer who talks at native pace
 * with idiom in it is unusable at B1, and the session ends with someone
 * concluding they cannot do interviews when what happened is they could not
 * follow the questions.
 *
 * So this is a separate axis. A B1 candidate rehearsing a system design round
 * should get a real system design round, asked in English they can hold. The
 * questions do not get easier — the language does.
 *
 * The levels are CEFR because that is the vocabulary this audience already
 * has from every English school and job posting in the region. What each one
 * means here is written in terms of interviewer behaviour rather than grammar,
 * because "B1" tells a model nothing and "ask one clause at a time" tells it
 * exactly what to do.
 */

export interface Level {
  id: string;
  /** The CEFR band, which is what the candidate recognises. */
  label: string;
  /** One line for the picker, in plain terms rather than CEFR jargon. */
  summary: string;
  /**
   * Goes into the interviewer prompt. Second person, concrete, and about
   * delivery only — nothing here may soften what is being asked, or the
   * rehearsal stops being worth anything.
   */
  brief: string;
  /**
   * Goes into the evaluator prompt. A B1 candidate judged against a C1 bar
   * gets a report that says "improve everything", which is true of everyone
   * and useful to nobody.
   */
  rubric: string;
  /**
   * The score at this level that means the level is no longer the thing
   * holding them back. Crossing it repeatedly is what triggers the nudge
   * upward — see `readyToLevelUp`.
   */
  graduateAt: number;
}

export const LEVELS: Level[] = [
  {
    id: "a2",
    label: "A2 — Starting out",
    summary: "Short questions, everyday words, plenty of time to answer.",
    brief: [
      "The candidate is an elementary English speaker. Ask one short question at a time, in the present or simple past, using everyday words.",
      "Keep every turn under 20 words. Avoid idiom, phrasal verbs, and any sentence with two clauses in it.",
      "If they do not understand, rephrase in simpler words rather than repeating the same sentence louder.",
      "Do not lower the bar on substance: still ask for a specific example and a number. Ask for it in simpler English.",
    ].join(" "),
    rubric:
      "This candidate is at an elementary level. Judge whether the answer was understandable and on-topic, not whether it was elegant. Do not mark down for simple sentence structure, a small vocabulary, or a slow pace — those are the level, not a failure. Do mark down for answers that never reached a concrete example.",
    graduateAt: 70,
  },
  {
    id: "b1",
    label: "B1 — Getting by",
    summary: "Normal questions, common vocabulary, no idiom.",
    brief: [
      "The candidate is an intermediate English speaker. Ask normally but stay in common vocabulary, and keep each turn to one question of one or two clauses.",
      "Avoid idiom and cultural references. Technical terms are fine — those they know.",
      "Speak at a measured pace. If an answer breaks down mid-sentence, let them restart rather than interrupting.",
      "Push on vague answers exactly as you would at any level. Push in plain words.",
    ].join(" "),
    rubric:
      "This candidate is at an intermediate level. Weigh whether the answer was clear and structured. Grammar slips that do not obscure meaning are not worth mentioning; the ones that change what the sentence says are. Expect a concrete example, not polished delivery.",
    graduateAt: 75,
  },
  {
    id: "b2",
    label: "B2 — Working proficiency",
    summary: "The interview as it is actually conducted.",
    brief: [
      "The candidate is an upper-intermediate English speaker — the level most international roles ask for. Conduct the interview at normal professional pace with no accommodation.",
      "Use the idiom a hiring manager naturally uses. Follow up on the thing they said rather than the thing you planned to ask.",
      "Interrupt a rambling answer the way a real interviewer would, politely and early.",
    ].join(" "),
    rubric:
      "This is the level most international roles ask for, so grade against that bar. Precision of vocabulary and the shape of an answer both count. Fillers and hesitation matter here in a way they do not at lower levels, because at this level they read as uncertainty rather than as effort.",
    graduateAt: 80,
  },
  {
    id: "c1",
    label: "C1 — Under pressure",
    summary: "Fast, idiomatic, and it interrupts.",
    brief: [
      "The candidate is an advanced English speaker. Run this at full speed with no allowances at all.",
      "Use idiom, understatement and asides freely. Change direction mid-thread. Ask the follow-up before they have finished landing the previous point, the way a busy interviewer does.",
      "Challenge a weak claim directly rather than inviting them to expand on it.",
    ].join(" "),
    rubric:
      "This candidate claims an advanced level, so hold them to it. Judge nuance, register, and whether they stayed precise while under time pressure. An answer that would pass at B2 is not automatically strong here: at this level the question is whether they sounded like the person who already has the job.",
    graduateAt: 85,
  },
];

/** The level assumed when nobody has chosen — the one most roles ask for. */
export const DEFAULT_LEVEL = "b2";

export function findLevel(value: string | null | undefined): Level {
  const wanted = (value ?? "").trim().toLowerCase();
  return (
    LEVELS.find((level) => level.id === wanted) ??
    LEVELS.find((level) => level.id === DEFAULT_LEVEL)!
  );
}

/** Ordered position, so "the next level up" is a lookup rather than a guess. */
export function levelIndex(id: string): number {
  const found = LEVELS.findIndex((level) => level.id === id);
  return found === -1 ? LEVELS.findIndex((l) => l.id === DEFAULT_LEVEL) : found;
}

export function nextLevel(id: string): Level | null {
  const next = LEVELS[levelIndex(id) + 1];
  return next ?? null;
}

/** How many sessions at a level before its scores mean anything. */
export const SESSIONS_BEFORE_NUDGE = 3;

export interface LevelAttempt {
  level: string;
  score: number | null;
}

/**
 * Whether to suggest moving up, and to what.
 *
 * The rule is deliberately conservative in one direction: it looks at the
 * most recent attempts at the *current* level only, and needs several of
 * them. One good session is a good day, and telling someone they have
 * outgrown a level on the strength of it sets them up to fail at the next
 * one — which is worse than leaving them where they are, because the whole
 * point of the level is to keep the interview survivable.
 *
 * Unscored sessions are skipped rather than counted as failures: an
 * abandoned interview says nothing about English.
 */
export function readyToLevelUp(
  current: string,
  attempts: readonly LevelAttempt[],
): Level | null {
  const level = findLevel(current);
  const up = nextLevel(level.id);
  if (!up) return null;

  const scored = attempts
    .filter((attempt) => attempt.level === level.id && attempt.score !== null)
    .slice(-SESSIONS_BEFORE_NUDGE);

  if (scored.length < SESSIONS_BEFORE_NUDGE) return null;
  return scored.every((attempt) => (attempt.score ?? 0) >= level.graduateAt)
    ? up
    : null;
}

/** The picker's payload. */
export function levelCatalogue(): {
  id: string;
  label: string;
  summary: string;
}[] {
  return LEVELS.map(({ id, label, summary }) => ({ id, label, summary }));
}
