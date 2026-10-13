/**
 * LTI 1.3: Mockio inside a university's own platform.
 *
 * Moodle, Canvas, Blackboard Learn, D2L Brightspace and Sakai all speak it.
 * The university adds Mockio as an external tool once; after that a student
 * clicks it in their course and lands in Mockio already signed in, already
 * in their school's cohort, with no account to make. When a rehearsal is
 * graded, the record's grade goes back to the course's gradebook.
 *
 * The flow is OpenID Connect, initiated by the platform:
 *   1. the platform calls /lti/login with who is asking;
 *   2. Mockio answers with a redirect to the platform's authorisation URL,
 *      carrying a `state` and a `nonce` it signed;
 *   3. the platform posts an id_token (a JWT it signed) to /lti/launch;
 *   4. Mockio checks the signature against the platform's published keys,
 *      the issuer, the audience, the expiry, the nonce and the deployment,
 *      and only then signs the person in.
 *
 * No library: RS256 over Node's own crypto, keys read as JWK. The checks are
 * the ones the IMS security framework lists, and every one is a refusal.
 */
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign as signData,
  timingSafeEqual,
  verify as verifyData,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";
import type { DbPool } from "./db/index.js";

/* ------------------------------------------------------------------------- */
/* Platforms                                                                 */
/* ------------------------------------------------------------------------- */

/** One university platform, registered by hand from the admin. */
export interface LtiPlatform {
  id: number;
  /** The `iss` its tokens carry. */
  issuer: string;
  clientId: string;
  /** Deployments of the tool on that platform; empty accepts any. */
  deploymentIds: string[];
  authLoginUrl: string;
  authTokenUrl: string;
  jwksUrl: string;
  /** The institution whose cohort its students join. */
  institutionCode: string | null;
}

/** Who a platform's user is, here. */
export interface LtiUserLink {
  platformId: number;
  sub: string;
  accountId: string;
  /** Where to post this person's grade, when the course offered one. */
  lineitem: string | null;
}

export interface LtiStore {
  platform(issuer: string, clientId: string | null): Promise<LtiPlatform | null>;
  platformById(id: number): Promise<LtiPlatform | null>;
  register(input: Omit<LtiPlatform, "id">): Promise<LtiPlatform>;
  userBySub(platformId: number, sub: string): Promise<LtiUserLink | null>;
  linkUser(link: LtiUserLink): Promise<void>;
  linkOfAccount(accountId: string): Promise<LtiUserLink | null>;
}

class PostgresLtiStore implements LtiStore {
  constructor(private readonly pool: DbPool) {}

  private toPlatform(row: Record<string, unknown>): LtiPlatform {
    return {
      id: Number(row.id),
      issuer: row.issuer as string,
      clientId: row.client_id as string,
      deploymentIds: (row.deployment_ids as string[] | null) ?? [],
      authLoginUrl: row.auth_login_url as string,
      authTokenUrl: row.auth_token_url as string,
      jwksUrl: row.jwks_url as string,
      institutionCode: (row.institution_code as string | null) ?? null,
    };
  }

  async platform(issuer: string, clientId: string | null) {
    const { rows } = clientId
      ? await this.pool.query(`SELECT * FROM lti_platforms WHERE issuer = $1 AND client_id = $2`, [issuer, clientId])
      : await this.pool.query(`SELECT * FROM lti_platforms WHERE issuer = $1 ORDER BY id LIMIT 2`, [issuer]);
    // Without a client id, only an unambiguous issuer is accepted.
    if (!clientId && rows.length !== 1) return null;
    return rows[0] ? this.toPlatform(rows[0]) : null;
  }

  async platformById(id: number) {
    const { rows } = await this.pool.query(`SELECT * FROM lti_platforms WHERE id = $1`, [id]);
    return rows[0] ? this.toPlatform(rows[0]) : null;
  }

  async register(input: Omit<LtiPlatform, "id">) {
    const { rows } = await this.pool.query(
      `INSERT INTO lti_platforms (issuer, client_id, deployment_ids, auth_login_url, auth_token_url, jwks_url, institution_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (issuer, client_id) DO UPDATE SET deployment_ids = EXCLUDED.deployment_ids,
         auth_login_url = EXCLUDED.auth_login_url, auth_token_url = EXCLUDED.auth_token_url,
         jwks_url = EXCLUDED.jwks_url, institution_code = EXCLUDED.institution_code
       RETURNING *`,
      [input.issuer, input.clientId, input.deploymentIds, input.authLoginUrl, input.authTokenUrl, input.jwksUrl, input.institutionCode],
    );
    return this.toPlatform(rows[0]!);
  }

