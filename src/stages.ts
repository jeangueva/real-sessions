import { ROLES, findRole } from "./roles.js";

/**
 * The rounds an interview can be.
 *
 * A real process is several different conversations, and rehearsing the wrong
 * one is wasted time — a behavioural round and a system design round have
 * almost nothing in common except the company name.
 *
 * Two problems this fixes.
 *
 * The list used to be the same three for everybody, so a Senior Product
 * Designer could pick "System design" and get a convincing interview about
 * something that round does not mean for them. Convincing and wrong is worse
 * than unavailable: nothing on screen said the rehearsal was off-target.
 *
 * And the stage used to be one substituted word in two prompts. It now also
 * decides how long the interview runs and what the evaluator weighs, because
 * those are the things that actually differ. A system design round needs room
 * to develop; a behavioural round asked to fill the same space starts padding.
 */

export interface Stage {
  id: string;
  label: string;
  /** One line for the picker: what this round is actually testing. */
  summary: string;
  /**
   * Goes into the Phase 1 prompt. Tells the interviewer what this round is
   * for, in the second person, so "Technical deep dive" is an instruction
   * rather than a label it has to interpret.
   */
  brief: string;
  /**
   * Goes into the Phase 2 prompt. What the evaluator should weigh most
   * heavily — the same answer is strong in one round and thin in another.
   */
  rubric: string;
  /**
   * Turn bounds. The interview is a conversation, not a form, and these are
   * the difference between "tell me about a time" (which resolves in a few
   * exchanges) and a design question (which is barely started by then).
   */
  minTurns: number;
  maxTurns: number;
}

const BEHAVIORAL: Stage = {
  id: "behavioral",
  label: "Behavioral",
  summary: "Your past, in detail. Expect “tell me about a time…”.",
  brief:
    "This is a behavioural round. Ask about things the candidate has actually done, not hypotheticals. Push for the situation, what they personally did, and how it turned out — and when an answer arrives without a result, ask for the result.",
  rubric:
    "Weigh structure above all: a behavioural answer that never reaches an outcome has failed regardless of how fluent it was. Look for situation, action and result, and for ownership stated in the first person singular rather than a team's.",
  minTurns: 5,
  maxTurns: 7,
};

const DEEP_DIVE: Stage = {
  id: "technical-deep-dive",
  label: "Technical deep dive",
  summary: "One thing you built, taken apart. Expect to run out of detail.",
  brief:
    "This is a technical deep dive. Pick one thing the candidate built and stay on it. Every answer earns a more specific follow-up — the mechanism, the number, the thing that broke — until you reach the edge of what they actually know. Moving to a new topic early is the failure mode here.",
  rubric:
    "Weigh precision and depth. Correct terminology used in the right context counts for more than breadth, and a confident answer about a mechanism the candidate clearly has not touched is worse than an honest boundary.",
  minTurns: 5,
  maxTurns: 8,
};

const SYSTEM_DESIGN: Stage = {
  id: "system-design",
  label: "System design",
  summary: "Design something from nothing. Scale, data, tradeoffs.",
  brief:
    "This is a system design round. Give the candidate a problem to design from scratch and let them drive. Ask about scale, the data model, and what breaks first. Do not supply the structure for them — an unprompted clarifying question about requirements is a signal worth waiting for.",
  rubric:
    "Weigh reasoning about tradeoffs over any single correct answer. Whether they established requirements before designing, and whether they can say what their design gives up, matters more than the components they named.",
  minTurns: 6,
  maxTurns: 9,
};

const PORTFOLIO: Stage = {
  id: "portfolio-review",
  label: "Portfolio review",
  summary: "Walk through the work and defend the decisions.",
  brief:
    "This is a portfolio review. Ask the candidate to walk through one piece of work end to end, and interrogate the decisions rather than the visuals — why this shape, what was tried and dropped, what the research actually said. Ask what they would change now.",
  rubric:
    "Weigh whether decisions were justified with evidence rather than taste, and whether the candidate can separate what they made from what it achieved.",
  minTurns: 5,
  maxTurns: 8,
};

