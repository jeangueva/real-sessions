import { describe, expect, it, beforeEach } from "vitest";
import { issueToken, verifyToken, accessCodeAccepted, readCookie, cookieHeader } from "../src/auth.js";
import { MemoryRateLimiter, RULES } from "../src/rate-limit.js";

describe("identity tokens", () => {
  it("round-trips a freshly issued token", () => {
    const { token, identity } = issueToken();
    expect(verifyToken(token)?.id).toBe(identity.id);
  });

  it("rejects a tampered payload", () => {
    const { token } = issueToken();
    const [id, expiresAt, signature] = token.split(".");
    // Same signature, different identity — the forgery a signed token exists to stop.
    expect(verifyToken(`deadbeef.${expiresAt}.${signature}`)).toBeNull();
    expect(verifyToken(`${id}.${Number(expiresAt) + 60_000}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const { token } = issueToken();
    const [id, , signature] = token.split(".");
    expect(verifyToken(`${id}.${Date.now() - 1000}.${signature}`)).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of [undefined, "", "a", "a.b", "a.b.c.d", "...."]) {
      expect(verifyToken(bad as string | undefined)).toBeNull();
    }
  });
});

describe("access code", () => {
  it("allows everything when no code is configured", () => {
    // REALSESSIONS_ACCESS_CODE is unset in the test env.
    expect(accessCodeAccepted(undefined)).toBe(true);
    expect(accessCodeAccepted("anything")).toBe(true);
  });
});

describe("cookies", () => {
  it("reads its own cookie out of a crowded header", () => {
    const { token } = issueToken();
    const header = `other=1; ${cookieHeader(token, false).split(";")[0]}; last=2`;
    expect(readCookie(header)).toBe(token);
  });

  it("marks the cookie httpOnly and SameSite", () => {
    const header = cookieHeader("t", true);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
  });

  it("omits Secure outside production so local http still works", () => {
    expect(cookieHeader("t", false)).not.toContain("Secure");
  });
});

describe("rate limiting", () => {
  let limiter: MemoryRateLimiter;
  beforeEach(() => {
    limiter = new MemoryRateLimiter();
  });

  it("allows up to the limit then refuses", async () => {
    const rule = { limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i += 1) {
      expect((await limiter.consume("k", rule)).allowed).toBe(true);
    }
    const blocked = await limiter.consume("k", rule);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("keys are independent", async () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect((await limiter.consume("a", rule)).allowed).toBe(true);
    expect((await limiter.consume("b", rule)).allowed).toBe(true);
    expect((await limiter.consume("a", rule)).allowed).toBe(false);
  });

  it("reopens after the window passes", () => {
    const rule = { limit: 1, windowMs: 1000 };
    const now = Date.now();
    expect(limiter.consumeAt("k", rule, now).allowed).toBe(true);
    expect(limiter.consumeAt("k", rule, now + 500).allowed).toBe(false);
    expect(limiter.consumeAt("k", rule, now + 1500).allowed).toBe(true);
  });

  it("limits the expensive routes harder than the common one", () => {
    expect(RULES.startSession.limit).toBeLessThan(RULES.answer.limit);
    expect(RULES.evaluation.limit).toBeLessThan(RULES.answer.limit);
  });
});