  async userBySub(platformId: number, sub: string) {
    const { rows } = await this.pool.query(`SELECT * FROM lti_users WHERE platform_id = $1 AND sub = $2`, [platformId, sub]);
    const row = rows[0];
    return row
      ? { platformId, sub, accountId: row.account_id as string, lineitem: (row.lineitem as string | null) ?? null }
      : null;
  }

  async linkUser(link: LtiUserLink) {
    await this.pool.query(
      `INSERT INTO lti_users (platform_id, sub, account_id, lineitem) VALUES ($1, $2, $3, $4)
       ON CONFLICT (platform_id, sub) DO UPDATE SET account_id = EXCLUDED.account_id,
         lineitem = COALESCE(EXCLUDED.lineitem, lti_users.lineitem), updated_at = now()`,
      [link.platformId, link.sub, link.accountId, link.lineitem],
    );
  }

  async linkOfAccount(accountId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM lti_users WHERE account_id = $1 AND lineitem IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
      [accountId],
    );
    const row = rows[0];
    return row
      ? { platformId: Number(row.platform_id), sub: row.sub as string, accountId, lineitem: row.lineitem as string }
      : null;
  }
}

class MemoryLtiStore implements LtiStore {
  private readonly platforms: LtiPlatform[] = [];
  private readonly users: LtiUserLink[] = [];

  async platform(issuer: string, clientId: string | null) {
    const found = this.platforms.filter((p) => p.issuer === issuer && (!clientId || p.clientId === clientId));
    return found.length === 1 ? found[0]! : (clientId ? found[0] ?? null : null);
  }

  async platformById(id: number) {
    return this.platforms.find((p) => p.id === id) ?? null;
  }

  async register(input: Omit<LtiPlatform, "id">) {
    const existing = this.platforms.find((p) => p.issuer === input.issuer && p.clientId === input.clientId);
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    const platform = { ...input, id: this.platforms.length + 1 };
    this.platforms.push(platform);
    return platform;
  }

  async userBySub(platformId: number, sub: string) {
    return this.users.find((u) => u.platformId === platformId && u.sub === sub) ?? null;
  }

  async linkUser(link: LtiUserLink) {
    const existing = this.users.find((u) => u.platformId === link.platformId && u.sub === link.sub);
    if (existing) {
      existing.accountId = link.accountId;
      existing.lineitem = link.lineitem ?? existing.lineitem;
    } else this.users.push({ ...link });
  }

  async linkOfAccount(accountId: string) {
    return [...this.users].reverse().find((u) => u.accountId === accountId && u.lineitem) ?? null;
  }
}

export function createLtiStore(pool: DbPool | null): LtiStore {
  return pool ? new PostgresLtiStore(pool) : new MemoryLtiStore();
}

/* ------------------------------------------------------------------------- */
/* Mockio's own key                                                          */
/* ------------------------------------------------------------------------- */

/**
 * The tool's signing key: platforms read its public half from /lti/jwks, and
 * it signs the assertions that ask a platform for a gradebook token.
 *
 * `LTI_PRIVATE_KEY` (PEM) in production. Without it a key is made at boot,
 * which works until the next restart — enough for a demo, never for a
 * university, because their platform has cached the old public key.
 */
let toolKey: { privateKey: KeyObject; jwk: JsonWebKey & { kid: string } } | null = null;

export function ltiToolKey() {
  if (toolKey) return toolKey;
  const pem = process.env.LTI_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const privateKey = pem
    ? createPrivateKey(pem)
    : generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  if (!pem) console.warn("[mockio] LTI_PRIVATE_KEY unset — using a key that changes on every restart.");
  const publicJwk = createPublicKey(privateKey).export({ format: "jwk" }) as JsonWebKey;
  const kid = createHmac("sha256", "mockio-lti").update(String(publicJwk.n)).digest("base64url").slice(0, 16);
  toolKey = { privateKey, jwk: { ...publicJwk, kid, alg: "RS256", use: "sig" } as JsonWebKey & { kid: string } };
  return toolKey;
}

export function ltiJwks() {
  return { keys: [ltiToolKey().jwk] };
}

/* ------------------------------------------------------------------------- */
/* JWTs                                                                      */
/* ------------------------------------------------------------------------- */

