import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  grantsAccess,
  planConfig,
  SIGNATURE_TOLERANCE_MS,
  verifySignature,
} from "../src/billing/mercadopago.js";
import { createSubscriptionStore } from "../src/billing/store.js";
import { createEntitlementStore } from "../src/entitlements.js";

const SECRET = "a-webhook-secret";

/** Builds a header Mercado Pago would have sent. */
function sign(dataId: string, requestId: string, at = Date.now()): string {
  const ts = Math.floor(at / 1000);
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifySignature", () => {
  const valid = {
    dataId: "2c93808",
    requestId: "req-1",
    secret: SECRET,
  };

  it("accepts a signature it produced itself", () => {
    const signature = sign(valid.dataId, valid.requestId);
    expect(verifySignature({ ...valid, signature })).toEqual({ ok: true });
  });

  it("rejects a forged body signed with the wrong secret", () => {
    const ts = Math.floor(Date.now() / 1000);
    const manifest = `id:${valid.dataId};request-id:${valid.requestId};ts:${ts};`;
    const v1 = createHmac("sha256", "not-the-secret").update(manifest).digest("hex");
    const result = verifySignature({ ...valid, signature: `ts=${ts},v1=${v1}` });
    expect(result).toEqual({ ok: false, reason: "signature mismatch" });
  });

  it("rejects a signature for a different subscription id", () => {
    // Without binding the id, one valid notification would authorise changes
    // to every other subscription.
    const signature = sign("some-other-id", valid.requestId);
    expect(verifySignature({ ...valid, signature }).ok).toBe(false);
  });

  it("rejects a replay of a captured notification", () => {
    const stale = Date.now() - SIGNATURE_TOLERANCE_MS - 1000;
    const signature = sign(valid.dataId, valid.requestId, stale);
    expect(verifySignature({ ...valid, signature })).toEqual({
      ok: false,
      reason: "stale timestamp",
    });
  });

  it("accepts one that is merely a little late", () => {
    const recent = Date.now() - SIGNATURE_TOLERANCE_MS / 2;
    const signature = sign(valid.dataId, valid.requestId, recent);
    expect(verifySignature({ ...valid, signature }).ok).toBe(true);
  });

  it("refuses to verify anything when no secret is configured", () => {
    // Fail closed. Treating a missing secret as "skip the check" is how a
    // misconfigured deployment becomes an open endpoint.
    const signature = sign(valid.dataId, valid.requestId);
    expect(verifySignature({ ...valid, secret: undefined, signature })).toEqual({
      ok: false,
      reason: "no webhook secret configured",
    });
  });

  it("rejects the malformed and the missing", () => {
    expect(verifySignature({ ...valid, signature: undefined }).ok).toBe(false);
    expect(verifySignature({ ...valid, signature: "garbage" }).ok).toBe(false);
    expect(verifySignature({ ...valid, signature: "ts=abc,v1=def" }).ok).toBe(false);
    expect(
      verifySignature({ ...valid, dataId: undefined, signature: sign("x", "y") }).ok,
    ).toBe(false);
  });

  it("does not throw on a signature of the wrong length", () => {
    // timingSafeEqual throws on a length mismatch, so the length is compared
    // first — an exception here would be a 500 on an attacker's request.
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      verifySignature({ ...valid, signature: `ts=${ts},v1=ab` }),
    ).not.toThrow();
  });
});

describe("grantsAccess", () => {
  it("only authorizes an authorized subscription", () => {
    expect(grantsAccess("authorized")).toBe(true);
    expect(grantsAccess("pending")).toBe(false);
    expect(grantsAccess("cancelled")).toBe(false);
  });

  it("treats a failing subscription as not paying", () => {
    // `paused` is Mercado Pago's retry state. Reading it as active gives the
    // product away for as long as the retries run.
    expect(grantsAccess("paused")).toBe(false);
  });
});

describe("planConfig", () => {
  it("is null unless both the amount and the currency are set", () => {
    const before = { ...process.env };
    delete process.env.MERCADOPAGO_AMOUNT;
    delete process.env.MERCADOPAGO_CURRENCY;
    expect(planConfig()).toBeNull();

    process.env.MERCADOPAGO_AMOUNT = "9";
    expect(planConfig()).toBeNull();

    process.env.MERCADOPAGO_CURRENCY = "ARS";
    expect(planConfig()).toEqual({ amount: 9, currency: "ARS" });

    // Mercado Pago charges in the seller's currency, so there is no correct
    // default price. A missing one must not silently become zero.
    process.env.MERCADOPAGO_AMOUNT = "0";
    expect(planConfig()).toBeNull();

    process.env = before;
  });
});

describe("subscription store", () => {
  it("finds an owner from the provider's id, which is all a webhook has", async () => {
    const store = createSubscriptionStore(null);
    await store.put({
      ownerId: "owner-1",
      externalId: "mp-1",
      status: "authorized",
      periodEnd: null,
    });
    expect((await store.byExternalId("mp-1"))?.ownerId).toBe("owner-1");
    expect(await store.byExternalId("mp-unknown")).toBeNull();
  });

  it("keeps one subscription per owner", async () => {
    const store = createSubscriptionStore(null);
    await store.put({ ownerId: "o", externalId: "mp-1", status: "pending", periodEnd: null });
    await store.put({ ownerId: "o", externalId: "mp-2", status: "authorized", periodEnd: null });
    expect((await store.forOwner("o"))?.externalId).toBe("mp-2");
  });

  it("carries a guest's subscription onto their account", async () => {
    const store = createSubscriptionStore(null);
    await store.put({ ownerId: "guest", externalId: "mp-1", status: "authorized", periodEnd: null });
    await store.transfer("guest", "account");
    expect((await store.forOwner("account"))?.externalId).toBe("mp-1");
    expect(await store.forOwner("guest")).toBeNull();
  });
});

describe("revoking a grant", () => {
  it("ends an open-ended subscription grant", async () => {
    const plans = createEntitlementStore(null);
    await plans.grant("owner", "premium", "subscription", null);
    expect(await plans.planFor("owner")).toBe("premium");

    await plans.revoke("owner", "subscription");
    expect(await plans.planFor("owner")).toBe("free");
  });

  it("leaves grants from other sources alone", async () => {
    // Cancelling a subscription must not take away an early-access grant that
    // has months left on it.
    const plans = createEntitlementStore(null);
    const future = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    await plans.grant("owner", "premium", "early-access", future);
    await plans.grant("owner", "premium", "subscription", null);

    await plans.revoke("owner", "subscription");
    expect(await plans.planFor("owner")).toBe("premium");
  });
});
