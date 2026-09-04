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
  /**
   * The job titles that actually run this round.
   *
   * A recruiter screen is not done by a principal architect and a system
   * design round is not done by the talent partner. Without this the picker
   * offered all six interviewers for every round — the same convincing-and-
   * wrong failure the per-role stage list already fixed once.
   */
  titles: string[];
}

const ENGINEERING_LEADS = ["Engineering Manager", "Director of Engineering"];
const SENIOR_IC = ["Principal Architect"];
const PRODUCT = ["Head of Product"];
const RECRUITING = ["Talent Partner"];
const EXEC = ["Co-founder", "Director of Engineering"];

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
  titles: [...ENGINEERING_LEADS, ...PRODUCT],
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
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
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
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
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
  titles: [...PRODUCT, ...ENGINEERING_LEADS],
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
  titles: [...PRODUCT, ...ENGINEERING_LEADS],
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
  titles: [...EXEC, "Engineering Manager"],
};

/**
 * The first call, and the one people most often walk into unprepared.
 *
 * Kept separate from Behavioral because they are different conversations that
 * get conflated: a screen is a recruiter checking that the basics line up,
 * not a hiring manager interrogating your past in STAR format. Practising the
 * wrong one is the failure this whole stage list exists to prevent.
 */
const SCREEN: Stage = {
  id: "recruiter-screen",
  label: "Recruiter screen",
  summary: "The first call. Why you are looking, and whether the basics fit.",
  brief:
    "This is a recruiter screen, not a technical interview. You are checking that the basics line up: why they are looking, what they want next, whether their experience matches the level, notice period and expectations. Keep it brisk and friendly, do not go deep on any one project, and do not ask them to design or debug anything.",
  rubric:
    "Weigh clarity and concision. A screen is the first impression of how someone communicates under no pressure at all — a rambling answer to 'why are you looking' costs more here than an imperfect technical detail would.",
  minTurns: 4,
  maxTurns: 6,
  titles: RECRUITING,
};

/**
 * Values, asked by someone outside the team.
 *
 * Deliberately not the hiring manager: the point of this round at companies
 * that run it properly is that the person asking is not the one in a hurry to
 * fill the seat.
 */
const VALUES: Stage = {
  id: "values",
  label: "Values and culture",
  summary: "How you work with people, judged against what the company says it is.",
  brief:
    "This is a values round. Ask how the candidate works with other people — disagreement, a decision they were overruled on, what they do when the plan is wrong and it is not their call. Hold the answers against this company's stated values rather than your own preference, and ask for the specific occasion rather than the general policy.",
  rubric:
    "Weigh whether the candidate described what they actually did rather than what they believe. Stated values are cheap; a concrete occasion where the value cost them something is the evidence.",
  minTurns: 5,
  maxTurns: 7,
  titles: [...RECRUITING, ...EXEC],
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
  "product-designer": [SCREEN, BEHAVIORAL, PORTFOLIO, DEEP_DIVE, VALUES],
  "backend-engineer": [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES],
  "frontend-engineer": [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES],
  "growth-pm": [SCREEN, BEHAVIORAL, CASE_STUDY, DEEP_DIVE, VALUES],
  "data-analyst": [SCREEN, BEHAVIORAL, CASE_STUDY, DEEP_DIVE, VALUES],
  "engineering-manager": [SCREEN, BEHAVIORAL, PEOPLE, SYSTEM_DESIGN, VALUES],
};

