import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { COUNTRIES, TIER_PRICES, regionFor } from "../src/billing/regions.js";
import {
  mapPaddleStatus,
  minorUnits,
  overridesFor,
  paddleConfig,
  parseSubscriptionEvent,
  verifyPaddleSignature,
} from "../src/billing/paddle.js";

describe("regionFor", () => {
  it("keeps Peru on Mercado Pago in soles", () => {
    expect(regionFor("PE", true)).toMatchObject({ provider: "mercadopago", price: null });
  });

  it("sells everywhere through Mercado Pago while Paddle is not configured", () => {
    expect(regionFor("AR", false).provider).toBe("mercadopago");
    expect(regionFor("ES", false).provider).toBe("mercadopago");
  });

  it("charges each country its tier's price in its own currency", () => {
    expect(regionFor("AR", true)).toMatchObject({ tier: 4, provider: "paddle", price: { currency: "ARS" } });
    expect(regionFor("ES", true)).toMatchObject({ tier: 2, price: { currency: "EUR", monthly: 9 } });
    expect(regionFor("de", true)).toMatchObject({ tier: 1, price: { currency: "EUR", monthly: 11 } });
    expect(regionFor("JP", true)).toMatchObject({ tier: 1, price: { currency: "JPY", monthly: 1800 } });
  });

  it("charges dollars where Paddle has no local currency", () => {
    expect(regionFor("BO", true).price).toMatchObject({ currency: "USD", monthly: 5 });
    expect(regionFor("NG", true).price).toMatchObject({ currency: "USD", monthly: 5 });
  });

  it("puts an unlisted or unknown country in tier 2, in dollars — never the cheapest by accident", () => {
    expect(regionFor("ZZ", true)).toMatchObject({ tier: 2, price: { currency: "USD", monthly: 10 } });
    expect(regionFor("XX", true)).toMatchObject({ country: null, tier: 2 });
    expect(regionFor(null, true)).toMatchObject({ country: null, tier: 2 });
  });

  it("never offers Paddle where sanctions forbid it", () => {
    expect(regionFor("RU", true).provider).toBe("mercadopago");
    expect(regionFor("CU", true).provider).toBe("mercadopago");
  });
});

describe("the price table", () => {
  it("gives every listed country a price its tier can charge", () => {
    for (const [country, [tier, currency]] of Object.entries(COUNTRIES)) {
      if (country === "PE") continue;
      const prices = TIER_PRICES[tier];
      expect(prices[currency] ?? prices.USD, country).toBeDefined();
    }
  });

  it("makes the year cost ten months, so the yearly saving is the same everywhere", () => {
    for (const prices of Object.values(TIER_PRICES)) {
      for (const price of Object.values(prices)) {
        expect(price.yearly, price.currency).toBeCloseTo(price.monthly * 10);
      }
    }
  });

  it("keeps the tiers in order in dollars", () => {
    const usd = [1, 2, 3, 4].map((tier) => TIER_PRICES[tier as 1 | 2 | 3 | 4].USD!.monthly);
    expect([...usd].sort((a, b) => b - a)).toEqual(usd);
  });
});

describe("Paddle price overrides", () => {
  it("writes amounts in the lowest denomination, whole units for zero-decimal currencies", () => {
    expect(minorUnits(11, "EUR")).toBe("1100");
    expect(minorUnits(42.9, "BRL")).toBe("4290");
    expect(minorUnits(1800, "JPY")).toBe("1800");
    expect(minorUnits(7490, "CLP")).toBe("7490");
  });

  it("groups countries that share a price, and leaves Peru to Mercado Pago", () => {
    const { base, overrides } = overridesFor("monthly");
    expect(base).toEqual({ amount: "1000", currency_code: "USD" });
    const all = overrides.flatMap((entry) => entry.country_codes);
    expect(all).not.toContain("PE");
    expect(all).not.toContain("CU");
    expect(new Set(all).size).toBe(all.length);
    const euro1 = overrides.find((entry) => entry.unit_price.currency_code === "EUR" && entry.unit_price.amount === "1100");
    expect(euro1?.country_codes).toEqual(expect.arrayContaining(["DE", "FR", "IE"]));
  });
});

describe("Paddle webhooks", () => {
  const secret = "pdl_ntfset_test";
  const sign = (body: string, ts: number) =>
    `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;

  it("accepts a correctly signed body", () => {
    const body = '{"event_type":"subscription.activated"}';
    const now = 1_760_000_000_000;
    expect(verifyPaddleSignature({ header: sign(body, now / 1000), rawBody: body, secret, now })).toEqual({ ok: true });
  });

  it("rejects a changed body, a wrong secret, and an old timestamp", () => {
    const body = '{"a":1}';
    const now = 1_760_000_000_000;
    const header = sign(body, now / 1000);
    expect(verifyPaddleSignature({ header, rawBody: '{"a":2}', secret, now }).ok).toBe(false);
    expect(verifyPaddleSignature({ header, rawBody: body, secret: "other", now }).ok).toBe(false);
    expect(verifyPaddleSignature({ header, rawBody: body, secret, now: now + 10 * 60 * 1000 }).ok).toBe(false);
    expect(verifyPaddleSignature({ header: undefined, rawBody: body, secret, now }).ok).toBe(false);
  });

  it("reads the subscription, its owner and its paid period", () => {
    const sub = parseSubscriptionEvent({
      event_type: "subscription.activated",
      data: {
        id: "sub_01",
        status: "active",
        custom_data: { ownerId: "acct_1" },
        current_billing_period: { ends_at: "2026-11-05T00:00:00Z" },
      },
    });
    expect(sub).toEqual({
      id: "sub_01",
      status: "authorized",
      ownerId: "acct_1",
      periodEnd: new Date("2026-11-05T00:00:00Z"),
    });
  });

  it("ignores events that are not about subscriptions", () => {
    expect(parseSubscriptionEvent({ event_type: "transaction.completed", data: { id: "txn_1", status: "completed" } })).toBeNull();
  });

  it("keeps access while Paddle retries a card, and ends it only on cancellation", () => {
    expect(mapPaddleStatus("past_due")).toBe("authorized");
    expect(mapPaddleStatus("paused")).toBe("paused");
    expect(mapPaddleStatus("canceled")).toBe("cancelled");
  });
});

describe("paddleConfig", () => {
  it("is off until every piece is set", () => {
    expect(paddleConfig({})).toBeNull();
    expect(paddleConfig({ PADDLE_ENV: "sandbox", PADDLE_API_KEY: "k" })).toBeNull();
    expect(
      paddleConfig({
        PADDLE_ENV: "sandbox",
        PADDLE_API_KEY: "k",
        PADDLE_CLIENT_TOKEN: "t",
        PADDLE_WEBHOOK_SECRET: "s",
        PADDLE_PRICE_MONTHLY: "pri_m",
        PADDLE_PRICE_YEARLY: "pri_y",
      }),
    ).toMatchObject({ env: "sandbox" });
  });
});