const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function signJwt(payload: Record<string, unknown>): string {
  const { privateKey, jwk } = ltiToolKey();
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT", kid: jwk.kid }));
  const body = b64(JSON.stringify(payload));
  const signature = signData("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey);
  return `${head}.${body}.${b64(signature)}`;
}

/** Reads a platform's published keys. Replaced in tests. */
export type JwksFetcher = (url: string) => Promise<{ keys: (JsonWebKey & { kid?: string })[] }>;

const jwksCache = new Map<string, { at: number; keys: (JsonWebKey & { kid?: string })[] }>();

export const fetchJwks: JwksFetcher = async (url) => {
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.at < 10 * 60_000) return { keys: cached.keys };
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new LtiError(`The platform's keys could not be read (${response.status}).`);
  const body = (await response.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(url, { at: Date.now(), keys });
  return { keys };
};

export class LtiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LtiError";
  }
}

/** Verifies an RS256 JWT against a key set and returns its claims. */
export async function verifyJwt(
  token: string,
  jwksUrl: string,
  fetcher: JwksFetcher = fetchJwks,
): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new LtiError("Malformed token.");
  const [head, body, signature] = parts as [string, string, string];
  let header: { alg?: string; kid?: string };
  let claims: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(head, "base64url").toString("utf8"));
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new LtiError("Malformed token.");
  }
  // RS256 only: "none" and the HMAC family are how JWT verification is
  // usually broken, and no LTI platform signs any other way.
  if (header.alg !== "RS256") throw new LtiError("Unsupported signing algorithm.");
  const { keys } = await fetcher(jwksUrl);
  const candidates = header.kid ? keys.filter((key) => key.kid === header.kid) : keys;
  const valid = candidates.some((jwk) => {
    try {
      const key = createPublicKey({ key: jwk, format: "jwk" });
      return verifyData("RSA-SHA256", Buffer.from(`${head}.${body}`), key, Buffer.from(signature, "base64url"));
    } catch {
      return false;
    }
  });
  if (!valid) throw new LtiError("The token's signature is not the platform's.");
  return claims;
}

/* ------------------------------------------------------------------------- */
/* State and nonce                                                           */
/* ------------------------------------------------------------------------- */

const STATE_TTL_MS = 10 * 60_000;

function stateSecret(): string {
  return process.env.REALSESSIONS_SESSION_SECRET ?? "mockio-lti-dev-state";
}

/**
 * The state is signed rather than stored: the launch comes back as a
 * cross-site form post, which a SameSite cookie would not survive, and a
 * signed value needs no shared storage between instances. The nonce inside
 * it is what the id_token must echo.
 */
export function makeState(platformId: number, now = Date.now()): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString("base64url");
  const payload = b64(JSON.stringify({ p: platformId, n: nonce, e: now + STATE_TTL_MS }));
  const mac = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return { state: `${payload}.${mac}`, nonce };
}

export function readState(state: string, now = Date.now()): { platformId: number; nonce: string } {
  const [payload, mac] = state.split(".");
  if (!payload || !mac) throw new LtiError("Missing state.");
  const expected = createHmac("sha256", stateSecret()).update(payload).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new LtiError("Bad state.");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p: number; n: string; e: number };
  if (parsed.e < now) throw new LtiError("The launch took too long. Open Mockio from your course again.");
  return { platformId: parsed.p, nonce: parsed.n };
}

/** Nonces already used, so one id_token cannot sign anyone in twice. */
const usedNonces = new Map<string, number>();

function spendNonce(nonce: string, now = Date.now()): boolean {
  for (const [key, expires] of usedNonces) if (expires < now) usedNonces.delete(key);
  if (usedNonces.has(nonce)) return false;
  usedNonces.set(nonce, now + STATE_TTL_MS);
  return true;
}

/* ------------------------------------------------------------------------- */
/* The launch                                                                */
/* ------------------------------------------------------------------------- */

const CLAIM = "https://purl.imsglobal.org/spec/lti/claim/";
const AGS_CLAIM = "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint";
const SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score";

export interface Launch {
  sub: string;
  email: string | null;
  name: string | null;
  /** Teachers land on the advisor page; everyone else on the thesis. */
  instructor: boolean;
  /** The gradebook column for this activity, when the course has one. */
  lineitem: string | null;
}