/** Every stage that exists, deduplicated, for lookup by id or label. */
export const STAGES: Stage[] = [
  SCREEN,
  BEHAVIORAL,
  DEEP_DIVE,
  SYSTEM_DESIGN,
  PORTFOLIO,
  CASE_STUDY,
  PEOPLE,
  VALUES,
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

/**
 * The most rounds one session will run.
 *
 * Real interviews do combine — a screen that drifts into behavioural, a
 * technical that closes on values — which is why this is not one. It is also
 * not five: an hour split four ways is four shallow conversations, and the
 * candidate learns nothing about any of them.
 */
export const MAX_COMBINED = 3;

/**
 * The rounds a session will actually run, in order.
 *
 * Order matters and is the caller's: an interview that opens on values and
 * ends on a screen is not a thing that happens. Anything the role does not
 * sit is dropped rather than substituted, and an empty result falls back to
 * behavioural — the round every role has.
 */
export function resolveStages(
  role: string | null | undefined,
  wanted: readonly (string | null | undefined)[] | string | null | undefined,
): Stage[] {
  const requested = typeof wanted === "string" ? [wanted] : (wanted ?? []);
  const allowed = stagesFor(role);
  const out: Stage[] = [];
  for (const entry of requested) {
    const stage = findStage(entry);
    if (!allowed.some((a) => a.id === stage.id)) continue;
    if (out.some((existing) => existing.id === stage.id)) continue;
    out.push(stage);
    if (out.length === MAX_COMBINED) break;
  }
  return out.length > 0 ? out : [findStage("behavioral")];
}

/**
 * How long a combined session runs.
 *
 * Not the sum: two rounds back to back at full length is a forty-minute
 * interview nobody finishes. The longest round sets the base and each
 * additional one buys a few turns, capped — past about a dozen turns the
 * model starts repeating itself whatever the brief says.
 */
export function turnBudget(stages: Stage[]): { minTurns: number; maxTurns: number } {
  const longest = Math.max(...stages.map((s) => s.maxTurns));
  const maxTurns = Math.min(12, longest + (stages.length - 1) * 2);
  const minTurns = Math.min(maxTurns, Math.max(...stages.map((s) => s.minTurns)));
  return { minTurns, maxTurns };
}

/**
 * How the turns are split between rounds, longest first by weight.
 *
 * Returned rather than left to the model because "cover both" without a
 * budget produces one round and a polite question about the other.
 */
export function turnSplit(stages: Stage[], maxTurns: number): number[] {
  if (stages.length === 1) return [maxTurns];
  const weights = stages.map((s) => s.maxTurns);
  const total = weights.reduce((sum, w) => sum + w, 0);
  const shares = weights.map((w) => Math.max(2, Math.round((w / total) * maxTurns)));
  // Rounding can overshoot; trim from the largest until it fits.
  let over = shares.reduce((sum, n) => sum + n, 0) - maxTurns;
  while (over > 0) {
    const biggest = shares.indexOf(Math.max(...shares));
    const current = shares[biggest];
    if (current === undefined || current <= 2) break;
    shares[biggest] = current - 1;
    over -= 1;
  }
  return shares;
}

/**
 * The Phase 1 brief for one or several rounds.
 *
 * The instruction not to announce the change is the load-bearing part. Told
 * to cover two things, a model will say "now I would like to move on to the
 * culture portion", which is not what an interviewer sounds like.
 */
export function composeBrief(stages: Stage[], maxTurns: number): string {
  if (stages.length === 1) return stages[0]!.brief;

  const split = turnSplit(stages, maxTurns);
  const parts = stages.map((stage, index) => {
    const turns = split[index] ?? 2;
    const when =
      index === 0
        ? `First, for roughly ${turns} of your turns`
        : index === stages.length - 1
          ? "Then, for the rest of the interview"
          : `Then, for roughly ${turns} turns`;
    return `${when}: ${stage.brief}`;
  });

  return [
    `This interview covers ${stages.length} things, in this order.`,
    ...parts,
    "Move between them without announcing it. A real interviewer changes subject; they do not read out an agenda.",
  ].join("\n\n");
}

/** The Phase 2 rubric for one or several rounds. */
export function composeRubric(stages: Stage[]): string {
  if (stages.length === 1) return stages[0]!.rubric;
  return [
    `This interview covered ${stages.length} rounds. Weigh each against its own bar rather than averaging them into one impression.`,
    ...stages.map((stage) => `${stage.label}: ${stage.rubric}`),
  ].join("\n");
}

/**
 * The job titles that could credibly run this combination.
 *
 * Prefers someone who covers every round. When no single title does — a
 * recruiter screen and a system design round in one sitting — it casts for
 * the round that opens the interview, which is the one the candidate meets
 * first and the one the interviewer has to be plausible in.
 */
export function titlesFor(stages: Stage[]): string[] {
  const shared = stages.reduce<string[]>(
    (kept, stage) => kept.filter((title) => stage.titles.includes(title)),
    [...(stages[0]?.titles ?? [])],
  );
  return shared.length > 0 ? shared : [...(stages[0]?.titles ?? [])];
}

/** The catalogue payload: which rounds go with which role. */
export function stageCatalogue(): { roleId: string; stages: Stage[] }[] {
  return ROLES.map((role) => ({ roleId: role.id, stages: stagesFor(role.id) }));
}
