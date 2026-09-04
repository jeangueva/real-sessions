import { describe, expect, it } from "vitest";
import { ROLES } from "../src/roles.js";
import {
  STAGES,
  findStage,
  resolveStage,
  stageCatalogue,
  stagesFor,
} from "../src/stages.js";
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
