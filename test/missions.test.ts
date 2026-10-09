import { describe, expect, it } from "vitest";
import { missionXp, weekStart, weeklyMissions, xpForSession } from "../src/gamification.js";

const done = (day: string, mode: "practice" | "real" = "practice") => ({
  completedAt: `${day}T10:00:00.000Z`,
  mode,
});

describe("weekly missions", () => {
  it("starts the week on Monday", () => {
    expect(weekStart("2026-10-08")).toBe("2026-10-05"); // Thursday
    expect(weekStart("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday
  });

  it("counts only this week's finished sessions", () => {
    const missions = weeklyMissions(
      [done("2026-10-04"), done("2026-10-05"), done("2026-10-06", "real"), { completedAt: null, mode: "practice" as const }],
      "2026-10-08",
    );
    const byId = Object.fromEntries(missions.map((mission) => [mission.id, mission]));
    expect(byId["week-three"]).toMatchObject({ progress: 2, done: false });
    expect(byId["week-real"]).toMatchObject({ progress: 1, done: true });
    expect(byId["week-two-days"]).toMatchObject({ progress: 2, done: true });
  });

  it("pays a mission once, on the session that completes it", () => {
    const history = [done("2026-10-06"), done("2026-10-07")];
    expect(missionXp({ mode: "practice", history, today: "2026-10-08" })).toEqual([
      { kind: "mission:week-three", amount: 60 },
    ]);
    expect(
      missionXp({ mode: "practice", history: [...history, done("2026-10-08")], today: "2026-10-08" }),
    ).toEqual([]);
  });

  it("adds mission rewards to the session's XP", () => {
    const events = xpForSession({ score: 60, mode: "real", history: [], xpToday: 0, today: "2026-10-08" });
    expect(events.map((event) => event.kind)).toContain("mission:week-real");
  });
});
