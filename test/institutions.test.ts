import { describe, expect, it } from "vitest";
import { createInstitutionStore, seatHeld } from "../src/institutions.js";

describe("a school's cohort", () => {
  it("gives the seats to the first students to join, while the plan is in date", async () => {
    const store = createInstitutionStore(null);
    const school = await store.create({
      name: "Universidad de Ejemplo",
      ownerId: "coord",
      seats: 2,
      creditsPerStudent: 5,
      rubric: null,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    await store.join("ana", school.code);
    await store.join("luis", school.code);
    await store.join("eva", school.code);
    const members = await store.members(school.code);
    expect(seatHeld(school, members, "ana")).toBe(true);
    expect(seatHeld(school, members, "eva")).toBe(false);
    expect(seatHeld({ ...school, expiresAt: new Date(Date.now() - 1000).toISOString() }, members, "ana")).toBe(false);
  });
});
