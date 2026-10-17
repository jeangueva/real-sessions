/**
 * Proving that Google really said what a browser claims it said.
 *
 * Two credentials arrive here, from the same button, and neither needs a
 * client secret:
 *
 * - An ID token: a JWT Google signed, verified offline against Google's public
 *   keys. This was the only path while the sign-in screen used Google's own
 *   iframe button, and it stays exactly as it was.
 * - An access token: what the sign-in screen's own button gets now, from the
 *   OAuth 2.0 token model (`google.accounts.oauth2.initTokenClient`, popup).
 *   It is opaque, so it is checked by asking Google about it — `tokeninfo`
 *   for who it was minted for, `userinfo` for whose it is.
 *
 * Either way a browser can send any string it likes, so this file is the
 * entire security boundary. Everything downstream — linking to an existing
 * account, creating one — is only as safe as what happens here.
 *
 * No client secret exists in this design, deliberately. A secret is a thing
 * that leaks, gets committed, needs rotating, and sits in a chat log
 * somewhere. The ID token needs only Google's public keys; the access token
 * needs nothing but itself, because the token model is the browser-only grant
 * (no code to exchange) and Google answers `tokeninfo` and `userinfo` for the
 * bearer. The Client ID is not a secret either — it ships inside the HTML of
 * every site that uses Google sign-in.
 *
 * No dependency for any of it. `node:crypto` imports a JWK and verifies
 * RS256, a JWT is three base64url strings with a dot between them, and the
 * access-token path is two `fetch` calls. A Google SDK here would be a
 * supply-chain surface in the one file where that matters most.
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

/** Where Google says who an access token was minted for, and until when. */
const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

/** Where Google says whose an access token is. */
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/**
 * Verifies a Google OAuth access token and returns who it belongs to.
 *
 * An access token is opaque, so unlike the ID token there is nothing to check
 * offline: the proof is Google's own answer about it. Two questions, and both
 * answers are required to line up:
 *
 * 1. `tokeninfo` — who was this minted for? It must be for *our* Client ID.
 *    This is the access-token version of the audience check, and the one that
 *    matters most: an access token from any other Google-connected site would
 *    otherwise answer `userinfo` just as happily, and anybody running such a
 *    site could sign in here as each of their users. `azp` is checked too
 *    when present, so a token authorised by another party for our audience
 *    does not slip through either.
 * 2. `userinfo` — whose is it? The address must be one Google has verified
 *    (the same reason as `email_verified` on the ID token: linking by email
 *    is only safe for a proved address), and its `sub` must be the one
 *    `tokeninfo` named, so the two answers are about the same person.
 *
 * Throws on anything else, including Google being unreachable — there is no
 * partially-trusted outcome, and failing closed is the only safe failure.
 *
 * `fetchImpl` is injectable so the tests can play Google without a network.
 */
export async function verifyGoogleAccessToken(
  token: string,
  options: { clientId: string; now?: number },
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleIdentity> {
  const now = options.now ?? Date.now();
  // Shape only: Google's tokens are URL-safe base64-ish with dots, and
  // anything else is refused before it is put in a URL or a header.
  if (!token || token.length > 4096 || !/^[\w.~+/=-]+$/.test(token)) {
    throw new Error("That is not a Google access token.");
  }

  const infoResponse = await fetchImpl(
    `${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`,
  );
  if (!infoResponse.ok) throw new Error(`Google refused the token (${infoResponse.status}).`);
  const info = (await infoResponse.json()) as {
    aud?: string;
    azp?: string;
    sub?: string;
    scope?: string;
    exp?: string | number;
    expires_in?: string | number;
  };

  if (info.aud !== options.clientId) throw new Error("That token is for another app.");
  if (info.azp !== undefined && info.azp !== options.clientId) {
    throw new Error("That token was authorised by another app.");
  }

  /**
   * Expired by either clock. Google normally refuses an expired token itself,
   * so this is belt and braces — but it costs nothing, and a missing expiry
   * is treated as expired rather than as eternal.
   */
  const exp = Number(info.exp);
  const expiresIn = Number(info.expires_in);
  if (info.exp === undefined && info.expires_in === undefined) {
    throw new Error("That token carries no expiry.");
  }
  if (info.exp !== undefined && (!Number.isFinite(exp) || exp * 1000 + CLOCK_SKEW_MS < now)) {
    throw new Error("That token has expired.");
  }
  if (info.expires_in !== undefined && (!Number.isFinite(expiresIn) || expiresIn <= 0)) {
    throw new Error("That token has expired.");
  }

  const scopes = new Set((info.scope ?? "").split(/\s+/));
  if (!scopes.has("email") && !scopes.has("https://www.googleapis.com/auth/userinfo.email")) {
    throw new Error("That token cannot read an address.");
  }
  if (!info.sub) throw new Error("That token carries no subject.");

  const userResponse = await fetchImpl(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) throw new Error(`Google would not say whose token it is (${userResponse.status}).`);
  const user = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };

  if (user.sub !== info.sub) throw new Error("Google's two answers disagree about who this is.");
  // Strictly true here: the OpenID userinfo endpoint sends a boolean, and a
  // string or a missing field is not a yes.
  if (user.email_verified !== true) throw new Error("Google has not verified that address.");

  const email = normalizeEmail(user.email);
  if (!email) throw new Error("That token carries no address.");

  return { email, subject: info.sub, name: user.name?.trim() || null };
}