const CASE_STUDY: Stage = {
  id: "case-study",
  label: "Case study",
  summary: "A messy question and real data. Show the reasoning.",
  brief:
    "This is a case study round. Give the candidate an open, under-specified question about data — a metric that moved, a result that looks wrong — and make them reason out loud. Ask what they would check first and what would change their mind.",
  rubric:
    "Weigh the reasoning path over the conclusion. Whether they questioned the data, named their assumptions, and said what the numbers do not support matters more than arriving at the answer you had in mind.",
  minTurns: 5,
  maxTurns: 8,
};

const PEOPLE: Stage = {
  id: "people-management",
  label: "People and delivery",
  summary: "The conversation you avoided, and what shipping cost.",
  brief:
    "This is a management round. Ask about the people side: a performance conversation they handled badly, how they protected a team under a deadline, what they cut and who they told. Press for what they said out loud, not what they intended.",
  rubric:
    "Weigh candour and specificity about difficult conversations. A manager who cannot describe a decision that went wrong has either not made enough of them or is not telling you.",
  minTurns: 5,
  maxTurns: 8,
};

/**
 * Which rounds each role can sit.
 *
 * Behavioural is on every list because every process has one. The rest follow
 * the job: a designer defends a portfolio, an analyst reasons through a case,
 * a manager answers for a team. Offering an engineer's system design round to
 * a designer is what this map exists to stop.
 */
const BY_ROLE: Record<string, Stage[]> = {
  "product-designer": [BEHAVIORAL, PORTFOLIO, DEEP_DIVE],
  "backend-engineer": [BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN],
  "frontend-engineer": [BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN],
  "growth-pm": [BEHAVIORAL, CASE_STUDY, DEEP_DIVE],
  "data-analyst": [BEHAVIORAL, CASE_STUDY, DEEP_DIVE],
  "engineering-manager": [BEHAVIORAL, PEOPLE, SYSTEM_DESIGN],
};

/** Every stage that exists, deduplicated, for lookup by id or label. */
export const STAGES: Stage[] = [
  BEHAVIORAL,
  DEEP_DIVE,
  SYSTEM_DESIGN,
  PORTFOLIO,
  CASE_STUDY,
  PEOPLE,
];

const BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));
const BY_LABEL = new Map(STAGES.map((stage) => [stage.label.toLowerCase(), stage]));

/** The rounds offered for a role. Falls back to the common set. */
export function stagesFor(role: string | null | undefined): Stage[] {
  const resolved = findRole(role);
  return (resolved && BY_ROLE[resolved.id]) ?? [BEHAVIORAL, DEEP_DIVE];
}

/**
 * Resolves whatever the client sent, or falls back to behavioural.
 *
 * Deliberately not an error. An unknown stage means a stale client or a role
 * that no longer offers that round, and refusing to interview someone over it
 * would be a worse answer than running the round everybody has.
 */
export function findStage(value: string | null | undefined): Stage {
  if (!value) return BEHAVIORAL;
  const key = value.trim();
  return BY_ID.get(key) ?? BY_LABEL.get(key.toLowerCase()) ?? BEHAVIORAL;
}

/**
 * The stage a role will actually run, given what was asked for.
 *
 * A request for a round this role does not sit is honoured as far as it can
 * be — by falling back to behavioural, which every role has — rather than by
 * running an interview the picker would never have offered.
 */
export function resolveStage(role: string | null | undefined, stage: string | null | undefined): Stage {
  const wanted = findStage(stage);
  return stagesFor(role).some((entry) => entry.id === wanted.id) ? wanted : BEHAVIORAL;
}

/** The catalogue payload: which rounds go with which role. */
export function stageCatalogue(): { roleId: string; stages: Stage[] }[] {
  return ROLES.map((role) => ({ roleId: role.id, stages: stagesFor(role.id) }));
}