/** Every check the IMS security framework asks of a resource link launch. */
export async function verifyLaunch(
  idToken: string,
  platform: LtiPlatform,
  expectedNonce: string,
  fetcher: JwksFetcher = fetchJwks,
  now = Date.now(),
): Promise<Launch> {
  const claims = await verifyJwt(idToken, platform.jwksUrl, fetcher);
  if (claims.iss !== platform.issuer) throw new LtiError("The token is from another platform.");
  const aud = claims.aud;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(platform.clientId)) throw new LtiError("The token is for another tool.");
  if (Array.isArray(aud) && aud.length > 1 && claims.azp !== platform.clientId) throw new LtiError("The token is for another tool.");
  const seconds = Math.floor(now / 1000);
  if (typeof claims.exp !== "number" || claims.exp < seconds - 60) throw new LtiError("The token has expired.");
  if (typeof claims.iat === "number" && claims.iat > seconds + 300) throw new LtiError("The token is from the future.");
  if (claims.nonce !== expectedNonce || !spendNonce(String(claims.nonce), now)) throw new LtiError("The token was already used.");
  const deployment = String(claims[`${CLAIM}deployment_id`] ?? "");
  if (platform.deploymentIds.length > 0 && !platform.deploymentIds.includes(deployment)) {
    throw new LtiError("This deployment of Mockio is not registered.");
  }
  if (claims[`${CLAIM}version`] !== "1.3.0") throw new LtiError("Only LTI 1.3 is supported.");
  if (claims[`${CLAIM}message_type`] !== "LtiResourceLinkRequest") throw new LtiError("Unsupported LTI message.");
  if (typeof claims.sub !== "string" || claims.sub === "") throw new LtiError("The platform did not say who this is.");

  const roles = Array.isArray(claims[`${CLAIM}roles`]) ? (claims[`${CLAIM}roles`] as string[]) : [];
  const ags = claims[AGS_CLAIM] as { scope?: string[]; lineitem?: string } | undefined;
  const email = typeof claims.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) ? claims.email.toLowerCase() : null;
  return {
    sub: claims.sub,
    email,
    name: typeof claims.name === "string" ? claims.name.slice(0, 120) : null,
    instructor: roles.some((role) => /#(Instructor|Administrator|ContentDeveloper|Mentor)$/.test(role)),
    lineitem: ags?.lineitem && ags.scope?.includes(SCORE_SCOPE) ? ags.lineitem : null,
  };
}

/** The platform's authorisation redirect, step 2 of the flow. */
export function authRedirect(
  platform: LtiPlatform,
  params: { loginHint: string; messageHint: string | null; redirectUri: string },
): string {
  const { state, nonce } = makeState(platform.id);
  const url = new URL(platform.authLoginUrl);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "form_post");
  url.searchParams.set("prompt", "none");
  url.searchParams.set("client_id", platform.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("login_hint", params.loginHint);
  if (params.messageHint) url.searchParams.set("lti_message_hint", params.messageHint);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

/* ------------------------------------------------------------------------- */
/* The gradebook                                                             */
/* ------------------------------------------------------------------------- */

/**
 * Posts a rehearsal's grade to the course's gradebook (Assignment and Grade
 * Services). The token comes from the platform in exchange for an assertion
 * signed with the tool's key.
 */
export async function postScore(
  platform: LtiPlatform,
  link: LtiUserLink,
  score: { given: number; maximum: number; comment: string },
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!link.lineitem) return;
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt({
    iss: platform.clientId,
    sub: platform.clientId,
    aud: platform.authTokenUrl,
    iat: now,
    exp: now + 300,
    jti: randomBytes(12).toString("hex"),
  });
  const tokenResponse = await fetcher(platform.authTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: assertion,
      scope: SCORE_SCOPE,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new LtiError(`The gradebook token was refused (${tokenResponse.status}).`);
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) throw new LtiError("The gradebook gave no token.");

  // The scores endpoint is the line item URL with /scores before any query.
  const target = new URL(link.lineitem);
  target.pathname = `${target.pathname.replace(/\/$/, "")}/scores`;
  const response = await fetcher(target.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/vnd.ims.lis.v1.score+json" },
    body: JSON.stringify({
      userId: link.sub,
      scoreGiven: score.given,
      scoreMaximum: score.maximum,
      comment: score.comment.slice(0, 500),
      timestamp: new Date().toISOString(),
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new LtiError(`The gradebook refused the score (${response.status}).`);
}

/** A URL the admin types, checked as one: https only, outside development. */
export function readUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}
