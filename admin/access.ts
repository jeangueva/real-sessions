/**
 * Who is allowed in: Cloudflare Access, checked here as well as at the edge.
 *
 * Cloudflare Access sits in front of admin.getmockio.com and refuses anyone
 * who has not signed in with an allowed Google account. That alone is not
 * enough, because the service also answers on its own onrender.com address,
 * which does not pass through Cloudflare at all. So every request must carry
 * the token Access attaches (`Cf-Access-Jwt-Assertion`), and this module
 * verifies it: signed by the team's key, for this application, not expired,
 * and naming an email on our own allowlist. A request that reaches the
 * service any other way has no token and gets nothing.
 *
 * No dependency: Node verifies RS256 against a JWK directly.
 */
import { createPublicKey, createVerify } from "node:crypto";
import type { JsonWebKey } from "node:crypto";

export interface AccessConfig {
  /** e.g. "mockio" for mockio.cloudflareaccess.com */
  teamDomain: string;
  /** The Application Audience (AUD) tag from the Access application. */
  audience: string;
  /** Lower-case emails allowed in, on top of Access's own policy. */
  allowed: Set<string>;
}

interface Jwk extends JsonWebKey {
  kid?: string;
}

export type KeyFetcher = () => Promise<Jwk[]>;

/** Fetches the team's signing keys, cached for an hour. */
export function cachedKeys(teamDomain: string): KeyFetcher {
  let cache: { keys: Jwk[]; at: number } | null = null;
  return async () => {
    if (cache && Date.now() - cache.at < 60 * 60 * 1000) return cache.keys;
    const response = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!response.ok) throw new Error(`Access certs: ${response.status}`);
    const body = (await response.json()) as { keys?: Jwk[] };
    cache = { keys: body.keys ?? [], at: Date.now() };
    return cache.keys;
  };
}

function decodePart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
}

/**
 * The email the token was issued to, or null for anything short of a valid,
 * current token for this application naming an allowed address.
 */
export async function verifyAccess(
  token: string | undefined,
  config: AccessConfig,
  keys: KeyFetcher,
  now = Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodePart(rawHeader);
    payload = decodePart(rawPayload);
  } catch {
    return null;
  }
  // RS256 only. Accepting whatever `alg` the token names is the classic way
  // to be talked into "none".
  if (header.alg !== "RS256") return null;

  const candidates = (await keys()).filter((key) => !header.kid || key.kid === header.kid);
  const signed = `${rawHeader}.${rawPayload}`;
  const signature = Buffer.from(rawSignature, "base64url");
  const valid = candidates.some((jwk) => {
    try {
      const key = createPublicKey({ key: jwk, format: "jwk" });
      return createVerify("RSA-SHA256").update(signed).verify(key, signature);
    } catch {
      return false;
    }
  });
  if (!valid) return null;

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(config.audience)) return null;
  if (payload.iss !== `https://${config.teamDomain}.cloudflareaccess.com`) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
  if (typeof payload.nbf === "number" && payload.nbf * 1000 > now + 60_000) return null;

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  return email && config.allowed.has(email) ? email : null;
}

/** Reads the configuration, or null when any piece is missing. */
export function accessConfig(env: NodeJS.ProcessEnv): AccessConfig | null {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\.cloudflareaccess\.com$/, "");
  const audience = env.CF_ACCESS_AUD?.trim();
  const allowed = new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!teamDomain || !audience || allowed.size === 0) return null;
  return { teamDomain, audience, allowed };
}
