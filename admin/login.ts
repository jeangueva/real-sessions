/**
 * Sign-in for the admin: a six-digit code sent to an allowlisted address.
 *
 * Nothing to remember and nothing to leak: there is no password, the code is
 * good for ten minutes and five guesses, and only addresses in ADMIN_EMAILS
 * ever receive one. Every request to send a code gets the same answer whether
 * the address is allowed or not, so the form cannot be used to discover who
 * the admins are.
 *
 * Codes live in memory. This is one small instance, and a code lost to a
 * restart costs one more email — while keeping them out of Redis is what lets
 * this service hold read-only credentials for everything.
 *
 * The session is a signed cookie (HMAC-SHA256 over email and expiry), so it
 * survives the free plan's sleep without any server-side store.
 */
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_GUESSES = 5;
export const SESSION_MS = 24 * 60 * 60 * 1000;
export const COOKIE = "mockio_admin";

const hash = (value: string) => createHash("sha256").update(value).digest();

interface Pending {
  digest: Buffer;
  expiresAt: number;
  guesses: number;
}

/** A fixed-window counter: at most `limit` events per key per `windowMs`. */
export class Limiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Counts one event; false when the key is already over its limit. */
  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

export class Codes {
  private readonly pending = new Map<string, Pending>();

  /** A fresh code for this address, replacing any earlier one. */
  issue(email: string, now = Date.now()): string {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    this.pending.set(email, { digest: hash(code), expiresAt: now + CODE_TTL_MS, guesses: 0 });
    return code;
  }

  /**
   * Whether `code` is the live code for this address. A right answer uses it
   * up; the fifth wrong one does too, so a code cannot be ground through.
   */
  check(email: string, code: string, now = Date.now()): boolean {
    const entry = this.pending.get(email);
    if (!entry || entry.expiresAt <= now) {
      this.pending.delete(email);
      return false;
    }
    entry.guesses += 1;
    const ok = /^\d{6}$/.test(code) && timingSafeEqual(entry.digest, hash(code));
    if (ok || entry.guesses >= MAX_GUESSES) this.pending.delete(email);
    return ok;
  }
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** The cookie value for a signed-in admin. */
export function sessionCookie(email: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: now + SESSION_MS })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * The email in a valid, unexpired session cookie that is still on the
 * allowlist — removing someone from ADMIN_EMAILS signs them out at once.
 */
export function readSession(
  value: string | undefined,
  secret: string,
  allowed: Set<string>,
  now = Date.now(),
): string | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown;
      exp?: unknown;
    };
    if (typeof email !== "string" || typeof exp !== "number" || exp <= now) return null;
    return allowed.has(email) ? email : null;
  } catch {
    return null;
  }
}

/** One cookie by name from a Cookie header. */
export function cookieValue(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

export function allowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}
