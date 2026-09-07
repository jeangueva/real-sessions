import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEVEL,
  LEVELS,
  SESSIONS_BEFORE_NUDGE,
  findLevel,
  levelCatalogue,
  nextLevel,
  readyToLevelUp,
} from "../src/levels.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { buildEvaluatorPrompt } from "../src/prompts/evaluator.js";
import type { InterviewContext } from "../src/types.js";

/**
 * The English level.
 *
 * Two failures are worth guarding against, and they pull in opposite
 * directions. One is a level that quietly makes the interview easier — a
 * candidate who passes a softened round walks into the real one believing
 * something false, which is worse than never rehearsing. The other is a nudge
 * to move up fired on one good day, which drops someone into a level they
 * cannot follow and teaches them they have stopped improving.
 */

const context = (): InterviewContext => ({
  candidateName: "Mariana",
  targetRole: "Backend Engineer",
  companyName: "Stripe",
  companyCulture: "Rigour, ownership, evidence",
  industry: "Fintech",
  interviewStage: "Behavioral",
});

describe("findLevel", () => {
  it("resolves the four bands", () => {
    for (const level of LEVELS) expect(findLevel(level.id).id).toBe(level.id);
  });

  it("falls back to the level most roles ask for", () => {
    // A stale client sending an unknown id gets the standard interview, not
    // an error and not the easiest one on the list.
    expect(findLevel("fluent").id).toBe(DEFAULT_LEVEL);
    expect(findLevel(null).id).toBe(DEFAULT_LEVEL);
    expect(findLevel("").id).toBe(DEFAULT_LEVEL);
  });

  it("is case-insensitive, because the client sends a label sometimes", () => {
    expect(findLevel("B1").id).toBe("b1");
  });
});

describe("the briefs only touch delivery", () => {
  it("tells the interviewer this is about language, not about difficulty", () => {
    const prompt = buildInterviewerPrompt(context(), { level: "a2" });
    expect(prompt).toContain("elementary English speaker");
    // The separation is stated in the template rather than left to the model
    // to infer from four briefs that never quite say it.
    expect(prompt).toContain("governs your delivery only");
    expect(prompt).toContain("never changes what you are willing to ask");
  });

  it("still demands a specific example at the easiest level", () => {
    // The one thing a level must never soften. An interview that stops asking
    // for evidence is not an easier interview, it is a different one.
    const prompt = buildInterviewerPrompt(context(), { level: "a2" });
    expect(prompt).toContain("Do not lower the bar on substance");
  });

  it("runs at full speed at the hardest level", () => {
    const prompt = buildInterviewerPrompt(context(), { level: "c1" });
    expect(prompt).toContain("no allowances at all");
  });

  it("defaults into the prompt when nobody chose", () => {
    const prompt = buildInterviewerPrompt(context());
    expect(prompt).toContain("upper-intermediate English speaker");
  });
});

describe("the evaluator grades at the level that was spoken", () => {
  it("moves the bar for delivery", () => {
    const easy = buildEvaluatorPrompt(context(), undefined, "en", "a2");
    expect(easy).toContain("elementary level");
    expect(easy).toContain("Do not mark down for simple sentence structure");

    const hard = buildEvaluatorPrompt(context(), undefined, "en", "c1");
    expect(hard).toContain("advanced level");
  });

  it("does not move the bar for substance", () => {
    for (const level of LEVELS) {
      const prompt = buildEvaluatorPrompt(context(), undefined, "en", level.id);
      expect(prompt, level.id).toContain("never for substance");
    }
  });
});

describe("nextLevel", () => {
  it("walks up the list", () => {
    expect(nextLevel("a2")?.id).toBe("b1");
    expect(nextLevel("b1")?.id).toBe("b2");
    expect(nextLevel("b2")?.id).toBe("c1");
  });

  it("stops at the top rather than wrapping", () => {
    expect(nextLevel("c1")).toBeNull();
  });
});

describe("readyToLevelUp", () => {
  const at = (level: string, ...scores: (number | null)[]) =>
    scores.map((score) => ({ level, score }));

  it("says nothing until there are enough attempts", () => {
    expect(readyToLevelUp("b1", at("b1", 95, 95))).toBeNull();
    expect(SESSIONS_BEFORE_NUDGE).toBe(3);
  });

  it("suggests the next level after a consistent run", () => {
    expect(readyToLevelUp("b1", at("b1", 80, 78, 90))?.id).toBe("b2");
  });

  it("holds when one of the recent attempts fell short", () => {
    // The rule is "consistently", not "on average". A 95 and a 55 average to
    // a pass and describe someone who is not ready.
    expect(readyToLevelUp("b1", at("b1", 95, 55, 95))).toBeNull();
  });

  it("reads only the most recent attempts", () => {
    // An old bad run should not hold someone back forever.
    expect(readyToLevelUp("b1", at("b1", 20, 20, 80, 82, 88))?.id).toBe("b2");
  });

  it("ignores sessions run at another level", () => {
    // Scores from an easier level say nothing about readiness to leave this
    // one, and counting them would promote people on the wrong evidence.
    const mixed = [...at("a2", 99, 99, 99), ...at("b1", 80)];
    expect(readyToLevelUp("b1", mixed)).toBeNull();
  });

  it("skips abandoned interviews rather than failing them", () => {
    // An unscored session is one somebody walked away from. It is not a
    // statement about their English.
    const attempts = [...at("b1", 80, null, 82, null, 90)];
    expect(readyToLevelUp("b1", attempts)?.id).toBe("b2");
  });

  it("never suggests anything above the top level", () => {
    expect(readyToLevelUp("c1", at("c1", 100, 100, 100))).toBeNull();
  });
});

describe("levelCatalogue", () => {
  it("gives the picker a label and a plain-language summary", () => {
    const catalogue = levelCatalogue();
    expect(catalogue).toHaveLength(LEVELS.length);
    for (const entry of catalogue) {
      expect(entry.label, entry.id).not.toBe("");
      expect(entry.summary, entry.id).not.toBe("");
      // The brief is an instruction to a model and reads as one. Putting it on
      // the picker would be the second time this product leaked a prompt into
      // the interface.
      expect(entry).not.toHaveProperty("brief");
    }
  });
});
