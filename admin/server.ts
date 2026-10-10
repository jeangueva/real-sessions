/**
 * Mockio admin: growth numbers and the user list, for the team only.
 *
 * A separate service from the product on purpose: the public app has no admin
 * routes at all, so no bug in it can expose this data or change a plan.
 *
 *   Sign-in      a six-digit code emailed to an address in ADMIN_EMAILS
 *                (see login.ts), then a signed, HttpOnly cookie for a day.
 *   Reading      its own pool, forced read-only on every connection.
 *   Writing      a second pool used only by actions.ts, and every change is
 *                written to admin_audit with who made it.
 *
 *   npm run admin        local; codes are printed to the console when no
 *                        email provider is configured
 *
 * Environment: ADMIN_EMAILS (comma separated), ADMIN_SESSION_SECRET (32+
 * characters), RESEND_API_KEY and EMAIL_FROM, ADMIN_DATABASE_URL (or
 * DATABASE_URL), ADMIN_REDIS_URL (or REDIS_URL), OPENROUTER_API_KEY and
 * ADMIN_INSIGHTS_MODEL for the AI review, PORT.
 */
import "../src/env.js";
import { readFileSync } from "node:fs";
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
import {
  ActionError,
  createCoupon,
  disableCoupon,
  grantPremium,
  renameUser,
  revokePremium,
  verifyEmail,
} from "./actions.js";
import { aiInsights, ruleInsights } from "./insights.js";
import { MARK, renderApp, renderLogin } from "./page.js";

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

// Two pools on purpose. Everything that only reads goes through one whose
// every transaction is read-only; the other is reached only from actions.ts.
const pool = new pg.Pool({
  connectionString: databaseUrl,
  options: "-c default_transaction_read_only=on",
  connectionTimeoutMillis: 5_000,
  max: 3,
});
const writePool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000, max: 2 });
for (const each of [pool, writePool]) each.on("error", (error) => console.error("[admin] postgres:", error.message));

const insightsModel = process.env.ADMIN_INSIGHTS_MODEL?.trim() || "anthropic/claude-sonnet-5.5";
const here = new URL(".", import.meta.url);
const ASSETS: Record<string, { type: string; body: string }> = {
  "/client.js": { type: "text/javascript; charset=utf-8", body: readFileSync(new URL("client.js", here), "utf8") },
  "/styles.css": { type: "text/css; charset=utf-8", body: readFileSync(new URL("styles.css", here), "utf8") },
  "/favicon.svg": { type: "image/svg+xml", body: MARK.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ') },
};

const redis: RedisClientType = createClient({ url: redisUrl });
redis.on("error", (error) => console.error("[admin] redis:", error.message));
await redis.connect();

const codes = new Codes();
/** Codes sent: per address and per network address, per 15 minutes. */
const sendsByEmail = new Limiter(3, 15 * 60 * 1000);
const sendsByIp = new Limiter(10, 15 * 60 * 1000);
/** Code guesses per network address, across addresses. */
const guessesByIp = new Limiter(20, 15 * 60 * 1000);
/** AI reviews per admin per hour: each one is a paid model call. */
const aiByViewer = new Limiter(10, 60 * 60 * 1000);

/** One minute is fresh enough for growth numbers and spares the database. */
let cache: { summary: Summary; at: number } | null = null;
async function currentPayload() {
  const summary = await currentSummary();
  return { summary, insights: ruleInsights(summary) };
}

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

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; " +
  "base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

function html(res: ServerResponse, status: number, body: string, extra: Record<string, string> = {}) {
  res
    .writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      ...SECURITY_HEADERS,
      ...extra,
    })
    .end(body);
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...SECURITY_HEADERS }).end(JSON.stringify(body));
}

/** A small JSON body; anything over 4 KB is not one of ours. */
async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) throw new ActionError("La petición es demasiado grande.");
  }
  try {
    const parsed = JSON.parse(body || "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new ActionError("La petición no es válida.");
  }
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

      if (path.startsWith("/api/")) {
        const viewer = readSession(cookieValue(req.headers.cookie, COOKIE), secret, allowed);
        if (!viewer) return json(res, 401, { error: "Tu sesión terminó. Vuelve a entrar." });
        const body = await readJson(req);
        const deps = { pool: writePool, redis, actor: viewer };
        const id = String(body.userId ?? "");
        try {
          let message: string | null = null;
          if (path === "/api/users/grant") message = await grantPremium(deps, id, body.days, body.note);
          else if (path === "/api/users/revoke") message = await revokePremium(deps, id, body.note);
          else if (path === "/api/users/verify") message = await verifyEmail(deps, id);
          else if (path === "/api/users/rename") message = await renameUser(deps, id, body.name);
          else if (path === "/api/coupons") message = await createCoupon(deps, body as never);
          else if (path === "/api/coupons/disable") message = await disableCoupon(deps, body.code);
          else if (path === "/api/refresh") {
            cache = null;
            return json(res, 200, { ok: true });
          } else if (path === "/api/insights/ai") {
            if (!aiByViewer.allow(viewer)) return json(res, 429, { error: "Ya pediste varios análisis esta hora. Prueba más tarde." });
            const insights = await aiInsights(await currentSummary(), insightsModel);
            console.log(`[admin] ${viewer} ran the AI review`);
            return json(res, 200, { insights, model: insightsModel });
          } else return json(res, 404, { error: "No existe esa acción." });
          cache = null;
          console.log(`[admin] ${viewer} ${path}`);
          return json(res, 200, { message });
        } catch (error) {
          if (error instanceof ActionError) return json(res, 400, { error: error.message });
          console.error(`[admin] ${path} failed:`, error instanceof Error ? error.message : error);
          return json(res, 500, { error: "No se pudo completar. Revisa los logs del servicio." });
        }
      }

      if (path === "/logout") {
        return redirect(res, "/", { "Set-Cookie": cookie("", 0) });
      }

      res.writeHead(404, SECURITY_HEADERS).end();
      return;
    }

    if (req.method === "GET" && (path === "/styles.css" || path === "/favicon.svg")) {
      const asset = ASSETS[path]!;
      res.writeHead(200, { "Content-Type": asset.type, ...SECURITY_HEADERS }).end(asset.body);
      return;
    }

    const viewer = readSession(cookieValue(req.headers.cookie, COOKIE), secret, allowed);
    if (req.method === "GET" && path === "/") {
      if (!viewer) return html(res, 200, renderLogin({ step: "email" }));
      return html(res, 200, renderApp(await currentPayload(), viewer));
    }
    if (!viewer) return json(res, 401, { error: "Tu sesión terminó. Vuelve a entrar." });

    if (req.method === "GET" && path === "/client.js") {
      const asset = ASSETS[path]!;
      res.writeHead(200, { "Content-Type": asset.type, ...SECURITY_HEADERS }).end(asset.body);
      return;
    }
    if (req.method === "GET" && path === "/api/data") return json(res, 200, await currentPayload());

    res.writeHead(404, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Not found");
  } catch (error) {
    console.error("[admin] request failed:", error instanceof Error ? error.message : error);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain", ...SECURITY_HEADERS }).end("Something went wrong.");
  }
});

const port = Number(process.env.PORT ?? 8790);
server.listen(port, () => console.log(`[admin] on http://localhost:${port}`));
