/**
 * The objective half of feedback.
 *
 * Everything here is arithmetic over the transcript — no model, no cost, no
 * variance between runs. That matters more than it sounds: an LLM score that
 * drifts by three points between identical sessions cannot carry a progress
 * chart, because the reader cannot tell improvement from noise. These numbers
 * can. The evaluator stays responsible for the qualitative half.
 *
 * Two groups, kept strictly apart. Text metrics work on any transcript. Timing
 * metrics need real speech timings and are null without them — never estimated
 * from an assumed speaking rate, which would look like a measurement and
 * quietly corrupt every trend built on it.
 */
import type { RecordedTurn } from "./progress-store.js";

export interface SessionMetrics {
  /** Words the candidate spoke. */
  words: number;
  /** Disfluencies and discourse markers per 100 words. Lower is better. */
  fillerPer100: number | null;
  /** Moving-average type-token ratio, 0–1. Higher is a wider active vocabulary. */
  vocabularyRange: number | null;
  /** Candidate words over all words, 0–1. */
  wordShare: number | null;

  /** Milliseconds the candidate was actually speaking. */
  speakingMs: number | null;
  wpm: number | null;
  /** Mean gap from the interviewer finishing to the candidate starting. */
  avgResponseMs: number | null;
  /** Responses that took longer than {@link LONG_PAUSE_MS} to begin. */
  longPauses: number | null;
  /** The same gap for the first answer, where nerves show most. */
  timeToFirstMs: number | null;

  /** False when the session was typed — the timing block is null throughout. */
  fromSpeech: boolean;
}

/** A gap longer than this reads as a stall rather than a beat to think. */
export const LONG_PAUSE_MS = 3_000;

/** Window for the moving-average type-token ratio, in words. */
const MATTR_WINDOW = 50;

/**
 * Sounds with no lexical content. These are safe to count: they are never a
 * real word, so a match is never a false positive.
 */
const DISFLUENCIES = /\b(?:u+m+|u+h+|e+r+m*|a+h+|h+m+|mm+)\b/gi;

/**
 * Discourse markers that pad an answer. Multi-word by design — the single-word
 * offenders ("like", "so", "right") are ordinary English far more often than
 * they are filler, and counting them naively would penalise a candidate for
 * saying "I like the approach".
 */
const HEDGES =
  /\b(?:you know|i mean|sort of|kind of|or something|or whatever|i guess|to be honest|at the end of the day)\b/gi;

/**
 * "like" only where it is doing filler work: fenced by commas, or trailing a
 * disfluency. Comma placement comes from the transcriber, so this undercounts
 * rather than overcounts — the safer direction for a number shown as feedback.
 */
const FILLER_LIKE = /(?:,\s*like\s*,|\b(?:um|uh|er)\s*,?\s*like\b)/gi;

/** Splits on whitespace after stripping anything that is not a letter or apostrophe. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word !== "");
}

export function countFillers(text: string): number {
  return (
    (text.match(DISFLUENCIES)?.length ?? 0) +
    (text.match(HEDGES)?.length ?? 0) +
    (text.match(FILLER_LIKE)?.length ?? 0)
  );
}

/**
 * Moving-average type-token ratio.
 *
 * Plain unique/total falls as a transcript grows — every speaker repeats "the"
 * — so a longer interview would score as a smaller vocabulary. Averaging the
 * ratio over fixed-width windows removes the length dependence, which is what
 * makes two sessions comparable at all. Below one window there is nothing to
 * average, so the whole text is used and the result is noisier; the caller sees
 * that as a metric on a very short session, not as a wrong one.
 */
export function movingTypeTokenRatio(tokens: string[]): number | null {
  if (tokens.length === 0) return null;
  if (tokens.length <= MATTR_WINDOW) {
    return new Set(tokens).size / tokens.length;
  }
  let total = 0;
  let windows = 0;
  for (let start = 0; start + MATTR_WINDOW <= tokens.length; start += 1) {
    const window = tokens.slice(start, start + MATTR_WINDOW);
    total += new Set(window).size / MATTR_WINDOW;
    windows += 1;
  }
  return windows === 0 ? null : total / windows;
}

/**
 * Derives every metric from one session's turns.
 *
 * Turns must be in the order they happened; `idx` is the ordering, not array
 * position, so a caller cannot silently pass them shuffled.
 */
export function computeMetrics(input: RecordedTurn[]): SessionMetrics {
  const turns = [...input].sort((a, b) => a.idx - b.idx);
  const candidate = turns.filter((turn) => turn.speaker === "candidate");
  const candidateText = candidate.map((turn) => turn.text).join(" ");
  const tokens = words(candidateText);
  const allWords = turns.reduce((total, turn) => total + words(turn.text).length, 0);

  const text = {
    words: tokens.length,
    fillerPer100:
      tokens.length === 0 ? null : (countFillers(candidateText) / tokens.length) * 100,
    vocabularyRange: movingTypeTokenRatio(tokens),
    wordShare: allWords === 0 ? null : tokens.length / allWords,
  };

  // A turn counts as spoken only with both ends of its timing. One bound alone
  // cannot produce a duration, and a half-timed turn in the sum would make
  // words-per-minute read high for no reason a candidate could act on.
  const timed = candidate.filter(
    (turn) => turn.tStartMs !== null && turn.tEndMs !== null && turn.tEndMs > turn.tStartMs,
  );

  if (timed.length === 0) {
    return {
      ...text,
      speakingMs: null,
      wpm: null,
      avgResponseMs: null,
      longPauses: null,
      timeToFirstMs: null,
      fromSpeech: false,
    };
  }

  const speakingMs = timed.reduce(
    (total, turn) => total + (turn.tEndMs! - turn.tStartMs!),
    0,
  );
  // Words from the timed turns only, so the rate divides like by like.
  const spokenWords = timed.reduce(
    (total, turn) => total + words(turn.text).length,
    0,
  );

  const gaps = responseGaps(turns);

  return {
    ...text,
    speakingMs,
    wpm: speakingMs === 0 ? null : spokenWords / (speakingMs / 60_000),
    avgResponseMs:
      gaps.length === 0 ? null : gaps.reduce((a, b) => a + b, 0) / gaps.length,
    longPauses: gaps.filter((gap) => gap > LONG_PAUSE_MS).length,
    timeToFirstMs: gaps[0] ?? null,
    fromSpeech: true,
  };
}

/**
 * Time between an interviewer turn ending and the candidate's reply starting,
 * for every pair where both timings exist.
 *
 * A negative gap means the candidate started before the interviewer finished —
 * an interruption, not a hesitation. Those are dropped rather than clamped to
 * zero, which would drag the mean down and read as quick thinking.
 */
export function responseGaps(turns: RecordedTurn[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < turns.length; i += 1) {
    const previous = turns[i - 1]!;
    const current = turns[i]!;
    if (previous.speaker !== "interviewer" || current.speaker !== "candidate") continue;
    if (previous.tEndMs === null || current.tStartMs === null) continue;
    const gap = current.tStartMs - previous.tEndMs;
    if (gap >= 0) gaps.push(gap);
  }
  return gaps;
}
