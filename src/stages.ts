import { ROLES, findRole } from "./roles.js";
import type { AreaId } from "./roles.js";

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

/**
 * Where a scene sits in someone's working life.
 *
 *   prepare  getting hired: screens, interviews, the offer call. Free.
 *   work     the job itself, in English: stand-ups, clients, bad news. Paid.
 *   grow     moving up: reviews, raises, the next level. Paid.
 *
 * The product used to end at the interview, and so did the reason to keep
 * paying. The two later phases are what someone needs every week once they
 * have the job — which is when a subscription makes sense.
 */
export type Phase = "prepare" | "work" | "grow";

export interface Stage {
  id: string;
  /** Absent means "prepare": every round written before phases existed. */
  phase?: Phase;
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
  /**
   * Rounds that cannot be combined with another.
   *
   * The stage picker lets you sit three rounds back to back because real loops
   * work that way. The stand-up is not a round of a loop — it is a different
   * event on a different day — and stapling it to a recruiter screen produces
   * an interview that could not happen, which is the one thing this product
   * cannot afford to rehearse.
   */
  solo?: boolean;
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
/**
 * The offer call, which is the one nobody rehearses.
 *
 * The gap this closes is specific to the audience: a candidate who just spent
 * six rounds proving they are worth hiring accepts the first number said out
 * loud, in a second language, against someone who does this weekly. The
 * English of negotiating — declining without refusing, naming a figure without
 * apologising for it, asking what else moves — is a different register from
 * anything else in this product, and it is worth more per sentence than any
 * other round here.
 *
 * The interviewer opens low on purpose. That is the whole exercise: an offer
 * that is fine but not good is harder to push back on than an insulting one.
 */
const NEGOTIATION: Stage = {
  id: "salary-negotiation",
  label: "Salary negotiation",
  summary: "The offer call. They open low, and you have to move it.",
  brief:
    "You are making an offer, and you open below what the role is budgeted for — a number that is defensible rather than insulting, because a candidate finds it much harder to push back on 'fine' than on 'insulting'. Say the number early and plainly, then stop talking. When they push back, do not concede immediately: ask what is driving it, mention that the band has a range, and make them name a figure rather than naming it for them. Concede on one lever if they negotiate well — a signing bonus, equity, a review at six months — and hold the base unless they give you a reason tied to market or to a competing offer. Stay warm throughout: this is the call where the company is selling too, and an interviewer who turns cold here is not what a real one does.",
  rubric:
    "This round is about register, not correctness. Weigh whether they declined the first number without refusing it, whether they named a figure or waited to be given one, whether they asked about levers beyond base pay, and whether any of it sounded aggressive or apologetic rather than matter-of-fact. Accepting the opening offer is the failure this round exists to catch, however politely it was done. Note the exact phrases that landed and the ones that undercut them — 'I was hoping for maybe' costs a candidate real money and they will not hear it themselves.",
  minTurns: 5,
  maxTurns: 7,
  titles: RECRUITING,
};

/**
 * The daily stand-up, in sixty seconds.
 *
 * The only round here that is not about getting hired. Remote work in English
 * is mostly short async updates, and the fear of recording one is a different
 * fear from interview nerves — lower stakes, far more often, and nobody
 * practises it because there is no event to practise for.
 *
 * Deliberately short. A stand-up that runs long is the failure being trained
 * out, so a round that allows a long answer would be teaching the wrong thing.
 */
const STANDUP: Stage = {
  id: "async-standup",
  label: "Async stand-up",
  summary: "Sixty seconds: what you did, what you are doing, what is blocking you.",
  brief:
    "You are their teammate on a distributed team, reading their stand-up. Ask for it once — yesterday, today, blockers — and then react the way a colleague would: pick up on the blocker, ask who owns it, or say that is fine and move on. Keep your own turns to a sentence. Do not interview them, do not ask about their background, and do not let this become a conversation about their career. If an update runs past about sixty seconds' worth of speech, say so plainly the way a teammate would: that a stand-up this long is one people stop reading.",
  rubric:
    "Concision is the whole thing. Weigh whether the update could be understood by someone skimming it in Slack: did it lead with what changed, name the blocker plainly, and stop. Hedging and preamble cost more here than anywhere else in this product — 'so basically I was kind of working on' is three seconds of a sixty-second budget. Length is a finding, not a footnote: say how long the update ran and what would have been cut.",
  minTurns: 3,
  maxTurns: 4,
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
  solo: true,
  phase: "work",
};

/*
 * ---------------------------------------------------------------------------
 * At work and growing: the conversations after the offer.
 *
 * Every one is solo — it is its own event, not a round of a loop — and every
 * brief says who the other person is, because the persona's title alone
 * ("Head of Product") does not say whether they are your client, your
 * manager or your teammate today.
 * ------------------------------------------------------------------------ */

const CLIENT_CALL: Stage = {
  id: "client-call",
  phase: "work",
  label: "Client status call",
  summary: "The client wants an update — and a little more than was agreed.",
  brief:
    "You are the client: the product owner at a company that hired the candidate's team. Open by asking where the project stands. Then, once they have given an update, ask for one extra thing 'small' that was never in scope, with the same deadline. React the way a real client does: pleased by clear dates, uneasy at vagueness, and you push once more if they agree too easily or refuse too bluntly. You are not hostile; you are busy and you want to know what you will get and when.",
  rubric:
    "Weigh whether the update was clear and concrete (what is done, what is next, when), and whether they handled the extra request without either caving or stonewalling: naming the trade-off, offering options, confirming in writing. Note phrases that sounded unsure or over-apologetic to a client.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT, ...EXEC],
  solo: true,
};

const DEADLINE_SLIP: Stage = {
  id: "deadline-slip",
  phase: "work",
  label: "Telling your manager it will be late",
  summary: "The deadline is Friday and it will not make it. Say so.",
  brief:
    "You are the candidate's manager. Open with a quick, friendly check-in on the feature due this Friday. The candidate has to tell you it will be late. Ask why, ask what the new date is, and ask what could be cut to make Friday. If they are vague, ask for a number. If they are clear and propose options, accept one and close. Stay calm and practical — a good manager wants the news early, not softened.",
  rubric:
    "Weigh whether they said the news early and plainly rather than burying it, gave a reason without excuses, proposed a new date and options (cut scope, add help), and owned it without over-apologising. Phrases like 'I think maybe it could possibly' are the finding here.",
  minTurns: 3,
  maxTurns: 5,
  titles: [...ENGINEERING_LEADS, ...PRODUCT],
  solo: true,
};

const INCIDENT: Stage = {
  id: "incident-explanation",
  phase: "work",
  label: "Explaining a bug to a non-technical stakeholder",
  summary: "Something broke in production. Explain it so they understand.",
  brief:
    "You are a senior stakeholder from the business side, not technical. Something the candidate's team owns broke in production yesterday and customers noticed. Ask them what happened, in plain words. When they use jargon, ask what it means. Then ask whether it will happen again and what they are doing about it. You are worried but fair.",
  rubric:
    "Weigh clarity for a non-technical listener: what happened, the impact, the cause in one plain sentence, the fix and how it will not recur. Jargon left unexplained, blame on others, and long technical detail before the impact are the findings here.",
  minTurns: 3,
  maxTurns: 5,
  titles: [...PRODUCT, ...EXEC],
  solo: true,
};

const DEMO: Stage = {
  id: "sprint-demo",
  phase: "work",
  label: "Sprint demo",
  summary: "Show what you shipped this sprint and take the questions.",
  brief:
    "You are a stakeholder at the end-of-sprint demo. Ask the candidate to walk you through what they shipped. Then ask one question about why it matters to users, one about a limitation, and one 'can it also do X?' that it cannot. React like a busy stakeholder: interested in outcomes, impatient with implementation detail.",
  rubric:
    "Weigh whether they led with the outcome for users rather than the implementation, kept it short, answered the limitation honestly, and said no to the out-of-scope request without sounding defensive.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT, ...EXEC],
  solo: true,
};

const CLARIFY: Stage = {
  id: "clarify-requirements",
  phase: "work",
  label: "Clarifying a vague request",
  summary: "The request is unclear. Ask the questions before you build it.",
  brief:
    "You are a product manager handing the candidate a new request in one vague sentence (for example, 'we need a dashboard for the sales team, can you have something by next week?'). Answer their questions briefly and only what they ask — do not volunteer details. If they start agreeing without asking anything, let them, then ask 'so what will you build?'. Close when the scope is clear.",
  rubric:
    "Weigh whether they asked the questions that matter (who, what decision it supports, what done means, deadline and priority) before committing, summarised the agreement back, and pushed back politely on an unrealistic date.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT],
  solo: true,
};

const REVIEW: Stage = {
  id: "performance-review",
  phase: "grow",
  label: "Performance review",
  summary: "Your manager gives mixed feedback. Talk about your year.",
  brief:
    "You are the candidate's manager in their yearly performance review. Open by asking how they think the year went. Then give one piece of genuine praise and one piece of critical feedback that is partly fair and partly not. See whether they can name their achievements with evidence and respond to the criticism without getting defensive or simply agreeing. End by asking what they want to focus on next year.",
  rubric:
    "Weigh whether they described their impact with concrete results, accepted the fair part of the criticism, disagreed with the unfair part calmly and with evidence, and stated what they want next. Over-agreeing is as much a finding as defensiveness.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...ENGINEERING_LEADS],
  solo: true,
};

const RAISE: Stage = {
  id: "ask-for-raise",
  phase: "grow",
  label: "Asking for a raise",
  summary: "Make the case for more pay. The budget is tight.",
  brief:
    "You are the candidate's manager. They asked for this one-on-one; let them raise the topic. When they ask for a raise, say budgets are tight this cycle. Ask what they think justifies it and what number they have in mind. If they argue well with impact and market data, offer something partial (a smaller raise now, a review in three months, or a title change). If they ask vaguely, stay vague too.",
  rubric:
    "Weigh whether they asked clearly, backed it with impact and market references, named a figure, handled 'the budget is tight' without retreating, and agreed a concrete next step with a date. Apologetic or hedged asks cost real money and are the main finding.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...ENGINEERING_LEADS, ...EXEC],
  solo: true,
};

const CAREER: Stage = {
  id: "career-conversation",
  phase: "grow",
  label: "Career conversation",
  summary: "Ask your manager what it takes to reach the next level.",
  brief:
    "You are the candidate's manager in a career one-on-one. Let them lead. When they ask about promotion, explain that the next level requires scope beyond their own work — leading something, influencing others — and ask what they have done in that direction. Help them leave with a concrete plan if they ask good questions; stay general if they do not.",
  rubric:
    "Weigh whether they stated a clear goal, asked specific questions about expectations, gave examples of work beyond their scope, and closed with agreed next steps and a check-in date.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...ENGINEERING_LEADS],
  solo: true,
};

/** Every scene after the offer, for lookup. */
const AFTER_THE_OFFER: Stage[] = [CLIENT_CALL, DEADLINE_SLIP, INCIDENT, DEMO, CLARIFY, REVIEW, RAISE, CAREER];

/* Scenes that belong to one kind of work. A developer's week is code reviews
 * and outages; a designer's is critiques and handoffs; a PM's is saying no.
 * Generic scenes (a client call, a demo) cannot rehearse those, and a list
 * that offered the same nine to everyone read as a list nobody had thought
 * about. */

const CODE_REVIEW: Stage = {
  id: "code-review",
  phase: "work",
  label: "Defending your pull request",
  summary: "A senior engineer questions your PR. Explain and defend it — or agree.",
  brief:
    "You are a senior engineer reviewing the candidate's pull request. Open by saying you left a few comments and asking them to walk you through the approach. Then challenge one design choice (naming, a missing test, a simpler alternative, a performance worry). Accept good reasoning; push again on hand-waving. You are collegial, not hostile.",
  rubric:
    "Weigh whether they explained the change and its trade-offs clearly, accepted valid points without over-apologising, defended reasonable choices with reasons, and proposed concrete follow-ups. Vague phrases ('it's fine', 'I think it works') are the finding here.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
  solo: true,
};

const ON_CALL: Stage = {
  id: "on-call-incident",
  phase: "work",
  label: "Production is down (on call)",
  summary: "You are on call and the service is failing. Give updates under pressure.",
  brief:
    "You are the incident lead on a live call. The candidate is the engineer on call for the service that is failing right now. Ask for status, what they have checked, the impact, and the next step with a time estimate. Interrupt once with pressure from above ('leadership is asking for an ETA'). Keep it fast and short, like a real incident bridge.",
  rubric:
    "Weigh short, structured updates under pressure: what is known, what is not, impact, next action and when the next update comes. Rambling, guessing without saying so, and missing an ETA are the findings.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...ENGINEERING_LEADS],
  solo: true,
};

const ESTIMATE: Stage = {
  id: "estimate-pushback",
  phase: "work",
  label: "Estimating a task",
  summary: "The PM wants it in three days. You think it is ten. Negotiate.",
  brief:
    "You are the product manager. Ask the candidate how long a new feature will take. Whatever they say, push for something shorter ('can we do it in three days?'). If they explain the risks and offer options (a smaller version, a date range), accept the best option. If they cave, accept their unrealistic date cheerfully.",
  rubric:
    "Weigh whether they gave a range with assumptions, explained what drives the estimate, held a realistic number under pressure, and offered scope options instead of simply agreeing.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT],
  solo: true,
};

const QA_RELEASE: Stage = {
  id: "release-blocker",
  phase: "work",
  label: "A critical bug before release",
  summary: "You found a serious bug and the release is today. Hold the line.",
  brief:
    "You are the product manager who wants to ship today. The candidate (QA) found a bug they consider critical. Ask how bad it really is, whether it can ship with a known issue, and what the risk is for users. Push to ship. Accept a delay only if they explain impact, reproduction and options clearly.",
  rubric:
    "Weigh whether they explained severity in terms of user impact, gave clear reproduction steps, proposed options (fix, feature flag, ship with mitigation) and held their position calmly without sounding alarmist.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT, ...ENGINEERING_LEADS],
  solo: true,
};

const QA_REPRO: Stage = {
  id: "cannot-reproduce",
  phase: "work",
  label: "'I can't reproduce it'",
  summary: "A developer says your bug does not exist. Convince them.",
  brief:
    "You are the developer assigned the candidate's bug report, and you cannot reproduce it. Say so, a little sceptically. Ask about environment, steps, data and frequency. Accept it once the report is precise; stay sceptical while it is vague.",
  rubric:
    "Weigh precise, ordered reproduction steps, environment and data details, expected versus actual behaviour, and a collaborative tone rather than a defensive one.",
  minTurns: 3,
  maxTurns: 5,
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
  solo: true,
};

const DESIGN_CRIT: Stage = {
  id: "design-critique",
  phase: "work",
  label: "Design critique",
  summary: "Present your design to the team and take hard feedback.",
  brief:
    "You are the head of design in a critique. Ask the candidate to walk you through their design and the problem it solves. Then give two pieces of feedback: one you are right about, one that is a matter of taste. See whether they explain decisions with user evidence, accept what is right and defend what they can justify.",
  rubric:
    "Weigh whether they framed the problem before the solution, tied decisions to users or data, received feedback without getting defensive, and pushed back on taste-based feedback with reasons.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT],
  solo: true,
};

const DEV_HANDOFF: Stage = {
  id: "dev-handoff",
  phase: "work",
  label: "Handoff to engineering",
  summary: "A developer says your design is too hard to build. Find a way.",
  brief:
    "You are the engineer implementing the candidate's design. Say that one part (an animation, a custom component, an edge case) will take far too long. Ask what really matters in it. Accept a simpler version if they explain the intent and agree on what can change.",
  rubric:
    "Weigh whether they explained the intent behind the design, separated must-haves from nice-to-haves, proposed alternatives and agreed next steps clearly.",
  minTurns: 3,
  maxTurns: 5,
  titles: [...SENIOR_IC, ...ENGINEERING_LEADS],
  solo: true,
};

const STAKEHOLDER_DESIGN: Stage = {
  id: "stakeholder-change",
  phase: "work",
  label: "A stakeholder wants a change you disagree with",
  summary: "'Make the logo bigger.' Push back with reasons, not taste.",
  brief:
    "You are a senior stakeholder from marketing. You want a change to the candidate's design that you are sure about (bigger branding, more content, a different colour). Insist politely. Back down only if they explain the user impact and offer an alternative that meets your goal.",
  rubric:
    "Weigh whether they asked what goal is behind the request, explained the impact on users, offered an alternative that serves the stakeholder's goal, and stayed collaborative.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...EXEC],
  solo: true,
};

const PRIORITIZATION: Stage = {
  id: "prioritization",
  phase: "work",
  label: "Saying no to a stakeholder",
  summary: "Sales wants their feature next sprint. It is not the priority.",
  brief:
    "You are a sales leader. A big customer wants a feature and you need it next sprint. Push hard and mention the deal size. The candidate is the product manager and must say no or not now. Accept their position only if they explain the priorities, the trade-off and an alternative (a workaround, a date).",
  rubric:
    "Weigh whether they acknowledged the request, explained priorities with reasons, said no clearly without hiding behind process, and offered a concrete alternative.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...EXEC],
  solo: true,
};

const USER_INTERVIEW: Stage = {
  id: "user-interview",
  phase: "work",
  label: "Interviewing a user",
  summary: "Run a short customer interview. Ask, do not sell.",
  brief:
    "You are a user of the candidate's product, a busy professional who agreed to a 15-minute call. Answer their questions honestly and briefly. If they ask leading questions or pitch features, give polite, less useful answers. If they ask open questions about your work and problems, give rich detail.",
  rubric:
    "Weigh open, non-leading questions, follow-ups on what the user said, avoiding pitching, and a summary of what they learned at the end.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT],
  solo: true,
};

const EXPLAIN_ANALYSIS: Stage = {
  id: "explain-analysis",
  phase: "work",
  label: "Explaining your analysis to business",
  summary: "Present your findings to a manager who does not read charts.",
  brief:
    "You are a business manager with no statistics background. Ask the candidate what they found in their analysis. Ask what it means for you, what you should do, and how sure they are. When they use technical terms (p-value, regression, cohort), ask what that means.",
  rubric:
    "Weigh whether they led with the answer and the recommendation, explained uncertainty in plain words, translated technical terms, and tied the finding to a decision.",
  minTurns: 4,
  maxTurns: 6,
  titles: [...PRODUCT, ...EXEC],
  solo: true,
};

const WRONG_NUMBER: Stage = {
  id: "wrong-number",
  phase: "work",
  label: "'Your dashboard is wrong'",
  summary: "A director says your number does not match theirs. Sort it out.",
  brief:
    "You are a director who sees a number in the candidate's dashboard that does not match the one in your own report, and you are annoyed. Ask why. Accept the explanation if they ask clarifying questions about definitions, explain how their number is calculated and propose how to reconcile them.",
  rubric:
    "Weigh calm, curious handling: clarifying definitions and time ranges, explaining the calculation simply, owning a real mistake if there is one, and proposing a next step.",
  minTurns: 3,
  maxTurns: 5,
  titles: [...EXEC],
  solo: true,
};

/** Scenes from the job itself, by area; areas without their own get the general set. */
const WORK_BY_AREA: Partial<Record<AreaId, Stage[]>> = {
  engineering: [CODE_REVIEW, ON_CALL, ESTIMATE, INCIDENT],
  design: [DESIGN_CRIT, DEV_HANDOFF, STAKEHOLDER_DESIGN],
  product: [PRIORITIZATION, USER_INTERVIEW, ESTIMATE],
  data: [EXPLAIN_ANALYSIS, WRONG_NUMBER, CLARIFY],
};

/** Roles whose working week differs from their area's. */
const WORK_BY_ROLE: Record<string, Stage[]> = {
  "qa-engineer": [QA_RELEASE, QA_REPRO, ESTIMATE],
};

const GENERAL_WORK: Stage[] = [CLIENT_CALL, INCIDENT];
const SHARED_WORK: Stage[] = [DEADLINE_SLIP, CLARIFY, DEMO];
const GROW_SCENES: Stage[] = [REVIEW, RAISE, CAREER];

/** The scenes after the offer for one role: its own work, the shared ones, growing. */
function afterTheOffer(roleId: string | null, area: AreaId | null): Stage[] {
  const own = (roleId && WORK_BY_ROLE[roleId]) || (area && WORK_BY_AREA[area]) || GENERAL_WORK;
  const seen = new Set<string>();
  return [...own, ...SHARED_WORK, ...GROW_SCENES].filter((stage) => {
    if (seen.has(stage.id)) return false;
    seen.add(stage.id);
    return true;
  });
}

/**
 * The job itself, as a problem to work through.
 *
 * Every other skill-specific round here was written for one kind of work —
 * a system to design, a portfolio to defend, a dataset to question. A
 * paralegal, an account executive or a finance manager had none of them, so
 * their only rounds were the ones every role shares, and the part of their
 * interview that actually tests the job had nothing to rehearse against.
 *
 * Generic in the brief on purpose: the interviewer already has the role, the
 * company and the industry, and is far better at choosing a realistic
 * situation for a compliance analyst from those than a list written here.
 */
const ROLE_CASE: Stage = {
  id: "role-case",
  label: "Role case",
  summary: "A real problem from the job, worked through out loud.",
  brief:
    "This is a case round built from the job itself. Give the candidate one realistic situation they would meet in their first months in this role — a forecast that missed, a clause a client refuses to sign, a campaign that underperformed, an upset customer, a process that keeps breaking — and have them work through it out loud. For a customer-facing role, play the customer or the counterpart in character for part of it. Follow up on the step they skipped, and ask what they would do if their first move did not work.",
  rubric:
    "Weigh judgement and reasoning over domain trivia. Whether they clarified the situation before acting, named the risk and who they would involve, and could explain their call plainly to someone outside their function matters more than reaching the answer you had in mind.",
  minTurns: 5,
  maxTurns: 8,
  titles: [...ENGINEERING_LEADS, ...SENIOR_IC],
};

/**
 * The rounds an area sits, for any role in it without its own list.
 *
 * Screen, behavioural, values, the offer call and the stand-up are on every
 * list, as before. What changes is the middle: the round that tests the work.
 */
const BY_AREA: Record<AreaId, Stage[]> = {
  engineering: [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES, NEGOTIATION, STANDUP],
  product: [SCREEN, BEHAVIORAL, ROLE_CASE, CASE_STUDY, VALUES, NEGOTIATION, STANDUP],
  design: [SCREEN, BEHAVIORAL, PORTFOLIO, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  data: [SCREEN, BEHAVIORAL, CASE_STUDY, DEEP_DIVE, VALUES, NEGOTIATION, STANDUP],
  growth: [SCREEN, BEHAVIORAL, CASE_STUDY, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  marketing: [SCREEN, BEHAVIORAL, PORTFOLIO, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  finance: [SCREEN, BEHAVIORAL, ROLE_CASE, CASE_STUDY, VALUES, NEGOTIATION, STANDUP],
  legal: [SCREEN, BEHAVIORAL, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  people: [SCREEN, BEHAVIORAL, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  sales: [SCREEN, BEHAVIORAL, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  "customer-success": [SCREEN, BEHAVIORAL, ROLE_CASE, VALUES, NEGOTIATION, STANDUP],
  operations: [SCREEN, BEHAVIORAL, ROLE_CASE, CASE_STUDY, VALUES, NEGOTIATION, STANDUP],
};

/** Roles whose rounds differ from their area's. The original six keep theirs exactly. */
const BY_ROLE: Record<string, Stage[]> = {
  "product-designer": [SCREEN, BEHAVIORAL, PORTFOLIO, DEEP_DIVE, VALUES, NEGOTIATION, STANDUP],
  "backend-engineer": [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES, NEGOTIATION, STANDUP],
  "frontend-engineer": [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES, NEGOTIATION, STANDUP],
  "growth-pm": [SCREEN, BEHAVIORAL, CASE_STUDY, DEEP_DIVE, VALUES, NEGOTIATION, STANDUP],
  "data-analyst": [SCREEN, BEHAVIORAL, CASE_STUDY, DEEP_DIVE, VALUES, NEGOTIATION, STANDUP],
  "engineering-manager": [SCREEN, BEHAVIORAL, PEOPLE, SYSTEM_DESIGN, VALUES, NEGOTIATION, STANDUP],
  // A pipeline is a system, and the round that tests it is the engineers' one.
  "data-engineer": [SCREEN, BEHAVIORAL, DEEP_DIVE, SYSTEM_DESIGN, VALUES, NEGOTIATION, STANDUP],
  // Managers of people sit the people round, in whatever function.
  "finance-manager": [SCREEN, BEHAVIORAL, ROLE_CASE, PEOPLE, VALUES, NEGOTIATION, STANDUP],
  "operations-manager": [SCREEN, BEHAVIORAL, ROLE_CASE, PEOPLE, VALUES, NEGOTIATION, STANDUP],
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
  ROLE_CASE,
  VALUES,
  NEGOTIATION,
  STANDUP,
  ...AFTER_THE_OFFER,
  CODE_REVIEW,
  ON_CALL,
  ESTIMATE,
  QA_RELEASE,
  QA_REPRO,
  DESIGN_CRIT,
  DEV_HANDOFF,
  STAKEHOLDER_DESIGN,
  PRIORITIZATION,
  USER_INTERVIEW,
  EXPLAIN_ANALYSIS,
  WRONG_NUMBER,
];

const BY_ID = new Map(STAGES.map((stage) => [stage.id, stage]));
const BY_LABEL = new Map(STAGES.map((stage) => [stage.label.toLowerCase(), stage]));

/** The rounds offered for a role. Falls back to the common set. */
export function stagesFor(role: string | null | undefined): Stage[] {
  const resolved = findRole(role);
  if (!resolved) return [BEHAVIORAL, DEEP_DIVE, ...afterTheOffer(null, null)];
  return [...(BY_ROLE[resolved.id] ?? BY_AREA[resolved.area]), ...afterTheOffer(resolved.id, resolved.area)];
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
 *
 * A solo round wins the whole session and everything else is dropped. The
 * picker already enforces that, but the picker is not the boundary — this is
 * the only place a hand-written request goes through.
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
  const solo = out.find((entry) => entry.solo);
  if (solo) return [solo];
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
/**
 * A round as the picker needs to see it.
 *
 * Deliberately not `Stage`. The brief and the rubric are the interviewer's
 * instructions and the evaluator's scoring criteria, and for some rounds they
 * are the round: the negotiation brief says the opening number is low on
 * purpose, that the silence after it is a tactic, and that whoever names a
 * figure first loses. A candidate who reads that has not rehearsed negotiating,
 * they have sat an exam holding the answers. Shipping them to the browser to
 * populate a dropdown that only ever renders the label and the summary is a
 * trade with nothing on the near side.
 */
export interface PublicStage {
  id: string;
  label: string;
  summary: string;
  minTurns: number;
  maxTurns: number;
  titles: string[];
  solo?: boolean;
  phase: Phase;
}

/** Everything the browser is allowed to know about a round. */
export function publicStage(stage: Stage): PublicStage {
  const { brief: _brief, rubric: _rubric, ...rest } = stage;
  return { ...rest, phase: phaseOf(stage) };
}

export function stageCatalogue(): { roleId: string; stages: PublicStage[] }[] {
  return ROLES.map((role) => ({
    roleId: role.id,
    stages: stagesFor(role.id).map(publicStage),
  }));
}

/** The phase a stage belongs to; rounds written before phases are "prepare". */
export function phaseOf(stage: Stage): Phase {
  return stage.phase ?? "prepare";
}

/** Whether a session runs any scene past the interview — the paid part. */
export function isAfterTheOffer(stages: readonly Stage[]): boolean {
  return stages.some((stage) => phaseOf(stage) !== "prepare");
}
