/**
 * HTTP boundary for the browser.
 *
 * The interviewer and evaluator both hold a provider API key, so they must run
 * here and never in the client bundle — anything shipped to the browser is
 * public. The web app talks to these three endpoints and holds no credentials.
 *
 *   POST /api/auth                      → issues an identity cookie
 *   POST /api/sessions                  → { sessionId, turn }
 *   POST /api/sessions/:id/answers      → { turn }
 *
 * Both accept `Accept: text/event-stream` and then stream the interviewer's
 * turn as it is generated. EventSource cannot be used on the client because it
 * only issues GET requests, so this is SSE framing over POST, read with fetch.
 *   POST /api/sessions/:id/evaluation   → { evaluation }
 *   GET  /api/history                   → { sessions }
 *   GET  /api/history/:id               → { session }
 *   GET  /api/preferences               → { preferences }
 *   PUT  /api/preferences               → { preferences }
 *   POST /api/accounts                  → sign up
 *   POST /api/auth/login                → sign in
 *   POST /api/auth/logout               → sign out
 *   GET  /api/auth/me                   → { kind, email }
 *   POST /api/auth/forgot               → request a reset link
 *   POST /api/auth/reset                → set a new password
 *   POST /api/auth/verify               → confirm an email address
 *   POST /api/auth/verify/resend        → send another confirmation
 *
 * Every route but /api/auth requires that identity, and every interview is
 * owned by the identity that created it.
 *
 * Run with `npm run serve`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import process from "node:process";
import {
  accessCodeAccepted,
  clearCookieHeader,
  cookieHeader,
  issueToken,
  readCookie,
  requiresAccessCode,
  USER_TOKEN_TTL_MS,
  verifyToken,
} from "./auth.js";
import {
  checkPassword,
  createAccountStore,
  hashPassword,
  hashResetToken,
  newResetToken,
  normalizeEmail,
  RESET_TTL_SECONDS,
  VERIFY_TTL_SECONDS,
  verifyPassword,
  type AccountStore,
} from "./accounts.js";
import {
  createEmailSender,
  resetEmail,
  verifyEmail,
  type EmailSender,
} from "./email.js";
import { createRateLimiter, MemoryRateLimiter, RULES, type RateLimiter } from "./rate-limit.js";
import { closeRedis, getRedis } from "./redis.js";
import { InterviewSession } from "./interviewer.js";
import { evaluateInterview, EvaluationParseError } from "./evaluator.js";
import { InterviewRefusalError } from "./interviewer.js";
import { createSessionStore, type SessionStore } from "./session-store.js";
import {
  createUserStore,
  readPreferences,
  type UserStore,
} from "./user-store.js";
import type { InterviewContext } from "./types.js";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const PORT = Number(process.env.PORT ?? 8787);

/**
 * Sessions live in Redis (see session-store.ts), so a restart or a second
 * instance does not discard interviews in flight. `InterviewSession` is
 * rehydrated from its snapshot on every request and written back after.
 */
let STORE: SessionStore;
let USERS: UserStore;
let ACCOUNTS: AccountStore;
let MAILER: EmailSender;
let LIMITER: RateLimiter;

setInterval(() => {
  // Redis expires its own counters; the memory limiter needs sweeping.
  if (LIMITER instanceof MemoryRateLimiter) LIMITER.sweep();
}, 10 * 60 * 1000).unref();

/** Best-effort client address for limiting anonymous callers. */
function clientIp(req: IncomingMessage): string {
  // Only trust a forwarded header when a proxy is declared, or any caller can
  // mint unlimited identities by rotating the header themselves.
  if (process.env.TECHSHADOW_TRUST_PROXY === "1") {
    const forwarded = req.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (first) return first.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

/** Applies a rule, writing a 429 with Retry-After when it trips. */
async function limited(
  res: ServerResponse,
  key: string,
  rule: (typeof RULES)[keyof typeof RULES],
): Promise<boolean> {
  const result = await LIMITER.consume(key, rule);
  if (result.allowed) return false;
  res.setHeader("Retry-After", String(result.retryAfterSeconds));
  json(res, 429, {
    error: "Too many requests. Try again later.",
    retryAfterSeconds: result.retryAfterSeconds,
  });
  return true;
}

/** Opens an SSE response. Buffering proxies would defeat the point of this. */
function openStream(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // nginx and friends buffer by default, which turns a stream into one
    // delayed blob.
    "X-Accel-Buffering": "no",
  });
}

