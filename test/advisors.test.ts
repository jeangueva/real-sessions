import { describe, expect, it } from "vitest";
import { createAdvisorStore, normalizeCode } from "../src/advisors.js";

describe("advisors", () => {
  it("gives a readable code and accepts it however it is typed", async () => {
    const store = createAdvisorStore(null);
    const advisor = await store.create("prof", "Dra. Torres");
    expect(advisor.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(normalizeCode(` ${advisor.code.toLowerCase()} `)).toBe(advisor.code);
    expect(await store.create("prof", "Otra")).toEqual(advisor);
  });

  it("keeps the first advisor unless the student changes on purpose", async () => {
    const store = createAdvisorStore(null);
    const a = await store.create("a", "A");
    const b = await store.create("b", "B");
    await store.link("ana", a.code, false);
    expect((await store.link("ana", b.code, true))?.code).toBe(a.code);
    expect((await store.link("ana", b.code, true, true))?.code).toBe(b.code);
  });

  it("records a commission once per payment", async () => {
    const store = createAdvisorStore(null);
    const a = await store.create("a", "A");
    const commission = { paymentId: "9", studentId: "ana", amount: 11.7, currency: "PEN" };
    expect(await store.recordCommission(a.code, commission)).toBe(true);
    expect(await store.recordCommission(a.code, commission)).toBe(false);
    expect(await store.commissions(a.code)).toHaveLength(1);
  });
});
