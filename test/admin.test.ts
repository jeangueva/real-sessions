import { describe, expect, it } from "vitest";
import { Codes, Limiter, MAX_GUESSES, allowedEmails, cookieValue, readSession, sessionCookie } from "../admin/login.js";
import { summarise } from "../admin/metrics.js";
import type { Raw } from "../admin/metrics.js";

const secret = "x".repeat(40);
const allowed = allowedEmails(" Jean@Example.com , ");

describe("admin sign-in", () => {
  it("reads the allowlist lower-cased", () => {
    expect([...allowed]).toEqual(["jean@example.com"]);
  });

  it("accepts the right code once", () => {
    const codes = new Codes();
    const code = codes.issue("jean@example.com");
    expect(code).toMatch(/^\d{6}$/);
    expect(codes.check("jean@example.com", code)).toBe(true);
    expect(codes.check("jean@example.com", code)).toBe(false);
  });

  it("burns a code after too many wrong guesses, and after ten minutes", () => {
    const codes = new Codes();
    const code = codes.issue("jean@example.com", 0);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MAX_GUESSES; i++) codes.check("jean@example.com", wrong, 1);
    expect(codes.check("jean@example.com", code, 2)).toBe(false);
    const late = codes.issue("jean@example.com", 0);
    expect(codes.check("jean@example.com", late, 11 * 60 * 1000)).toBe(false);
  });

  it("signs sessions that cannot be forged, expire, and end when removed from the list", () => {
    const value = sessionCookie("jean@example.com", secret, 0);
    expect(readSession(value, secret, allowed, 1000)).toBe("jean@example.com");
    expect(readSession(value, "y".repeat(40), allowed, 1000)).toBeNull();
    expect(readSession(value, secret, allowed, 25 * 60 * 60 * 1000)).toBeNull();
    expect(readSession(value, secret, new Set(), 1000)).toBeNull();
    const [, signature] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "jean@example.com", exp: 9e15 })).toString("base64url");
    expect(readSession(`${forged}.${signature}`, secret, allowed, 1000)).toBeNull();
  });

  it("limits and reads cookies", () => {
    const limiter = new Limiter(2, 1000);
    expect([limiter.allow("a", 0), limiter.allow("a", 1), limiter.allow("a", 2), limiter.allow("a", 1001)]).toEqual([
      true,
      true,
      false,
      true,
    ]);
    expect(cookieValue("a=1; mockio_admin=abc.def==; b=2", "mockio_admin")).toBe("abc.def==");
  });
});

describe("summarise", () => {
  const day = (offset: number) => new Date(Date.UTC(2026, 9, 9) - offset * 86_400_000).toISOString();
  const raw: Raw = {
    accounts: [
      { id: "a", email: "a@x.co", createdAt: day(2), emailVerifiedAt: day(2), passwordHash: "h" },
      { id: "b", email: "b@x.co", createdAt: day(10), passwordHash: null },
      { id: "c", email: "c@x.co", createdAt: day(40), emailVerifiedAt: day(40), passwordHash: "h" },
    ],
    activity: [
      { ownerId: "a", started: 4, completed: 3, firstAt: day(2), lastAt: day(0) },
      { ownerId: "b", started: 1, completed: 0, firstAt: day(9), lastAt: day(9) },
      { ownerId: "gone", started: 9, completed: 9, firstAt: day(1), lastAt: day(1) },
    ],
    days: [{ day: day(0).slice(0, 10), started: 2, completed: 1 }],
    premium: [
      { ownerId: "a", source: "early-access" },
      { ownerId: "a", source: "subscription" },
      { ownerId: "c", source: "manual" },
      { ownerId: "gone", source: "subscription" },
    ],
    subscriptions: [
      { ownerId: "a", provider: "paddle", status: "active", periodEnd: day(-20), createdAt: day(1) },
      { ownerId: "c", provider: "mercadopago", status: "cancelled", periodEnd: null, createdAt: day(30) },
    ],
    active7: ["a", "gone"],
    active30: ["a", "b"],
  };
  const summary = summarise(raw, new Date(Date.UTC(2026, 9, 9, 12)));

  it("counts accounts, activity and plans, ignoring rows of erased accounts", () => {
    expect(summary.accounts).toEqual({ total: 3, verified: 2, new7: 1, new30: 2 });
    expect(summary.active).toEqual({ d7: 1, d30: 2 });
    expect(summary.plans).toEqual({ premium: 2, free: 1, bySource: { subscription: 1, manual: 1 } });
    expect(summary.subscriptions.active).toBe(1);
    expect(summary.subscriptions.byProvider).toEqual({ paddle: 1 });
    expect(summary.paidConversion).toBe(33.3);
  });

  it("builds the funnel and a full 30-day series", () => {
    expect(summary.funnel.map((step) => step.count)).toEqual([3, 2, 1, 1, 1]);
    expect(summary.signupsByDay).toHaveLength(30);
    expect(summary.interviewsByDay.at(-1)).toMatchObject({ completed: 1 });
  });

  it("lists users newest first with their plan", () => {
    expect(summary.users.map((user) => user.email)).toEqual(["a@x.co", "b@x.co", "c@x.co"]);
    expect(summary.users[0]).toMatchObject({ plan: "premium", provider: "paddle", completed: 3 });
    expect(summary.users[1]).toMatchObject({ plan: "free", google: true, verified: false });
  });
});
