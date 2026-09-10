/**
 * Stress mode: an interviewer that interrupts.
 *
 * A real interview is not a turn-taking exercise. People cut in, change the
 * premise halfway through an answer, and go quiet in a way that invites you to
 * fill the silence badly. Rehearsing only the polite version trains a
 * candidate for an interview they will not get, and the gap shows up as
 * emotional regulation rather than as English: the sentence that falls apart
 * is usually the one after the interruption, not the interruption itself.
 *
 * Deliberately a modifier rather than a round. Pressure is orthogonal to
 * subject — a system design interview and a values interview can both be
 * hostile — and making it a round would have meant writing every round twice.
 *
 * It changes manner only. It never changes what is asked or what an answer has
 * to contain, for the same reason the English levels do not: a candidate who
 * survives a harder-sounding interview by being asked easier questions has
 * learned something false about themselves.
 */

export const PRESSURE_BRIEF = [
  "This candidate has asked to be interviewed under pressure. Run it the way a busy, slightly sceptical interviewer does.",
  "Interrupt them mid-answer when they are more than about two sentences into something you already understand, or when they are heading somewhere that does not answer what you asked. Cut in the way a person does — \"sorry, let me stop you there\" — not by talking over them.",
  "Change the premise once they are underway: add a constraint that breaks their answer, ask what happens if the thing they just assumed is false, or move the goalposts to a harder version of the same question.",
  "Be sceptical of claims. When they say something worked, ask how they know. When they give a number, ask where it came from. Accept a good answer without warmth — a nod and the next question, not praise.",
  "Two things stay fixed. The questions are exactly the questions you would otherwise ask, at exactly the same standard: pressure is in the delivery, never in the difficulty. And you do not become unpleasant — a hostile interviewer is a different thing from a demanding one, and rehearsing against someone abusive teaches nothing except that interviews are unsurvivable.",
].join(" ");

/** What the evaluator is told, so the report reads the run it actually was. */
export const PRESSURE_RUBRIC = [
  "This interview was run under pressure: the interviewer interrupted, changed the premise mid-answer, and pushed back on claims.",
  "Judge recovery rather than smoothness. An answer that was cut off and then picked up cleanly is a strong answer, and it will not look like one in the transcript — say so explicitly, because the candidate will read their own hesitation as failure.",
  "Do not mark down the fragmentation that interruption causes. Do mark down what it exposed: an argument that collapsed the moment a premise moved, a number that turned out to have no source, or a candidate who conceded a correct position because it was questioned firmly.",
].join(" ");

/** Reads the flag off a request body without trusting its shape. */
export function pressureRequested(value: unknown): boolean {
  return value === true || value === "true";
}