function sendEvent(res: ServerResponse, event: string, data: unknown): void {
  // A newline inside the payload would terminate the frame early, so the data
  // always goes out as a single JSON line.
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function wantsStream(req: IncomingMessage): boolean {
  return (req.headers.accept ?? "").includes("text/event-stream");
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // A candidate answer is a few sentences; anything larger is not a client
    // of ours and should not be buffered.
    if (size > 64 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function readContext(body: Record<string, unknown>): InterviewContext {
  const required = [
    "candidateName",
    "targetRole",
    "companyName",
    "companyCulture",
    "industry",
    "interviewStage",
  ] as const;

  const missing = required.filter(
    (key) => typeof body[key] !== "string" || (body[key] as string).trim() === "",
  );
  if (missing.length > 0) {
    throw new Error(`Missing or empty field(s): ${missing.join(", ")}`);
  }
  return Object.fromEntries(
    required.map((key) => [key, (body[key] as string).trim()]),
  ) as unknown as InterviewContext;
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;

  if (req.method === "POST" && path === "/api/auth") {
    if (await limited(res, `auth:${clientIp(req)}`, RULES.auth)) return;
    const body = await readJson(req);
    if (!accessCodeAccepted(body["accessCode"])) {
      // Same response whether the code was wrong or absent.
      return json(res, 403, { error: "Invalid access code." });
    }
    const { token, identity } = issueToken();
    res.setHeader(
      "Set-Cookie",
      cookieHeader(token, process.env.NODE_ENV === "production"),
    );
    json(res, 201, { expiresAt: identity.expiresAt });
    return;
  }

  const secureCookies = process.env.NODE_ENV === "production";
  /** The guest identity in play, if any — used to carry history into an account. */
  const priorIdentity = verifyToken(readCookie(req.headers.cookie));

  /**
   * True when a user token predates its account's last password change, or the
   * account is gone. Centralised because `/api/auth/me` sits before the
   * authentication gate and silently skipped this check — a reset then left
   * the old session reporting itself as signed in, with the victim's email.
   */
  const revoked = async (candidate: typeof priorIdentity): Promise<boolean> => {
    if (!candidate || candidate.kind !== "user") return false;
    const account = await ACCOUNTS.findById(candidate.id);
    if (!account) return true;
    if (!account.passwordChangedAt) return false;
    // Tokens are stateless, so the issue time comes from the expiry.
    const issuedAt = candidate.expiresAt - USER_TOKEN_TTL_MS;
    return issuedAt < Date.parse(account.passwordChangedAt);
  };

  const siteUrl = () => process.env.TECHSHADOW_SITE_URL ?? "http://localhost:5173";

  /**
   * Sends without letting the outcome reach the response.
   *
   * Two things break if a delivery failure propagates. A failed sign-up mail
   * would 500 a request that already created the account, so the person sees
   * an error and then "already registered" when they retry. Worse, on the
   * forgot-password route a throw for a real address against a silent 202 for
   * an unknown one is an account-enumeration oracle — precisely what that
   * endpoint's identical responses exist to prevent.
   */
  const deliver = async (message: Parameters<EmailSender["send"]>[0]) => {
    try {
      await MAILER.send(message);
    } catch (error) {
      console.error("[techshadow] email delivery failed:", error);
    }
  };

  const sendVerification = async (accountId: string, email: string) => {
    const { token, hash } = newResetToken();
    await ACCOUNTS.putToken("verify", hash, accountId, VERIFY_TTL_SECONDS);
    await deliver(verifyEmail(email, `${siteUrl()}/verify?token=${token}`));
  };

  const signIn = async (accountId: string): Promise<void> => {
    if (priorIdentity?.kind === "guest") {
      await USERS.transfer(priorIdentity.id, accountId);
    }
    const { token } = issueToken({ kind: "user", id: accountId });
    res.setHeader("Set-Cookie", cookieHeader(token, secureCookies, "user"));
  };

  if (req.method === "POST" && path === "/api/accounts") {
    if (await limited(res, `signup:${clientIp(req)}`, RULES.signup)) return;
    const body = await readJson(req);

    const email = normalizeEmail(body["email"]);
    if (!email) return json(res, 400, { error: "Enter a valid email address." });

    const password = checkPassword(body["password"]);
    if (!password.ok) return json(res, 400, { error: password.reason });

    const account = await ACCOUNTS.create(
      email,
      await hashPassword(body["password"] as string),
    );
    if (!account) {
      // This does leak that the address is registered. The alternative —
      // always returning success and mailing the existing owner instead —
      // needs an email provider this deployment does not have, and silently
      // failing a sign-up is worse than the leak. Revisit when email exists.
      return json(res, 409, { error: "That email is already registered." });
    }

    await sendVerification(account.id, account.email);
    await signIn(account.id);
    json(res, 201, { email: account.email });
    return;
  }

  if (req.method === "POST" && path === "/api/auth/login") {
    if (await limited(res, `login-ip:${clientIp(req)}`, RULES.loginByIp)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body["email"]);
    const supplied = body["password"];

    const reject = () =>
      // One message for "no such account" and "wrong password": distinct
      // errors would let an attacker enumerate registered addresses.
      json(res, 401, { error: "Email or password is incorrect." });

    if (!email || typeof supplied !== "string") return reject();
    if (await limited(res, `login-email:${email}`, RULES.loginByEmail)) return;

    const account = await ACCOUNTS.findByEmail(email);
    if (!account) return reject();
    if (!(await verifyPassword(supplied, account.passwordHash))) return reject();

    await signIn(account.id);
    json(res, 200, { email: account.email });
    return;
  }

  if (req.method === "POST" && path === "/api/auth/forgot") {
    if (await limited(res, `forgot-ip:${clientIp(req)}`, RULES.forgotByIp)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body["email"]);

    // The same response either way. Unlike sign-up, there is no usability cost
    // to staying quiet here, so this endpoint does not confirm whether an
    // address is registered.
    const acknowledge = () =>
      json(res, 202, {
        ok: true,
        message: "If that address has an account, a reset link is on its way.",
      });

    if (!email) return acknowledge();
    if (await limited(res, `forgot-email:${email}`, RULES.forgotByEmail)) return;

    const account = await ACCOUNTS.findByEmail(email);
    if (account) {
      const { token, hash } = newResetToken();
      await ACCOUNTS.putToken("reset", hash, account.id, RESET_TTL_SECONDS);
      await deliver(resetEmail(account.email, `${siteUrl()}/reset?token=${token}`));
    }
    return acknowledge();
  }

  if (req.method === "POST" && path === "/api/auth/reset") {
    if (await limited(res, `reset-ip:${clientIp(req)}`, RULES.resetByIp)) return;
    const body = await readJson(req);
    const token = typeof body["token"] === "string" ? body["token"] : "";

    const password = checkPassword(body["password"]);
    if (!password.ok) return json(res, 400, { error: password.reason });

    // Consumed before the password is checked for validity? No — the password
    // is validated first, so a user who typed a short one does not burn their
    // only link and have to request another.
    const accountId = token ? await ACCOUNTS.consumeToken("reset", hashResetToken(token)) : null;
    if (!accountId) {
      return json(res, 400, {
        error: "That reset link is invalid or has expired. Request a new one.",
      });
    }

    await ACCOUNTS.updatePassword(
      accountId,
      await hashPassword(body["password"] as string),
    );
    // Signing in here issues a token stamped after passwordChangedAt, so the
    // person resetting stays in while every older session is refused.
    await signIn(accountId);
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && path === "/api/auth/verify") {
    if (await limited(res, `verify-ip:${clientIp(req)}`, RULES.verifyByIp)) return;
    const body = await readJson(req);
    const token = typeof body["token"] === "string" ? body["token"] : "";

    const accountId = token
      ? await ACCOUNTS.consumeToken("verify", hashResetToken(token))
      : null;
    if (!accountId) {
      return json(res, 400, {
        error: "That confirmation link is invalid or has expired.",
      });
    }

    await ACCOUNTS.markEmailVerified(accountId);
    // Deliberately does not sign anyone in. A link from an inbox proves the
    // address, not that the person clicking it is at their own device.
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && path === "/api/auth/verify/resend") {
    const requester = priorIdentity;
    if (!requester || requester.kind !== "user") {
      return json(res, 401, { error: "Sign in first." });
    }
    if (await limited(res, `verify-resend:${requester.id}`, RULES.verifyResend)) {
      return;
    }
    const account = await ACCOUNTS.findById(requester.id);
    if (account && !account.emailVerifiedAt) {
      await sendVerification(account.id, account.email);
    }
    // Same answer whether or not a mail went out, so the endpoint reveals
    // nothing about the account's state to a stolen cookie.
    json(res, 202, { ok: true });
    return;
  }

  if (req.method === "POST" && path === "/api/auth/logout") {
    res.setHeader("Set-Cookie", clearCookieHeader(secureCookies));
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && path === "/api/auth/me") {
    if (!priorIdentity) return json(res, 200, { kind: null, email: null });
    if (priorIdentity.kind === "guest") {
      return json(res, 200, { kind: "guest", email: null });
    }
    if (await revoked(priorIdentity)) {
      res.setHeader("Set-Cookie", clearCookieHeader(secureCookies));
      return json(res, 200, { kind: null, email: null });
    }
    const account = await ACCOUNTS.findById(priorIdentity.id);
    json(res, 200, {
      kind: "user",
      email: account?.email ?? null,
      emailVerified: Boolean(account?.emailVerifiedAt),
    });
    return;
  }

  // Everything past this point is authenticated.
  const identity = priorIdentity;
  if (!identity) {
    return json(res, 401, {
      error: "Not authenticated.",
      accessCodeRequired: requiresAccessCode(),
    });
  }

  if (await revoked(identity)) {
    res.setHeader("Set-Cookie", clearCookieHeader(secureCookies));
    return json(res, 401, { error: "Please sign in again." });
  }

  if (req.method === "POST" && path === "/api/sessions") {
    if (await limited(res, `start:${identity.id}`, RULES.startSession)) return;
    const body = await readJson(req);
    const context = readContext(body);
    const session = new InterviewSession(context);
    const sessionId = randomUUID();

    const persist = async (): Promise<void> => {
      await STORE.set(sessionId, {
        snapshot: session.snapshot(),
        context,
        ownerId: identity.id,
        createdAt: Date.now(),
      });
    };

    if (wantsStream(req)) {
      openStream(res);
      sendEvent(res, "session", { sessionId });
      const turn = await session.startStream((chunk) =>
        sendEvent(res, "delta", { text: chunk }),
      );
      await persist();
      sendEvent(res, "turn", { turn });
      res.end();
      return;
    }

    const turn = await session.start();
    await persist();
    json(res, 201, { sessionId, turn });
    return;
  }

  const answerMatch = path.match(/^\/api\/sessions\/([\w-]+)\/answers$/);
  if (req.method === "POST" && answerMatch) {
    if (await limited(res, `answer:${identity.id}`, RULES.answer)) return;
    const sessionId = answerMatch[1]!;
    const stored = await STORE.get(sessionId);
    // A session owned by someone else is reported as missing, not forbidden —
    // "forbidden" would confirm the id exists.
    if (!stored || stored.ownerId !== identity.id) {
      return json(res, 404, { error: "Session not found or expired." });
    }

    const body = await readJson(req);
    const answer = typeof body["answer"] === "string" ? body["answer"] : "";
    const session = InterviewSession.restore(stored.snapshot);

    if (wantsStream(req)) {
      openStream(res);
      const turn = await session.submitAnswerStream(answer, (chunk) =>
        sendEvent(res, "delta", { text: chunk }),
      );
      // Written back only after the turn completes, so a failed call leaves
      // the stored conversation where the candidate can retry from.
      await STORE.set(sessionId, { ...stored, snapshot: session.snapshot() });
      sendEvent(res, "turn", { turn });
      res.end();
      return;
    }

    const turn = await session.submitAnswer(answer);
    await STORE.set(sessionId, { ...stored, snapshot: session.snapshot() });
    json(res, 200, { turn });
    return;
  }

  const evalMatch = path.match(/^\/api\/sessions\/([\w-]+)\/evaluation$/);
  if (req.method === "POST" && evalMatch) {
    if (await limited(res, `eval:${identity.id}`, RULES.evaluation)) return;
    const stored = await STORE.get(evalMatch[1]!);
    if (!stored || stored.ownerId !== identity.id) {
      return json(res, 404, { error: "Session not found or expired." });
    }
    const session = InterviewSession.restore(stored.snapshot);
    const evaluation = await evaluateInterview(stored.context, session.transcript);

    // Recorded here rather than on the last turn: an interview with no
    // evaluation has nothing to show in history.
    await USERS.recordSession(identity.id, {
      id: evalMatch[1]!,
      company: stored.context.companyName,
      role: stored.context.targetRole,
      stage: stored.context.interviewStage,
      completedAt: new Date().toISOString(),
      score: evaluation.overall_score_percentage,
      evaluation,
    });

    json(res, 200, { evaluation, usage: session.usage });
    return;
  }

  if (req.method === "GET" && path === "/api/history") {
    json(res, 200, { sessions: await USERS.listSessions(identity.id) });
    return;
  }

  const historyMatch = path.match(/^\/api\/history\/([\w-]+)$/);
  if (req.method === "GET" && historyMatch) {
    const record = await USERS.getSession(identity.id, historyMatch[1]!);
    // Scoped to the identity, so another caller's id reads as missing.
    if (!record) return json(res, 404, { error: "Session not found." });
    json(res, 200, { session: record });
    return;
  }

  if (req.method === "GET" && path === "/api/preferences") {
    json(res, 200, { preferences: await USERS.getPreferences(identity.id) });
    return;
  }

  if (req.method === "PUT" && path === "/api/preferences") {
    const body = await readJson(req);
    const preferences = readPreferences(body);
    await USERS.setPreferences(identity.id, preferences);
    // Echo what was stored, so the client sees any clamping that happened.
    json(res, 200, { preferences });
    return;
  }

  json(res, 404, { error: `No route for ${req.method} ${path}` });
}

const server = createServer((req, res) => {
  void route(req, res).catch((error: unknown) => {
    // Once a stream is open the status line is already sent; the only way to
    // report a failure is as an event on the open stream.
    if (res.headersSent) {
      if (!res.writableEnded) {
        sendEvent(res, "error", {
          error:
            error instanceof InterviewRefusalError
              ? "The interviewer declined to continue."
              : "The interview service failed mid-turn.",
        });
        res.end();
      }
      console.error("[techshadow] mid-stream:", error);
      return;
    }
    // Typed failures carry a useful message; anything else could contain
    // provider internals, so it is logged here and generalized for the client.
    if (error instanceof InterviewRefusalError) {
      return json(res, 422, { error: "The interviewer declined to continue." });
    }
    if (error instanceof EvaluationParseError) {
      return json(res, 502, { error: "The evaluator returned an unusable result." });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/Missing or empty field|too large|empty|already/i.test(message)) {
      return json(res, 400, { error: message });
    }
    console.error("[techshadow]", error);
    json(res, 500, { error: "Internal error." });
  });
});

const redis = await getRedis();
const store = createSessionStore(redis);
STORE = store;
USERS = createUserStore(redis);
ACCOUNTS = createAccountStore(redis);
MAILER = createEmailSender();
LIMITER = createRateLimiter(redis);

server.listen(PORT, () => {
  console.log(
    `TechShadow API on http://localhost:${PORT} ` +
      `(sessions: ${store.kind}, rate limits: ${LIMITER.kind}, email: ${MAILER.kind})`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // Close the Redis connection so an in-flight write is not cut mid-command.
    server.close(() => {
      void store
        .close()
        .then(closeRedis)
        .then(() => process.exit(0));
    });
  });
}
