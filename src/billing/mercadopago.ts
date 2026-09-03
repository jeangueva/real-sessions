/**
 * Mercado Pago, for the paid plan.
 *
 * Chosen over the usual international processors because this product is for
 * Latin American candidates, and Mercado Pago is what they already have. A
 * checkout that asks for an international credit card excludes a large share
 * of exactly the people this is for.
 *
 * Recurring billing there is a *preapproval*: the payer authorises us to charge
 * them on a schedule. We create one, send them to `init_point` to authorise it,
 * and Mercado Pago notifies us when its status changes.
 *
 * Two rules govern everything below, and both are about not trusting the wire:
 *
 *   The webhook body is never believed. It says "something happened to id X";
 *   the status is then read back from the API. A notification is an unsigned
 *   claim about our own billing state, and treating its payload as truth is how
 *   a forged POST becomes a free subscription.
 *
 *   The signature is checked before anything else, in constant time, with a
 *   freshness window. Mercado Pago signs a manifest built from the id, the
 *   request id and a timestamp; without the timestamp check a captured valid
 *   notification can be replayed forever.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

const API = "https://api.mercadopago.com";

/** Rejects a notification older than this. Mercado Pago retries within minutes. */
export const SIGNATURE_TOLERANCE_MS = 10 * 60 * 1000;

/** Status values Mercado Pago reports for a preapproval. */
export type PreapprovalStatus = "pending" | "authorized" | "paused" | "cancelled";

export interface Preapproval {
  id: string;
  status: PreapprovalStatus;
  /** Our own identity, round-tripped so a notification can find its owner. */
  externalReference: string | null;
  /** When the current paid period ends, if Mercado Pago reported one. */
  nextPaymentDate: string | null;
}

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/**
 * Mercado Pago's test access tokens carry this prefix; production ones do not.
 *
 * Worth being precise about what this can and cannot tell you. A `TEST-` token
 * cannot move real money, so seeing it is a reliable *all clear*. The absence
 * of it is not proof of the opposite — a token minted for a sandbox test user
 * looks exactly like a production one — which is why the check below treats
 * "not obviously test" as "assume real money" and asks for an explicit answer
 * rather than guessing.
 */
export const TEST_TOKEN_PREFIX = "TEST-";

/** True when the configured token demonstrably cannot charge anyone. */
export function usesTestCredentials(
  token = process.env.MERCADOPAGO_ACCESS_TOKEN,
): boolean {
  return Boolean(token?.startsWith(TEST_TOKEN_PREFIX));
}

/** The operator's explicit "yes, this deployment charges real money". */
export function liveBillingEnabled(): boolean {
  return process.env.MERCADOPAGO_LIVE === "1";
}

/**
 * Why checkout is refused, or null when it may proceed.
 *
 * The failure this exists to prevent is quiet and expensive: production
 * credentials pasted into a staging deployment, or left behind after a test,
 * and the first real candidate who clicks Upgrade is charged for real. Nothing
 * in the flow would look wrong — Mercado Pago would do exactly what it was
 * asked.
 *
 * So real-money billing is opt-in rather than a side effect of which token
 * happens to be set. A `TEST-` token needs no opt-in: it cannot charge anyone,
 * and making the sandbox harder to run than production would push people
 * towards testing against production.
 *
 * Deliberately not applied to the webhook. That route only reads a status back
 * and reconciles it, and refusing there would strand someone who is already
 * paying — the opposite of the harm being prevented.
 */
export function checkoutBlockReason(): string | null {
  if (usesTestCredentials()) return null;
  if (liveBillingEnabled()) return null;
  return (
    "Live billing is not enabled on this deployment. The configured Mercado " +
    "Pago token is not a test token, so a checkout here would charge real " +
    "money. Set MERCADOPAGO_LIVE=1 to allow it, or use test credentials."
  );
}

export interface PlanConfig {
  /** Amount per period, in the currency of the Mercado Pago account. */
  amount: number;
  /** ISO code the account is denominated in — ARS, BRL, MXN, CLP, COP, PEN, UYU. */
  currency: string;
}

/**
 * Price and currency come from the environment.
 *
 * Mercado Pago charges in the currency of the seller's country, so there is no
 * single correct default: "$9" is a different product decision in Buenos Aires
 * than in São Paulo. The values are read rather than assumed, and the server
 * refuses to build a checkout without them rather than inventing a price.
 */
export function planConfig(): PlanConfig | null {
  const amount = Number(process.env.MERCADOPAGO_AMOUNT);
  const currency = process.env.MERCADOPAGO_CURRENCY;
  if (!Number.isFinite(amount) || amount <= 0 || !currency) return null;
  return { amount, currency };
}

