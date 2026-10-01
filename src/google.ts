/**
 * Proving that Google really said what a browser claims it said.
 *
 * The sign-in flow here is the one that needs no client secret: Google hands
 * the browser a signed JWT and the browser posts it to us. Which means this
 * file is the entire security boundary. A browser can send any string it
 * likes, so everything downstream — linking to an existing account, creating
 * one — is only as safe as what happens here.
 *
 * No client secret exists in this design, deliberately. A secret is a thing
 * that leaks, gets committed, needs rotating, and sits in a chat log
 * somewhere; Google's public keys are public, and verification needs nothing
 * else. The Client ID is not a secret either — it ships inside the HTML of
 * every site that uses Google sign-in.
 *
 * No dependency for any of it. `node:crypto` imports a JWK and verifies
 * RS256, and a JWT is three base64url strings with a dot between them. A JWT
 * library here would be a supply-chain surface in the one file where that
 * matters most.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";
import process from "node:process";
import { normalizeEmail } from "./accounts.js";

/** Where Google publishes the keys it signs with. */
const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

/**
 * The two issuers Google uses.
 *
 * Both are correct and which one appears is not under our control, so both
 * are accepted and nothing else is.
 */
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

/** How long a fetched key set is trusted when Google does not say. */
const DEFAULT_KEY_TTL_MS = 60 * 60 * 1000;

/**
 * Tolerance for clocks that disagree.
 *
 * Small on purpose. A minute covers an unsynchronised server; an hour would
 * mean an expired token still works long after Google considers it dead.
 */
const CLOCK_SKEW_MS = 60 * 1000;

/** The Client ID, or null when sign-in with Google is not configured. */
export function googleClientId(): string | null {
  const value = process.env.GOOGLE_CLIENT_ID?.trim();
  return value ? value : null;
}

export interface GoogleIdentity {
  /** Normalised, and proven to belong to them — see `email_verified` below. */
  email: string;
  /** Google's own stable id for the person. Not an email, never reassigned. */
  subject: string;
  /** Their display name, when Google supplies one. */
  name: string | null;
}

/** A JSON Web Key as Google publishes it. */
interface Jwk {
  kid?: string;
  kty?: string;
  alg?: string;
  n?: string;
  e?: string;
}

interface KeyCache {
  keys: Jwk[];
  expiresAt: number;
}

let cache: KeyCache | null = null;

/** Clears the cached key set. For tests, and for a key rotation gone wrong. */
export function forgetGoogleKeys(): void {
  cache = null;
}

/**
 * Google's current signing keys, cached.
 *
 * Cached because this is on the sign-in path and Google rotates keys on the
 * order of days, not requests — fetching per sign-in would add a round trip to
 * every one of them and would make Google's availability our availability.
 *
 * The TTL comes from their own `cache-control` when present, so a rotation is
 * picked up as fast as they intend it to be.
 */
async function googleKeys(now: number): Promise<Jwk[]> {
  if (cache && cache.expiresAt > now) return cache.keys;
  const response = await fetch(CERTS_URL);
  if (!response.ok) throw new Error(`Google keys unavailable (${response.status}).`);
  const body = (await response.json()) as { keys?: Jwk[] };
  const keys = body.keys ?? [];
  const maxAge = /max-age=(\d+)/i.exec(response.headers.get("cache-control") ?? "");
  const ttl = maxAge?.[1] ? Number(maxAge[1]) * 1000 : DEFAULT_KEY_TTL_MS;
  cache = { keys, expiresAt: now + ttl };
  return keys;
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

/**
 * Verifies a Google ID token and returns who it is about.
 *
 * Throws on anything that is not a valid token for this application. Throwing
 * rather than returning null is the point: there is no partially-trusted
 * outcome here, and a caller that forgets to check a null would sign somebody
 * in as whoever they asked to be.
 *
 * `keys` is injectable so the tests can verify against a key pair they
 * generated, rather than against Google and the network.
 */
export async function verifyGoogleIdToken(
  token: string,
  options: {
    clientId: string;
    now?: number;
    keys?: () => Promise<Jwk[]>;
  },
): Promise<GoogleIdentity> {
  const now = options.now ?? Date.now();
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("That is not a Google token.");
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = decodeSegment(headerPart) as { alg?: string; kid?: string };
  /**
   * RS256 only, and checked before anything else.
   *
   * `alg: none` and the HS256 confusion trick are the two oldest JWT attacks
   * there are, and both work by getting the verifier to honour an algorithm
   * the token itself chose. The token does not get to choose.
   */
  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm.");

  const available = await (options.keys ?? (() => googleKeys(now)))();
  const jwk = available.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key.");

  const signed = Buffer.from(`${headerPart}.${payloadPart}`, "utf8");
  const signature = Buffer.from(signaturePart, "base64url");
  const key = createPublicKey({ key: jwk as never, format: "jwk" });
  if (!verifySignature("RSA-SHA256", signed, key, signature)) {
    throw new Error("That token was not signed by Google.");
  }

  const payload = decodeSegment(payloadPart) as {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };

  if (!payload.iss || !ISSUERS.has(payload.iss)) throw new Error("Wrong issuer.");
  /**
   * The audience check, which is the one that stops a token minted for a
   * different application from working here. Without it, anybody running any
   * Google-connected site could take a token their own users handed them and
   * sign in as those people on Mockio.
   */
  if (payload.aud !== options.clientId) throw new Error("That token is for another app.");
  if (typeof payload.exp !== "number" || payload.exp * 1000 + CLOCK_SKEW_MS < now) {
    throw new Error("That token has expired.");
  }

  /**
   * And the check that makes linking by email safe at all.
   *
   * A Workspace administrator can create an address they do not own, and
   * Google says so by leaving this false. Accepting it would mean anybody able
   * to create such an address could walk into the Mockio account belonging to
   * whoever already uses that email. Google sends it as a boolean or as the
   * string "true" depending on the path, so both are accepted and nothing
   * else is.
   */
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!verified) throw new Error("Google has not verified that address.");

  const email = normalizeEmail(payload.email);
  if (!email) throw new Error("That token carries no address.");
  if (!payload.sub) throw new Error("That token carries no subject.");

  return { email, subject: payload.sub, name: payload.name?.trim() || null };
}
