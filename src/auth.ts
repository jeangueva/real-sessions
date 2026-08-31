/**
 * Identity for the API.
 *
 * This is not a user-account system: there is no user store yet, so what it
 * issues is a signed, expiring identity token that makes every request
 * attributable. That is the minimum needed to rate-limit per caller and to
 * stop one caller from reading another's interview.
 *
 * Tokens are HMAC-SHA256 signed and stateless — the server keeps no session
 * table, so a restart does not log everyone out. They live in an httpOnly
 * cookie, which keeps them out of reach of page scripts.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import process from "node:process";

const COOKIE_NAME = "ts360_id";
/**
 * A guest identity is a browser convenience and expires quickly. A signed-in
 * account is the thing someone's history hangs off, so it lasts long enough
 * that weekly practice does not silently lose it.
 */
const GUEST_TTL_MS = 12 * 60 * 60 * 1000;
const USER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Exported so the server can derive a token's issue time from its expiry. */
export const USER_TOKEN_TTL_MS = USER_TTL_MS;

/**
 * A missing secret must not silently produce forgeable tokens in production,
 * and must not block local development either.
 */
const SECRET = (() => {
  const configured = process.env.TECHSHADOW_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "TECHSHADOW_SESSION_SECRET must be set to at least 32 characters in production.",
    );
  }
  console.warn(
    "[techshadow] TECHSHADOW_SESSION_SECRET unset — using an ephemeral dev secret. " +
      "Tokens will not survive a restart.",
  );
  return randomBytes(32).toString("hex");
})();

/** Optional shared code gating who may obtain an identity at all. */
const ACCESS_CODE = process.env.TECHSHADOW_ACCESS_CODE;

export interface Identity {
  id: string;
  expiresAt: number;
  /**
   * `guest` is an anonymous browser identity; `user` is a signed-in account.
   * Carried in the signed payload so it cannot be edited client-side.
   */
  kind: "guest" | "user";
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function issueToken(
  options: { kind?: "guest" | "user"; id?: string } = {},
): { token: string; identity: Identity } {
  const kind = options.kind ?? "guest";
  const identity: Identity = {
    id: options.id ?? randomBytes(16).toString("hex"),
    expiresAt: Date.now() + (kind === "user" ? USER_TTL_MS : GUEST_TTL_MS),
    kind,
  };
  const payload = `${kind}.${identity.id}.${identity.expiresAt}`;
  return { token: `${payload}.${sign(payload)}`, identity };
}

/** Returns null for anything malformed, tampered with, or expired. */
export function verifyToken(token: string | undefined): Identity | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [kindRaw, id, expiresRaw, signature] = parts as [
    string, string, string, string,
  ];
  if (kindRaw !== "guest" && kindRaw !== "user") return null;

  const expected = sign(`${kindRaw}.${id}.${expiresRaw}`);
  // Compare in constant time; a length mismatch alone would leak information
  // through timingSafeEqual throwing, so check that first.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  return { id, expiresAt, kind: kindRaw };
}

/**
 * Checks the shared access code, when one is configured. Compared in constant
 * time so the endpoint cannot be used as an oracle to guess it character by
 * character.
 */
export function accessCodeAccepted(supplied: unknown): boolean {
  if (!ACCESS_CODE) return true;
  if (typeof supplied !== "string") return false;

  const a = Buffer.from(supplied);
  const b = Buffer.from(ACCESS_CODE);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requiresAccessCode(): boolean {
  return Boolean(ACCESS_CODE);
}

export function readCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=");
  }
  return undefined;
}

export function cookieHeader(
  token: string,
  secure: boolean,
  kind: "guest" | "user" = "guest",
): string {
  const attributes = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    // Lax still sends the cookie on top-level navigation but blocks the
    // cross-site POSTs that CSRF depends on.
    "SameSite=Lax",
    `Max-Age=${Math.floor((kind === "user" ? USER_TTL_MS : GUEST_TTL_MS) / 1000)}`,
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

/** Expires the cookie immediately. Used on sign-out. */
export function clearCookieHeader(secure: boolean): string {
  const attributes = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
