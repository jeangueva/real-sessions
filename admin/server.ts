/**
 * Mockio admin: growth numbers and the user list, for the team only.
 *
 * A separate service from the product on purpose. The public app has no admin
 * routes at all, so no bug in it can expose this data; this service has no
 * write access, so no bug in it can change anything.
 *
 *   Cloudflare Access   decides who reaches admin.getmockio.com (Google sign-in,
 *                       an allowlist, two-step verification).
 *   access.ts           checks the same token here, because the service also
 *                       answers on its onrender.com address, which skips
 *                       Cloudflare entirely.
 *   Postgres            every connection is read-only, whatever the role.
 *
 *   npm run admin       local, with ADMIN_DEV_EMAIL set (never in production)
 *
 * Environment: CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, ADMIN_EMAILS (comma
 * separated), ADMIN_DATABASE_URL (or DATABASE_URL), ADMIN_REDIS_URL (or
 * REDIS_URL), PORT.
 */
import "../src/env.js";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import pg from "pg";
import { createClient, type RedisClientType } from "redis";
import { accessConfig, cachedKeys, verifyAccess } from "./access.js";
import { load, summarise } from "./metrics.js";
import type { Summary } from "./metrics.js";
import { renderPage } from "./page.js";

const production = process.env.NODE_ENV === "production";
const config = accessConfig(process.env);
const devEmail = production ? undefined : process.env.ADMIN_DEV_EMAIL?.trim();

// Fail closed: a production service with no way to check identity would
// otherwise be one that lets everybody in.
if (!config && !devEmail) {
  console.error(
    "[admin] Set CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD and ADMIN_EMAILS (or ADMIN_DEV_EMAIL locally). Refusing to start.",
  );
  process.exit(1);
}

const databaseUrl = process.env.ADMIN_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const redisUrl = process.env.ADMIN_REDIS_URL?.trim() || process.env.REDIS_URL?.trim();
if (!databaseUrl || !redisUrl) {
  console.error("[admin] Set ADMIN_DATABASE_URL and ADMIN_REDIS_URL (or DATABASE_URL and REDIS_URL).");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  // Belt and braces with the read-only role: even with a role that could
  // write, every transaction on these connections is read-only.
  options: "-c default_transaction_read_only=on",
  connectionTimeoutMillis: 5_000,
  max: 3,
});
pool.on("error", (error) => console.error("[admin] postgres:", error.message));

const redis: RedisClientType = createClient({ url: redisUrl });
redis.on("error", (error) => console.error("[admin] redis:", error.message));
await redis.connect();

const keys = config ? cachedKeys(config.teamDomain) : null;

/** One minute is fresh enough for growth numbers and spares the database. */
let cache: { summary: Summary; at: number } | null = null;
async function currentSummary(): Promise<Summary> {
  if (cache && Date.now() - cache.at < 60_000) return cache.summary;
  const summary = summarise(await load(pool, redis));
  cache = { summary, at: Date.now() };
  return summary;
}

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "Strict-Transport-Security": "max-age=31536000",
};

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://admin").pathname;

  // Render's health check. Says nothing but "up".
  if (path === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("ok");
    return;
  }

  const header = req.headers["cf-access-jwt-assertion"];
  const viewer =
    devEmail ??
    (config && keys
      ? await verifyAccess(Array.isArray(header) ? header[0] : header, config, keys).catch(() => null)
      : null);
  if (!viewer) {
    res.writeHead(403, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Forbidden");
    return;
  }

  if (req.method !== "GET" || path !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Not found");
    return;
  }

  try {
    const nonce = randomBytes(16).toString("base64");
    const html = renderPage(await currentSummary(), viewer, nonce);
    res
      .writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
        ...SECURITY_HEADERS,
      })
      .end(html);
    console.log(`[admin] ${viewer} viewed the dashboard`);
  } catch (error) {
    console.error("[admin] load failed:", error instanceof Error ? error.message : error);
    res.writeHead(500, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Could not load the numbers.");
  }
});

const port = Number(process.env.PORT ?? 8790);
server.listen(port, () => console.log(`[admin] on http://localhost:${port}${devEmail ? " (dev, no Access check)" : ""}`));
