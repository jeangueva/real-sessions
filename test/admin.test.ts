import { generateKeyPairSync, createSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { accessConfig, verifyAccess } from "../admin/access.js";
import { summarise } from "../admin/metrics.js";
import type { Raw } from "../admin/metrics.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const keys = async () => [jwk];
const config = { teamDomain: "mockio", audience: "aud-1", allowed: new Set(["jean@example.com"]) };
const now = 1_800_000_000_000;

function token(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: "RS256", kid: "k1" }) {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const signed = `${part(header)}.${part(payload)}`;
  const signature = createSign("RSA-SHA256").update(signed).sign(privateKey).toString("base64url");
  return `${signed}.${signature}`;
}

const good = {
  aud: ["aud-1"],
  iss: "https://mockio.cloudflareaccess.com",
  exp: now / 1000 + 600,
  email: "Jean@Example.com",
};

describe("Cloudflare Access check", () => {
  it("lets in a valid token for an allowed email", async () => {
    expect(await verifyAccess(token(good), config, keys, now)).toBe("jean@example.com");
  });

  it("refuses everything else", async () => {
    expect(await verifyAccess(undefined, config, keys, now)).toBeNull();
    expect(await verifyAccess(token({ ...good, email: "other@example.com" }), config, keys, now)).toBeNull();
    expect(await verifyAccess(token({ ...good, aud: ["another-app"] }), config, keys, now)).toBeNull();
    expect(await verifyAccess(token({ ...good, iss: "https://evil.cloudflareaccess.com" }), config, keys, now)).toBeNull();
    expect(await verifyAccess(token({ ...good, exp: now / 1000 - 1 }), config, keys, now)).toBeNull();
    expect(await verifyAccess(token(good, { alg: "none", kid: "k1" }), config, keys, now)).toBeNull();
    const [h, , s] = token(good).split(".");
    const forged = Buffer.from(JSON.stringify({ ...good, email: "jean@example.com", exp: now })).toString("base64url");
    expect(await verifyAccess(`${h}.${forged}.${s}`, config, keys, now)).toBeNull();
  });

  it("will not start without the whole configuration", () => {
    expect(accessConfig({ CF_ACCESS_TEAM_DOMAIN: "mockio", CF_ACCESS_AUD: "a" })).toBeNull();
    expect(
      accessConfig({ CF_ACCESS_TEAM_DOMAIN: "mockio.cloudflareaccess.com", CF_ACCESS_AUD: "a", ADMIN_EMAILS: "A@b.co, " }),
    ).toEqual({ teamDomain: "mockio", audience: "a", allowed: new Set(["a@b.co"]) });
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