/**
 * Verifies the `x-signature` header.
 *
 * The manifest format is Mercado Pago's, not ours: `id:<id>;request-id:<rid>;ts:<ts>;`
 * hashed with HMAC-SHA256 under the webhook secret. Returns a reason rather
 * than a bare false so a rejected notification can be logged usefully — a
 * misconfigured secret and a replay attempt look identical otherwise.
 */
export function verifySignature(input: {
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
  secret: string | undefined;
  now?: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.secret) return { ok: false, reason: "no webhook secret configured" };
  if (!input.signature) return { ok: false, reason: "missing x-signature" };
  if (!input.dataId) return { ok: false, reason: "missing data.id" };

  // "ts=1704908010,v1=abc..." — order is not guaranteed, so it is parsed
  // rather than split positionally.
  const parts = new Map<string, string>();
  for (const piece of input.signature.split(",")) {
    const index = piece.indexOf("=");
    if (index === -1) continue;
    parts.set(piece.slice(0, index).trim(), piece.slice(index + 1).trim());
  }

  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return { ok: false, reason: "malformed x-signature" };

  const stamped = Number(ts);
  if (!Number.isFinite(stamped)) return { ok: false, reason: "malformed timestamp" };
  // Mercado Pago sends seconds. A captured notification stays valid forever
  // without this, so a single leaked one would be replayable indefinitely.
  const age = Math.abs((input.now ?? Date.now()) - stamped * 1000);
  if (age > SIGNATURE_TOLERANCE_MS) return { ok: false, reason: "stale timestamp" };

  const manifest = `id:${input.dataId};request-id:${input.requestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");

  const given = Buffer.from(v1, "hex");
  const mine = Buffer.from(expected, "hex");
  // Length is checked first because timingSafeEqual throws on a mismatch, and
  // the throw itself would leak the length through timing.
  if (given.length !== mine.length) return { ok: false, reason: "signature mismatch" };
  if (!timingSafeEqual(given, mine)) return { ok: false, reason: "signature mismatch" };

  return { ok: true };
}

async function call<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set.");

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    // The provider's own message, not ours: "invalid payer email" is worth
    // seeing in a log, and inventing a generic string would hide it.
    throw new Error(
      `Mercado Pago ${init.method} ${path} failed (${response.status}): ${
        typeof body["message"] === "string" ? body["message"] : "unknown error"
      }`,
    );
  }
  return body as T;
}

interface RawPreapproval {
  id?: string;
  status?: string;
  external_reference?: string;
  next_payment_date?: string;
  init_point?: string;
}

function readPreapproval(raw: RawPreapproval): Preapproval {
  const status = raw.status ?? "";
  return {
    id: String(raw.id ?? ""),
    // Anything unrecognised is treated as pending rather than authorized:
    // the failure mode of guessing wrong here is granting a plan nobody paid
    // for, so an unknown status must never mean access.
    status: (["pending", "authorized", "paused", "cancelled"] as const).includes(
      status as PreapprovalStatus,
    )
      ? (status as PreapprovalStatus)
      : "pending",
    externalReference: raw.external_reference ?? null,
    nextPaymentDate: raw.next_payment_date ?? null,
  };
}

/**
 * Opens a subscription and returns where to send the payer.
 *
 * `externalReference` is our identity. It comes back on every notification,
 * which is what lets a webhook find the owner without trusting anything the
 * caller sent.
 */
export async function createPreapproval(input: {
  externalReference: string;
  payerEmail: string;
  backUrl: string;
  reason: string;
  plan: PlanConfig;
}): Promise<{ id: string; initPoint: string }> {
  const raw = await call<RawPreapproval>("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.plan.amount,
        currency_id: input.plan.currency,
      },
      status: "pending",
    }),
  });

  if (!raw.id || !raw.init_point) {
    throw new Error("Mercado Pago returned a preapproval with no id or checkout URL.");
  }
  return { id: String(raw.id), initPoint: raw.init_point };
}

/** Reads the authoritative state of a subscription. */
export async function fetchPreapproval(id: string): Promise<Preapproval> {
  return readPreapproval(
    await call<RawPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
      method: "GET",
    }),
  );
}

/** Cancels a subscription. Mercado Pago has no "delete"; cancelled is terminal. */
export async function cancelPreapproval(id: string): Promise<void> {
  await call(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

/**
 * Whether a status should carry the paid plan.
 *
 * Only `authorized` does. `paused` is Mercado Pago's state for a subscription
 * whose payment failed and is being retried — the honest reading is that they
 * are not currently paying, and treating it as active gives away the product
 * for as long as the retries continue.
 */
export function grantsAccess(status: PreapprovalStatus): boolean {
  return status === "authorized";
}
