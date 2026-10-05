import { createHmac, timingSafeEqual } from "node:crypto";
import type { PreapprovalStatus } from "./mercadopago.js";
import { COUNTRIES, PADDLE_EXCLUDED, TIER_PRICES } from "./regions.js";
import type { RegionalPrice, Tier } from "./regions.js";

/**
 * Paddle: subscriptions outside Peru, charged in the reader's currency.
 *
 * Paddle is merchant of record — the legal seller — so it also works out,
 * collects and remits each country's sales tax, which is the part of selling
 * to Europe that one person cannot do by hand. It pays out in dollars to a
 * Peruvian bank account.
 *
 * Every piece of configuration comes from the environment, and any missing
 * piece leaves Paddle off: `regionFor` then routes every country to Mercado
 * Pago, which is how the product sold before Paddle existed. Off is a working
 * state, not an error.
 *
 *   PADDLE_ENV             sandbox | production
 *   PADDLE_API_KEY         server-side API key
 *   PADDLE_CLIENT_TOKEN    public token for Paddle.js in the browser
 *   PADDLE_WEBHOOK_SECRET  the notification destination's secret
 *   PADDLE_PRICE_MONTHLY   price id (pri_…) of the monthly price
 *   PADDLE_PRICE_YEARLY    price id (pri_…) of the yearly price
 */

export type PaddleEnv = "sandbox" | "production";

export interface PaddleConfig {
  env: PaddleEnv;
  apiKey: string;
  clientToken: string;
  webhookSecret: string;
  priceMonthly: string;
  priceYearly: string;
}

export function paddleConfig(env: NodeJS.ProcessEnv = process.env): PaddleConfig | null {
  const mode = env.PADDLE_ENV?.trim();
  if (mode !== "sandbox" && mode !== "production") return null;
  const apiKey = env.PADDLE_API_KEY?.trim();
  const clientToken = env.PADDLE_CLIENT_TOKEN?.trim();
  const webhookSecret = env.PADDLE_WEBHOOK_SECRET?.trim();
  const priceMonthly = env.PADDLE_PRICE_MONTHLY?.trim();
  const priceYearly = env.PADDLE_PRICE_YEARLY?.trim();
  if (!apiKey || !clientToken || !webhookSecret || !priceMonthly || !priceYearly) return null;
  return { env: mode, apiKey, clientToken, webhookSecret, priceMonthly, priceYearly };
}

export function paddleApiBase(env: PaddleEnv): string {
  return env === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

/**
 * Currencies Paddle counts in whole units. Everything else is in hundredths.
 *
 * Paddle documents five; three are confirmed here (CLP, JPY, KRW) and VND is
 * zero-decimal in ISO 4217. Getting one wrong charges a hundred times the
 * price, so `scripts/paddle-prices.ts` previews every currency against Paddle
 * before trusting this list — it is a first guess, not the safeguard.
 */
export const ZERO_DECIMAL = new Set(["CLP", "JPY", "KRW", "VND"]);

/** An amount in Paddle's lowest denomination, as the string the API takes. */
export function minorUnits(amount: number, currency: string): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  return String(Math.round(amount * factor));
}

export interface PriceOverride {
  country_codes: string[];
  unit_price: { amount: string; currency_code: string };
}

/**
 * The per-country prices for one cycle, grouped the way Paddle takes them:
 * one override per (amount, currency), listing every country it applies to.
 *
 * The base price is tier 2 in dollars — what a country absent from the table
 * pays, the same default `regionFor` shows.
 */
export function overridesFor(cycle: "monthly" | "yearly"): {
  base: { amount: string; currency_code: string };
  overrides: PriceOverride[];
} {
  const groups = new Map<string, PriceOverride>();
  for (const [country, [tier, currency]] of Object.entries(COUNTRIES)) {
    // Peru is sold through Mercado Pago; sanctioned countries not at all.
    if (country === "PE" || PADDLE_EXCLUDED.has(country)) continue;
    const prices = TIER_PRICES[tier as Tier];
    const price: RegionalPrice = prices[currency] ?? prices.USD!;
    const amount = minorUnits(price[cycle], price.currency);
    const key = `${price.currency}:${amount}`;
    const group = groups.get(key) ?? {
      country_codes: [],
      unit_price: { amount, currency_code: price.currency },
    };
    group.country_codes.push(country);
    groups.set(key, group);
  }
  const base = TIER_PRICES[2].USD!;
  return {
    base: { amount: minorUnits(base[cycle], "USD"), currency_code: "USD" },
    overrides: [...groups.values()].map((group) => ({
      ...group,
      country_codes: group.country_codes.sort(),
    })),
  };
}

