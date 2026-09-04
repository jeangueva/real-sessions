import { describe, expect, it } from "vitest";
import { ROLES } from "../src/roles.js";
import {
  MAX_COMBINED,
  STAGES,
  composeBrief,
  composeRubric,
  findStage,
  resolveStage,
  resolveStages,
  stageCatalogue,
  stagesFor,
  titlesFor,
  turnBudget,
  turnSplit,
} from "../src/stages.js";
import { castFor, findPersona } from "../src/personas.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { buildEvaluatorPrompt } from "../src/prompts/evaluator.js";
import type { InterviewContext } from "../src/types.js";

/**
 * Which round a role can sit, and what the round changes.
 *
 * The bug this replaces was quiet: every role was offered the same three
 * rounds, so a product designer could pick "System design" and get a fluent,
 * convincing interview about something that round does not mean for them.
 * Convincing and wrong is worse than unavailable — nothing on screen said the
 * rehearsal was off-target.
 */

const context = (over: Partial<InterviewContext> = {}): InterviewContext => ({
  candidateName: "Mariana",
  targetRole: "Backend Engineer",
  companyName: "Stripe",
  companyCulture: "Rigour, ownership, evidence",
  industry: "Fintech",
  interviewStage: "System design",
  ...over,
});

describe("stagesFor", () => {
  it("gives every role a behavioural round", () => {
    // Every process has one, whatever the job.
    for (const role of ROLES) {
      expect(stagesFor(role.id).map((s) => s.id), role.id).toContain("behavioral");
    }
  });

  it("does not offer system design to a product designer", () => {
    const ids = stagesFor("product-designer").map((s) => s.id);
    expect(ids).not.toContain("system-design");
    expect(ids).toContain("portfolio-review");
  });

  it("does offer it to engineers", () => {
    expect(stagesFor("backend-engineer").map((s) => s.id)).toContain("system-design");
    expect(stagesFor("frontend-engineer").map((s) => s.id)).toContain("system-design");
  });

  it("gives an analyst a case study rather than a design round", () => {
    const ids = stagesFor("data-analyst").map((s) => s.id);
    expect(ids).toContain("case-study");
    expect(ids).not.toContain("system-design");
  });

  it("accepts a label as well as an id, because the client sends labels", () => {
    expect(stagesFor("Backend Engineer")).toEqual(stagesFor("backend-engineer"));
  });

  it("falls back to the common rounds for an unknown role", () => {
    // Free text reaches here from an old client. An empty picker would be a
    // worse answer than the two rounds everyone sits.
    const ids = stagesFor("Astronaut").map((s) => s.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain("behavioral");
  });
});

describe("resolveStage", () => {
  it("honours a round the role actually sits", () => {
    expect(resolveStage("backend-engineer", "System design").id).toBe("system-design");
  });

  it("falls back to behavioural when the role does not sit that round", () => {
    // A stale client, or a role changed after the stage was picked. Running
    // the round nobody offered would be the wrong kind of helpful.
    expect(resolveStage("product-designer", "System design").id).toBe("behavioral");
  });

  it("falls back rather than throwing on nonsense", () => {
    expect(resolveStage("backend-engineer", "Vibes round").id).toBe("behavioral");
    expect(resolveStage(null, null).id).toBe("behavioral");
  });
});

describe("the round changes the interview", () => {
  it("gives a design round more turns than a behavioural one", () => {
    // A design question is barely started at the point a behavioural one has
    // resolved. Running both to seven made one rushed and the other padded.
    const design = findStage("system-design");
    const behavioural = findStage("behavioral");
    expect(design.maxTurns).toBeGreaterThan(behavioural.maxTurns);
    expect(design.minTurns).toBeGreaterThanOrEqual(behavioural.minTurns);
  });

  it("puts the round's brief in the interviewer's prompt", () => {
    const design = buildInterviewerPrompt(context(), { personaId: "measured" });
    expect(design).toContain("This is a system design round");

    const behavioural = buildInterviewerPrompt(
      context({ interviewStage: "Behavioral" }),
      { personaId: "measured" },
    );
    expect(behavioural).toContain("behavioural round");
    expect(behavioural).not.toContain("This is a system design round");
  });

  it("puts the round's rubric in the evaluator's prompt", () => {
    // The same answer is strong in one round and thin in another, and the
    // evaluator had no way to know which one it was reading.
    const design = buildEvaluatorPrompt(context());
    expect(design).toContain("tradeoffs");

    const behavioural = buildEvaluatorPrompt(context({ interviewStage: "Behavioral" }));
    expect(behavioural).toContain("situation, action and result");
  });

  it("never leaves a placeholder in either prompt", () => {
    // renderTemplate throws on a missing variable, so this is really a guard
    // against a stage added without a brief or a rubric.
    for (const stage of STAGES) {
      const ctx = context({ interviewStage: stage.label, targetRole: "Backend Engineer" });
      expect(() => buildInterviewerPrompt(ctx, { personaId: "measured" })).not.toThrow();
      expect(() => buildEvaluatorPrompt(ctx)).not.toThrow();
    }
  });
});

describe("stageCatalogue", () => {
  it("covers every role the picker can show", () => {
    const catalogue = stageCatalogue();
    expect(catalogue).toHaveLength(ROLES.length);
    for (const entry of catalogue) {
      expect(entry.stages.length).toBeGreaterThan(1);
    }
  });
});

describe("combining rounds in one session", () => {
  it("keeps the caller's order", () => {
    // An interview that opens on values and ends on a screen is not a thing
    // that happens.
    const rounds = resolveStages("backend-engineer", ["recruiter-screen", "behavioral"]);
    expect(rounds.map((s) => s.id)).toEqual(["recruiter-screen", "behavioral"]);
  });

  it("drops a round the role does not sit rather than substituting one", () => {
    const rounds = resolveStages("product-designer", ["behavioral", "system-design"]);
    expect(rounds.map((s) => s.id)).toEqual(["behavioral"]);
  });

  it("ignores duplicates and caps the combination", () => {
    // An hour split four ways is four shallow conversations.
    const rounds = resolveStages("backend-engineer", [
      "behavioral",
      "behavioral",
      "technical-deep-dive",
      "system-design",
      "values",
    ]);
    expect(rounds).toHaveLength(MAX_COMBINED);
    expect(new Set(rounds.map((s) => s.id)).size).toBe(MAX_COMBINED);
  });

  it("falls back to behavioural when nothing survives", () => {
    expect(resolveStages("product-designer", ["system-design"]).map((s) => s.id)).toEqual([
      "behavioral",
    ]);
  });

  it("adds turns for a second round without simply summing them", () => {
    // Two rounds back to back at full length is an interview nobody finishes.
    const one = turnBudget(resolveStages("backend-engineer", ["system-design"]));
    const two = turnBudget(
      resolveStages("backend-engineer", ["system-design", "behavioral"]),
    );
    expect(two.maxTurns).toBeGreaterThan(one.maxTurns);
    expect(two.maxTurns).toBeLessThan(one.maxTurns + 7);
    expect(two.maxTurns).toBeLessThanOrEqual(12);
  });

  it("gives every round at least a couple of turns", () => {
    const rounds = resolveStages("backend-engineer", [
      "recruiter-screen",
      "behavioral",
      "system-design",
    ]);
    const split = turnSplit(rounds, turnBudget(rounds).maxTurns);
    expect(split).toHaveLength(3);
    for (const turns of split) expect(turns).toBeGreaterThanOrEqual(2);
    expect(split.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(
      turnBudget(rounds).maxTurns,
    );
  });

  it("tells the interviewer not to announce the change of subject", () => {
    // Told to cover two things, a model says "now I would like to move on to
    // the culture portion", which is not what an interviewer sounds like.
    const brief = composeBrief(
      resolveStages("backend-engineer", ["behavioral", "values"]),
      10,
    );
    expect(brief).toContain("without announcing it");
    expect(brief).toContain("behavioural round");
    expect(brief).toContain("values round");
  });

  it("gives the evaluator each round's own bar", () => {
    const rubric = composeRubric(
      resolveStages("backend-engineer", ["behavioral", "system-design"]),
    );
    expect(rubric).toContain("rather than averaging");
    expect(rubric).toContain("Behavioral:");
    expect(rubric).toContain("System design:");
  });

  it("leaves a single round's brief exactly as written", () => {
    const solo = resolveStages("backend-engineer", ["system-design"]);
    expect(composeBrief(solo, 9)).toBe(solo[0]!.brief);
    expect(composeRubric(solo)).toBe(solo[0]!.rubric);
  });
});

describe("who runs the round", () => {
  it("sends a recruiter to a screen and nobody else", () => {
    expect(titlesFor([findStage("recruiter-screen")])).toEqual(["Talent Partner"]);
  });

  it("keeps the recruiter out of a system design round", () => {
    expect(titlesFor([findStage("system-design")])).not.toContain("Talent Partner");
  });

  it("prefers someone who can run every round of a combination", () => {
    // Behavioural and values overlap on the director.
    const both = titlesFor([findStage("behavioral"), findStage("values")]);
    expect(both).toEqual(["Director of Engineering"]);
  });

  it("casts for the opening round when no one title covers all of them", () => {
    // A recruiter screen and a system design round in one sitting is not one
    // person's job. The candidate meets the opener first.
    const mixed = titlesFor([findStage("recruiter-screen"), findStage("system-design")]);
    expect(mixed).toEqual(["Talent Partner"]);
  });

  it("replaces a requested interviewer who does not hold the job", () => {
    // Asking for the architect to run your screen is the same
    // convincing-and-wrong failure as a designer sitting system design.
    const cast = castFor(
      titlesFor([findStage("recruiter-screen")]),
      "Stripe",
      findPersona("systems"),
    );
    expect(cast.title).toBe("Talent Partner");
  });

  it("honours a requested interviewer who does hold it", () => {
    const cast = castFor(
      titlesFor([findStage("system-design")]),
      "Stripe",
      findPersona("systems"),
    );
    expect(cast.id).toBe("systems");
  });

  it("prefers the company's own default when it qualifies", () => {
    // Stripe sends a skeptic, and the skeptic is a director — who does run
    // behavioural rounds.
    const cast = castFor(titlesFor([findStage("behavioral")]), "Stripe", null);
    expect(cast.id).toBe("skeptic");
  });
});
