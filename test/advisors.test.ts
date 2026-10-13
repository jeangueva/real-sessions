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

describe("the affiliate payout", () => {
  const at = (iso: string) => new Date(iso);
  const commission = (createdAt: string, amount: number, paidAt: string | null = null) => ({
    paymentId: createdAt,
    studentId: "s",
    amount,
    currency: "PEN",
    createdAt,
    paidAt,
  });

  it("holds a commission for the refund window, then makes it available", async () => {
    const { payoutSummary } = await import("../src/advisors.js");
    const summary = payoutSummary(
      [
        commission("2026-10-01T12:00:00Z", 23.7),
        commission("2026-10-10T12:00:00Z", 11.7),
        commission("2026-09-01T12:00:00Z", 35.7, "2026-09-10T12:00:00Z"),
      ],
      at("2026-10-12T12:00:00Z"),
    );
    expect(summary).toMatchObject({ held: 11.7, available: 23.7, paid: 35.7, count: 3, holdDays: 7 });
    // Below the minimum: it rolls over to a later payout.
    expect(summary.payable).toBe(false);
  });

  it("pays in the first ten days of each month", async () => {
    const { payoutSummary } = await import("../src/advisors.js");
    expect(payoutSummary([], at("2026-10-04T12:00:00Z")).nextPayout).toBe("2026-10-10");
    expect(payoutSummary([], at("2026-10-12T12:00:00Z")).nextPayout).toBe("2026-11-10");
    expect(payoutSummary([], at("2026-12-20T12:00:00Z")).nextPayout).toBe("2027-01-10");
    const enough = payoutSummary([commission("2026-09-01T00:00:00Z", 60)], at("2026-10-12T12:00:00Z"));
    expect(enough.payable).toBe(true);
  });
});
