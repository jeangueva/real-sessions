import { describe, expect, it } from "vitest";
import { journey, PRACTICE_GOAL, streakDays } from "../src/lib/journey";

const states = (completed: number, statuses: Parameters<typeof journey>[1] = []) =>
  journey(completed, statuses).map((milestone) => milestone.state);

describe("journey", () => {
  it("starts with the first interview as the step you are on", () => {
    expect(states(0)).toEqual(["now", "ahead", "ahead", "ahead"]);
  });

  it("moves on once the first practice is finished", () => {
    expect(states(1)).toEqual(["done", "now", "ahead", "ahead"]);
    expect(states(PRACTICE_GOAL)).toEqual(["done", "done", "now", "ahead"]);
  });

  it("reads a real interview from the applications, not from practice", () => {
    expect(states(3, ["applied", "interviewing"])).toEqual(["done", "done", "done", "now"]);
  });

  it("treats an offer as having had the interview", () => {
    expect(states(0, ["offer"])).toEqual(["done", "done", "done", "done"]);
  });

  it("ignores a rejection — it is not a step backwards", () => {
    expect(states(2, ["rejected"])).toEqual(["done", "now", "ahead", "ahead"]);
  });
});

describe("streakDays", () => {
  const today = new Date(2026, 9, 4, 9, 0);
  const at = (day: number, hour = 20) => new Date(2026, 9, day, hour).toISOString();

  it("counts consecutive days ending today", () => {
    expect(streakDays([at(4, 8), at(3), at(2)], today)).toBe(3);
  });

  it("keeps a streak alive that ran to yesterday", () => {
    expect(streakDays([at(3), at(2)], today)).toBe(2);
  });

  it("breaks on a missed day", () => {
    expect(streakDays([at(4, 8), at(2)], today)).toBe(1);
    expect(streakDays([at(1)], today)).toBe(0);
  });

  it("counts a day once however many interviews it had", () => {
    expect(streakDays([at(4, 7), at(4, 8), at(3)], today)).toBe(2);
  });
});
