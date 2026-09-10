import { describe, expect, it } from "vitest";
import { PRESSURE_BRIEF, PRESSURE_RUBRIC, pressureRequested } from "../src/pressure.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { buildEvaluatorPrompt } from "../src/prompts/evaluator.js";
import { findStage } from "../src/stages.js";
import type { InterviewContext } from "../src/types.js";

/**
 * Stress mode, and the two rounds that came with it.
 *
 * The failure to guard against is the same one the English levels have: a
 * setting that says it changes the manner quietly changing the difficulty
 * instead. A candidate who survives a hostile-sounding interview because the
 * questions got easier has learned something false about themselves, and
 * nothing in the transcript would show it.
 */

const context = (): InterviewContext => ({
  candidateName: "Ana",
  targetRole: "Backend Engineer",
  companyName: "Stripe",
  companyCulture: "Rigour, ownership, evidence",
  industry: "Fintech",
  interviewStage: "Behavioral",
});

describe("stress mode", () => {
  it("tells the interviewer to interrupt and move the premise", () => {
    const prompt = buildInterviewerPrompt(context(), { pressure: true });
    expect(prompt).toContain("let me stop you there");
    expect(prompt).toContain("Change the premise");
  });

  it("holds the questions and the standard fixed", () => {
    // The sentence this asserts is the whole point of the feature.
    expect(PRESSURE_BRIEF).toContain("pressure is in the delivery, never in the difficulty");
  });

  it("draws a line at hostile", () => {
    // An interviewer who is merely unpleasant teaches nothing except that
    // interviews are unsurvivable.
    expect(PRESSURE_BRIEF).toContain("you do not become unpleasant");
  });

  it("says nothing about interrupting when it is off", () => {
    // Absent rather than negated: telling a model not to interrupt puts the
    // idea in front of it.
    const prompt = buildInterviewerPrompt(context());
    expect(prompt).not.toContain("stop you there");
    expect(prompt).toContain("Let them finish their answers");
  });

  it("tells the evaluator to judge recovery, not smoothness", () => {
    const prompt = buildEvaluatorPrompt(context(), undefined, "en", "b2", true);
    expect(prompt).toContain("Judge recovery rather than smoothness");
    expect(PRESSURE_RUBRIC).toContain("Do not mark down the fragmentation");
  });

  it("does not tell the evaluator that when it was off", () => {
    const prompt = buildEvaluatorPrompt(context(), undefined, "en", "b2", false);
    expect(prompt).toContain("run normally");
  });

  it("reads the flag without trusting its shape", () => {
    expect(pressureRequested(true)).toBe(true);
    expect(pressureRequested("true")).toBe(true);
    expect(pressureRequested("yes")).toBe(false);
    expect(pressureRequested(1)).toBe(false);
    expect(pressureRequested(undefined)).toBe(false);
  });
});

describe("salary negotiation", () => {
  const stage = findStage("salary-negotiation");

  it("opens below the band on purpose", () => {
    expect(stage.brief).toContain("you open below what the role is budgeted for");
  });

  it("makes the candidate name the number", () => {
    // Handing them a figure removes the one thing being rehearsed.
    expect(stage.brief).toContain("make them name a figure rather than naming it for them");
  });

  it("treats accepting the first offer as the failure", () => {
    expect(stage.rubric).toContain("Accepting the opening offer is the failure");
  });

  it("stays warm, because a real offer call is also a sell", () => {
    expect(stage.brief).toContain("Stay warm");
  });
});

describe("async stand-up", () => {
  const stage = findStage("async-standup");

  it("is short, because a long stand-up is the thing being trained out", () => {
    expect(stage.maxTurns).toBeLessThanOrEqual(4);
  });

  it("judges concision above everything", () => {
    expect(stage.rubric).toContain("Concision is the whole thing");
  });

  it("keeps the interviewer out of interview mode", () => {
    // It is a teammate reading an update, not a hiring manager.
    expect(stage.brief).toContain("Do not interview them");
  });
});
