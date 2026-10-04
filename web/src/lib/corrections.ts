/**
 * A correction from the report, split into what was said and the natural
 * version.
 *
 * The evaluator writes them as one string — `“depends of the team” → “depends
 * on the team”` — which on screen read as a red-pen margin note. Split, the
 * two halves can be shown as two steps: where you were, and the next version
 * of the same sentence. A string with no arrow is a note rather than a pair,
 * and is returned as such instead of being guessed at.
 */
export type Correction =
  | { kind: "pair"; said: string; natural: string }
  | { kind: "note"; text: string };

const ARROW = /\s*(?:→|->|=>)\s*/;
/** Straight and curly quotes, and the guillemets some models reach for. */
const QUOTES = /^[\s"'“”‘’«»]+|[\s"'“”‘’«»]+$/g;

/**
 * The other shape the evaluator wrote before it was told which one to use:
 * `assist to meetings (should be attend or participate in)`. Reports stored
 * then are still read, so they are split too rather than left as notes.
 */
const SHOULD_BE = /^(.+?)\s*\((?:should be|use|say|try|better)\s*:?\s+(.+)\)\s*\.?$/i;

export function parseCorrection(raw: string): Correction {
  const legacy = raw.trim().match(SHOULD_BE);
  if (legacy && !ARROW.test(raw)) {
    const said = legacy[1]!.replace(QUOTES, "");
    const natural = legacy[2]!.replace(QUOTES, "");
    return said && natural ? { kind: "pair", said, natural } : { kind: "note", text: raw.trim() };
  }
  const parts = raw.split(ARROW);
  if (parts.length !== 2) return { kind: "note", text: raw.trim() };
  const said = parts[0]!.replace(QUOTES, "");
  const natural = parts[1]!.replace(QUOTES, "");
  if (!said || !natural) return { kind: "note", text: raw.trim() };
  return { kind: "pair", said, natural };
}