/**
 * Verifies a `Paddle-Signature` header: `ts=<unix>;h1=<hex hmac>`, where the
 * HMAC-SHA256 is over `${ts}:${rawBody}` with the destination's secret.
 *
 * The tolerance is five minutes, not the SDK's five seconds: a few seconds of
 * clock drift on the host would otherwise reject every notification, and the
 * timestamp is inside the signature, so it cannot be moved by a replay.
 */
export function verifyPaddleSignature(input: {
  header: string | undefined;
  rawBody: string;
  secret: string;
  now?: number;
  toleranceMs?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.header) return { ok: false, reason: "missing Paddle-Signature" };
  const parts = Object.fromEntries(
    input.header.split(";").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim(), rest.join("=").trim()];
    }),
  );
  const ts = Number(parts.ts);
  const signatures = input.header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("h1="))
    .map((part) => part.slice(3));
  if (!Number.isFinite(ts) || signatures.length === 0) return { ok: false, reason: "malformed header" };
  const now = input.now ?? Date.now();
  if (Math.abs(now - ts * 1000) > (input.toleranceMs ?? 5 * 60 * 1000)) {
    return { ok: false, reason: "stale timestamp" };
  }
  const expected = createHmac("sha256", input.secret).update(`${ts}:${input.rawBody}`).digest();
  const matches = signatures.some((hex) => {
    const given = Buffer.from(hex, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  return matches ? { ok: true } : { ok: false, reason: "signature mismatch" };
}

/** The parts of a Paddle subscription event this product acts on. */
export interface PaddleSubscription {
  id: string;
  status: PreapprovalStatus;
  /** Our account id, sent as custom_data when the checkout opened. */
  ownerId: string | null;
  /** End of the period already paid for. */
  periodEnd: Date | null;
}

/**
 * Paddle's status, in the vocabulary the subscription store already speaks.
 *
 *   active, trialing   authorized — premium
 *   past_due           authorized — Paddle is retrying the card; cutting
 *                      access during a retry punishes a bank's hiccup
 *   paused             paused
 *   canceled           cancelled — the grant still runs to the period end
 */
export function mapPaddleStatus(status: string): PreapprovalStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
      return "authorized";
    case "paused":
      return "paused";
    case "canceled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function parseSubscriptionEvent(body: unknown): PaddleSubscription | null {
  if (!body || typeof body !== "object") return null;
  const event = body as { event_type?: unknown; data?: unknown };
  if (typeof event.event_type !== "string" || !event.event_type.startsWith("subscription.")) return null;
  return parseSubscription(event.data);
}

/** A subscription entity, as in a webhook's `data` or a GET response's. */
export function parseSubscription(raw: unknown): PaddleSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.status !== "string") return null;
  const custom = (data.custom_data ?? {}) as Record<string, unknown>;
  const period = (data.current_billing_period ?? null) as { ends_at?: unknown } | null;
  const end = typeof period?.ends_at === "string" ? new Date(period.ends_at) : null;
  return {
    id: data.id,
    status: mapPaddleStatus(data.status),
    ownerId: typeof custom.ownerId === "string" ? custom.ownerId : null,
    periodEnd: end && !Number.isNaN(end.getTime()) ? end : null,
  };
}

/**
 * Cancels at the end of the paid period — the same promise the Mercado Pago
 * side keeps: what was paid for is kept.
 */
export async function cancelPaddleSubscription(
  config: PaddleConfig,
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(`${paddleApiBase(config.env)}/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ effective_from: "next_billing_period" }),
  });
  if (!response.ok) {
    throw new Error(`Paddle cancel failed (${response.status})`);
  }
}

/** The provider's current view of one subscription. */
export async function fetchPaddleSubscription(
  config: PaddleConfig,
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<PaddleSubscription | null> {
  const response = await fetcher(`${paddleApiBase(config.env)}/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  if (!response.ok) throw new Error(`Paddle subscription read failed (${response.status})`);
  const body = (await response.json()) as { data?: unknown };
  return parseSubscription(body.data);
}
