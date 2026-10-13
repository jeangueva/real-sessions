import { describe, expect, it } from "vitest";
import { buildPlan, daysBetween } from "../src/lib/defense-plan";

const risks = [
  { severity: "baja" as const, likely_question: "¿Por qué APA 6?", page: 3 },
  { severity: "alta" as const, likely_question: "¿Con qué sustento afirma causalidad?", page: 34 },
  { severity: "media" as const, likely_question: "¿Verificó la normalidad?", page: 41 },
];

describe("the plan to the defence", () => {
  it("is empty on the day itself and after it", () => {
    const base = { risks, hasSlides: true, hasStudy: true, rehearsals: 2 };
    expect(buildPlan({ ...base, today: "2026-11-10", defenseDate: "2026-11-10" })).toEqual([]);
    expect(buildPlan({ ...base, today: "2026-11-11", defenseDate: "2026-11-10" })).toEqual([]);
  });

  it("has one task a day up to the eve, anchored where the countdown mails are", () => {
    const plan = buildPlan({ today: "2026-11-01", defenseDate: "2026-11-11", risks, hasSlides: false, hasStudy: false, rehearsals: 0 });
    expect(plan).toHaveLength(10);
    expect(plan[0]).toMatchObject({ date: "2026-11-01", daysLeft: 10, task: { kind: "diagnosis" } });
    const at = (left: number) => plan.find((day) => day.daysLeft === left)!.task.kind;
    expect(at(7)).toBe("first-rehearsal");
    expect(at(3)).toBe("demanding");
    expect(at(1)).toBe("short");
    // What is missing comes before the risks; the risks go most serious first.
    expect(plan.map((day) => day.task.kind)).toContain("slides");
    const firstRisk = plan.find((day) => day.task.kind === "risk")!.task;
    expect(firstRisk).toMatchObject({ page: 34 });
  });

  it("still fits the essentials into a short run-up", () => {
    const plan = buildPlan({ today: "2026-11-08", defenseDate: "2026-11-11", risks, hasSlides: true, hasStudy: true, rehearsals: 0 });
    expect(plan.map((day) => day.task.kind)).toEqual(["first-rehearsal", "demanding", "short"]);
  });

  it("counts calendar days, not hours", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});
