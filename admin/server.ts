/**
 * Mockio admin: growth numbers and the user list, for the team only.
 *
 * A separate service from the product on purpose. The public app has no admin
 * routes at all, so no bug in it can expose this data; this service cannot
 * write to Postgres, so no bug in it can change anything.
 *
 *   Sign-in      a six-digit code emailed to an address in ADMIN_EMAILS
 *                (see login.ts), then a signed, HttpOnly cookie for a day.
 *   Postgres     every connection is read-only, whatever the role.
 *   Redis        only read (account records); codes are kept in memory.
 *
 *   npm run admin        local; codes are printed to the console when no
 *                        email provider is configured
 *
 * Environment: ADMIN_EMAILS (comma separated), ADMIN_SESSION_SECRET (32+
 * characters), RESEND_API_KEY and EMAIL_FROM, ADMIN_DATABASE_URL (or
 * DATABASE_URL), ADMIN_REDIS_URL (or REDIS_URL), PORT.
 */
import "../src/env.js";
import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import pg from "pg";
import { createClient, type RedisClientType } from "redis";
import { createEmailSender } from "../src/email.js";
import { shellHtml, shellText } from "../src/email-shell.js";
import {
  COOKIE,
  Codes,
  Limiter,
  SESSION_MS,
  allowedEmails,
  cookieValue,
  readSession,
  sessionCookie,
} from "./login.js";
import { load, summarise } from "./metrics.js";
import type { Summary } from "./metrics.js";
import { renderLogin, renderPage } from "./page.js";

const production = process.env.NODE_ENV === "production";
const allowed = allowedEmails(process.env.ADMIN_EMAILS);
const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";

// Fail closed: without an allowlist or a real secret there is no safe way to
// decide who gets in, so the service does not start at all.
if (allowed.size === 0 || secret.length < 32) {
  console.error("[admin] Set ADMIN_EMAILS and ADMIN_SESSION_SECRET (32+ characters). Refusing to start.");
  process.exit(1);
}

const databaseUrl = process.env.ADMIN_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const redisUrl = process.env.ADMIN_REDIS_URL?.trim() || process.env.REDIS_URL?.trim();
if (!databaseUrl || !redisUrl) {
  console.error("[admin] Set ADMIN_DATABASE_URL and ADMIN_REDIS_URL (or DATABASE_URL and REDIS_URL).");
  process.exit(1);
}

const mail = createEmailSender();

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

const codes = new Codes();
/** Codes sent: per address and per network address, per 15 minutes. */
const sendsByEmail = new Limiter(3, 15 * 60 * 1000);
const sendsByIp = new Limiter(10, 15 * 60 * 1000);
/** Code guesses per network address, across addresses. */
const guessesByIp = new Limiter(20, 15 * 60 * 1000);

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
  // same-origin, not no-referrer: with no-referrer a form post carries
  // "Origin: null", and the origin check below would refuse our own forms.
  "Referrer-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
  ...(production ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
};

function html(res: ServerResponse, status: number, body: string, nonce?: string, extra: Record<string, string> = {}) {
  res
    .writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src ${
        nonce ? `'nonce-${nonce}'` : "'none'"
      }; img-src data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
      ...SECURITY_HEADERS,
      ...extra,
    })
    .end(body);
}

function redirect(res: ServerResponse, to: string, extra: Record<string, string> = {}) {
  res.writeHead(303, { Location: to, ...SECURITY_HEADERS, ...extra }).end();
}

/** The caller's address. Render puts the client first in X-Forwarded-For. */
function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

/** A small urlencoded form body; anything over 2 KB is not one of ours. */
async function form(req: IncomingMessage): Promise<URLSearchParams> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2048) throw new Error("body too large");
  }
  return new URLSearchParams(body);
}

/**
 * A form posted from this site. SameSite=Strict already keeps the cookie off
 * cross-site requests; checking Origin as well closes the sign-in forms,
 * which carry no cookie, to other sites.
 */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function cookie(value: string, maxAgeSeconds: number): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${production ? "; Secure" : ""}`;
}

async function sendCode(email: string, code: string): Promise<void> {
  const shell = {
    heading: `Your admin code: ${code}`,
    body: [
      `Use ${code} to sign in to the Mockio admin. It works once, for ten minutes.`,
      "If you did not ask for it, ignore this email: without the code nobody can sign in.",
    ],
  };
  await mail.send({ to: email, subject: `Mockio admin code: ${code}`, text: shellText(shell), html: shellHtml(shell) });
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://admin").pathname;

  // Render's health check. Says nothing but "up".
  if (path === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("ok");
    return;
  }

  try {
    if (req.method === "POST") {
      if (!sameOrigin(req)) {
        res.writeHead(403, SECURITY_HEADERS).end();
        return;
      }

      if (path === "/login") {
        const email = ((await form(req)).get("email") ?? "").trim().toLowerCase();
        const ip = clientIp(req);
        // The same answer whatever happens below, so this form cannot be
        // used to find out which addresses are admins.
        const reply = () => html(res, 200, renderLogin({ step: "code", email }));
        if (!sendsByIp.allow(ip) || !sendsByEmail.allow(email)) return reply();
        if (allowed.has(email)) {
          await sendCode(email, codes.issue(email)).catch((error: unknown) =>
            console.error("[admin] code email failed:", error instanceof Error ? error.message : error),
          );
          console.log(`[admin] code sent to ${email}`);
        } else {
          console.warn(`[admin] code requested for a non-admin address from ${ip}`);
        }
        return reply();
      }

      if (path === "/verify") {
        const body = await form(req);
        const email = (body.get("email") ?? "").trim().toLowerCase();
        const code = (body.get("code") ?? "").trim();
        if (!guessesByIp.allow(clientIp(req))) {
          return html(res, 429, renderLogin({ step: "email", notice: "Too many attempts. Try again in a few minutes." }));
        }
        if (!allowed.has(email) || !codes.check(email, code)) {
          return html(res, 401, renderLogin({ step: "code", email, notice: "That code is not right or has expired." }));
        }
        console.log(`[admin] ${email} signed in`);
        return redirect(res, "/", { "Set-Cookie": cookie(sessionCookie(email, secret), SESSION_MS / 1000) });
      }

      if (path === "/logout") {
        return redirect(res, "/", { "Set-Cookie": cookie("", 0) });
      }

      res.writeHead(404, SECURITY_HEADERS).end();
      return;
    }

    if (req.method !== "GET" || path !== "/") {
      res.writeHead(404, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Not found");
      return;
    }

    const viewer = readSession(cookieValue(req.headers.cookie, COOKIE), secret, allowed);
    if (!viewer) return html(res, 200, renderLogin({ step: "email" }));

    const nonce = randomBytes(16).toString("base64");
    html(res, 200, renderPage(await currentSummary(), viewer, nonce), nonce);
  } catch (error) {
    console.error("[admin] request failed:", error instanceof Error ? error.message : error);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Something went wrong.");
  }
});

const port = Number(process.env.PORT ?? 8790);
server.listen(port, () => console.log(`[admin] on http://localhost:${port}`));
