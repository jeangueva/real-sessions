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
 *   POST /api/sessions/:id/evaluation   → { evaluation, metrics, xp, badges }
 *   POST /api/sessions/:id/coach        → { tips }
 *   GET  /api/history                   → { sessions }
 *   GET  /api/history/:id               → { session }
 *   GET  /api/progress                  → { sessions, axes }
 *   GET  /api/profile                   → { xp, level, badges }  (gamification)
 *   GET  /api/leaderboard               → { rows }
 *   GET  /api/catalogue                 → { sectors, companies, personas }
 *   GET  /api/billing                   → { configured, plan, subscription }
 *   POST /api/billing/checkout          → { initPoint } to send the payer to
 *   POST /api/billing/cancel            → ends the subscription
 *   POST /api/billing/webhook           → Mercado Pago notifications (public)
 *   WS   /api/voice                     → live transcription, audio up, text down
 *   GET  /api/plan                      → { plan, capabilities }
 *   POST /api/early-access              → registers a landing-page sign-up
 *   GET  /api/context                   → { profile }  (CV, portfolio, links)
 *   POST /api/context/document          → multipart CV or portfolio upload
 *   PUT  /api/context/links             → { profile }
 *   DELETE /api/context                 → clears it
 *   POST /api/contributions             → reports a real interview question
 *   GET  /api/review                    → the queue (reviewers only)
 *   POST /api/review/:id                → verify or reject one (reviewers only)
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
// Must come first: see the note in env.ts.
import "./env.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { pathToFileURL } from "node:url";
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
import type { ModelProvider } from "./providers/index.js";
import { evaluateInterview, EvaluationParseError } from "./evaluator.js";
import type { Evaluation } from "./schema.js";
import { InterviewRefusalError } from "./interviewer.js";
import {
  createSessionStore,
  SESSION_TTL_SECONDS,
  type SessionStore,
} from "./session-store.js";
import { closeDb, getDb } from "./db/index.js";
import {
  createProgressStore,
  seedCatalogue,
  type ProgressStore,
  type RecordedTurn,
  type SessionMode,
} from "./progress-store.js";
import { computeMetrics } from "./metrics.js";
import {
  axisScores,
  badgesForSession,
  levelForXp,
  xpForSession,
  BADGES,
  AXES,
  type Axis,
} from "./gamification.js";
import { coachTurn } from "./coach.js";
import { COMPANIES, SECTORS, findCompany, sectorForCompany } from "./sectors.js";
import { PERSONAS, defaultPersonaFor, findPersona } from "./personas.js";
import {
  capabilitiesFor,
  createEntitlementStore,
  earlyAccessUntil,
  GENERIC_COMPANY,
  GENERIC_CULTURE,
  GENERIC_INDUSTRY,
  type EntitlementStore,
  type Plan,
} from "./entitlements.js";
import {
  classifyLink,
  createProfileStore,
  renderProfileBrief,
  MAX_LINKS,
  type ProfileLink,
  type ProfileStore,
} from "./profile.js";
import {
  createContributionStore,
  readQuestion,
  type ContributionStore,
} from "./contributions.js";
import { extractText, kindFor, MAX_UPLOAD_BYTES, ExtractionError } from "./extract.js";
import { attachVoiceGateway } from "./voice/gateway.js";
import { isReviewer, reviewEnabled } from "./reviewers.js";
import {
  cancelPreapproval,
  createPreapproval,
  fetchPreapproval,
  grantsAccess,
  mercadoPagoConfigured,
  planConfig,
  verifySignature,
} from "./billing/mercadopago.js";
import {
  createSubscriptionStore,
  type SubscriptionStore,
} from "./billing/store.js";
import { deepgramConfigured } from "./voice/deepgram.js";
import { writeBrief, BriefError } from "./brief.js";
import {
  createUserStore,
  readPreferences,
  type UserStore,
} from "./user-store.js";
import type { InterviewContext } from "./types.js";

const PORT = Number(process.env.PORT ?? 8787);

/**
 * Sessions live in Redis (see session-store.ts), so a restart or a second
 * instance does not discard interviews in flight. `InterviewSession` is
 * rehydrated from its snapshot on every request and written back after.
 */
let STORE: SessionStore;
let USERS: UserStore;
let PROGRESS: ProgressStore;
let PLANS: EntitlementStore;
let PROFILES: ProfileStore;
let CONTRIBUTIONS: ContributionStore;
let SUBSCRIPTIONS: SubscriptionStore;
let ACCOUNTS: AccountStore;
let MAILER: EmailSender;
let LIMITER: RateLimiter;
/**
 * Model provider override.
 *
 * Undefined in every real deployment, where each phase resolves its vendor
 * from the model id. Set only by tests, which cannot call a live model: without
 * a seam here the session, coaching and evaluation routes are untestable, and
 * they are most of the API.
 */
let PROVIDER: ModelProvider | undefined;

export interface ServerDependencies {
  sessions: SessionStore;
  users: UserStore;
  progress: ProgressStore;
  plans: EntitlementStore;
  profiles: ProfileStore;
  contributions: ContributionStore;
  subscriptions: SubscriptionStore;
  accounts: AccountStore;
  mailer: EmailSender;
  limiter: RateLimiter;
  provider?: ModelProvider;
}

/**
 * Wires the module's collaborators.
 *
 * Called once at boot with the real stores, and per test with in-memory ones.
 * This exists so importing this module does not connect to anything — the
 * bootstrap at the bottom of the file is guarded on being the entry point.
 */
export function configure(deps: ServerDependencies): void {
  STORE = deps.sessions;
  USERS = deps.users;
  PROGRESS = deps.progress;
  PLANS = deps.plans;
  PROFILES = deps.profiles;
  CONTRIBUTIONS = deps.contributions;
  SUBSCRIPTIONS = deps.subscriptions;
  ACCOUNTS = deps.accounts;
  MAILER = deps.mailer;
  LIMITER = deps.limiter;
  PROVIDER = deps.provider;
}

setInterval(() => {
  // Redis expires its own counters; the memory limiter needs sweeping.
  if (LIMITER instanceof MemoryRateLimiter) LIMITER.sweep();
}, 10 * 60 * 1000).unref();

/** Best-effort client address for limiting anonymous callers. */
function clientIp(req: IncomingMessage): string {
  // Only trust a forwarded header when a proxy is declared, or any caller can
  // mint unlimited identities by rotating the header themselves.
  if (process.env.REALSESSIONS_TRUST_PROXY === "1") {
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

/**
 * Reads a single-file multipart upload.
 *
 * Built on the platform's own `Request.formData()` rather than a multipart
 * library: boundary parsing is exactly the kind of thing that is easy to write
 * and hard to write correctly, and Node ships a tested implementation. The
 * node stream is adapted into a web stream to hand it over.
 *
 * Returns null when the body is not multipart or carries no file, which the
 * caller reports as a bad request rather than guessing at intent.
 */
async function readUpload(
  req: IncomingMessage,
): Promise<{ filename: string; contentType: string; data: Buffer } | null> {
  const type = req.headers["content-type"] ?? "";
  if (!type.includes("multipart/form-data")) return null;

  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > MAX_UPLOAD_BYTES) {
    throw new Error("That file is too large. The limit is 8 MB.");
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    // Checked while reading as well as up front: content-length is a claim by
    // the client, not a guarantee.
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error("That file is too large. The limit is 8 MB.");
    }
    chunks.push(chunk as Buffer);
  }

  const form = await new Response(Buffer.concat(chunks), {
    headers: { "content-type": type },
  }).formData();

  const file = form.get("file");
  if (!(file instanceof File)) return null;

  return {
    filename: file.name || "upload",
    contentType: file.type || "",
    data: Buffer.from(await file.arrayBuffer()),
  };
}

/** A single header value. Node types these as `string | string[]`. */
function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
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

/**
 * Builds the prompt context from the request.
 *
 * Culture and industry are filled from the server's own catalogue whenever the
 * company is one we know, and only fall back to what the client sent for one
 * we do not. The client used to be the source for both, which meant a company
 * added to the catalogue arrived at the interviewer with generic values until
 * the frontend was taught about it separately — two lists to keep in step, and
 * a silent downgrade when they drifted.
 */
function readContext(
  body: Record<string, unknown>,
  targetCompany = true,
): InterviewContext {
  const required = ["candidateName", "targetRole", "companyName", "interviewStage"] as const;

  const missing = required.filter(
    (key) => typeof body[key] !== "string" || (body[key] as string).trim() === "",
  );
  if (missing.length > 0) {
    throw new Error(`Missing or empty field(s): ${missing.join(", ")}`);
  }

  const text = (key: string): string =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";

  // On the free plan the requested employer is replaced, not rejected: the
  // interview still runs, it just does not know who it is for.
  //
  // Replacing the name alone was not enough. `companyCulture` and `industry`
  // are also accepted from the client — for a company outside the catalogue —
  // and a free caller could send `industry: "Fintech"` directly and get the
  // sector-grounded interview that the company picker is supposed to gate. So
  // on the free plan neither field is read from the request at all.
  const companyName = targetCompany ? text("companyName") : GENERIC_COMPANY;

  if (!targetCompany) {
    return {
      candidateName: text("candidateName"),
      targetRole: text("targetRole"),
      companyName,
      companyCulture: GENERIC_CULTURE,
      industry: GENERIC_INDUSTRY,
      interviewStage: text("interviewStage"),
    };
  }

  const known = findCompany(companyName);
  const sector = sectorForCompany(companyName);

  const companyCulture =
    known?.culture || text("companyCulture") || "Craft and high standards";
  const industry = sector?.label || text("industry") || "Technology";

  return {
    candidateName: text("candidateName"),
    targetRole: text("targetRole"),
    companyName,
    companyCulture,
    industry,
    interviewStage: text("interviewStage"),
  };
}

/**
 * Removes the paid half of a finished evaluation.
 *
 * The measured metrics and the actionable next steps are what the pricing page
 * sells as premium, so they cannot travel to a free caller — not on
 * /evaluation and not on /history/:id, which reads the same record back.
 *
 * The fields are emptied rather than deleted, and `withheld` names what was
 * taken. A missing key is indistinguishable from a session that had none, and
 * the client needs the difference to show an upsell where the panel would be
 * instead of silently rendering a shorter report.
 */
function shapeFeedback<T extends { evaluation: Evaluation | null; metrics: unknown }>(
  record: T,
  advanced: boolean,
): T & { withheld: { metrics: boolean; nextSteps: boolean } } {
  if (advanced) {
    return { ...record, withheld: { metrics: false, nextSteps: false } };
  }
  return {
    ...record,
    metrics: null,
    evaluation: record.evaluation
      ? { ...record.evaluation, actionable_next_steps: [] }
      : null,
    withheld: { metrics: true, nextSteps: true },
  };
}

/**
 * Brings the plan into line with what Mercado Pago says about a subscription.
 *
 * The only path from a payment to an entitlement, deliberately: the webhook and
 * the "did it work?" poll after checkout both land here, so there is no second
 * route that could disagree with the first. It reads the provider's API rather
 * than believing a notification body, because a notification is an unsigned
 * claim about our own billing state.
 *
 * Returns the resolved plan so a caller can answer immediately.
 */
async function reconcileSubscription(externalId: string): Promise<Plan | null> {
  const remote = await fetchPreapproval(externalId);
  // external_reference is our identity, round-tripped through the provider.
  // Falling back to the stored row covers a preapproval created before this
  // field was set.
  const known = await SUBSCRIPTIONS.byExternalId(externalId);
  const ownerId = remote.externalReference ?? known?.ownerId ?? null;
  if (!ownerId) return null;

  const periodEnd = remote.nextPaymentDate ? new Date(remote.nextPaymentDate) : null;
  await SUBSCRIPTIONS.put({
    ownerId,
    externalId,
    status: remote.status,
    periodEnd: periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
  });

  if (grantsAccess(remote.status)) {
    // Granted to the end of the paid period, or open-ended when the provider
    // did not say. A grant that outlives the subscription is the failure mode
    // to avoid, so an unknown end date is refreshed on every notification.
    await PLANS.grant(ownerId, "premium", "subscription", periodEnd);
    return "premium";
  }

  // Cancelled or paused. The existing grant keeps running to its expiry, which
  // is the period they already paid for; only an open-ended one is closed.
  if (remote.status === "cancelled") {
    const current = await SUBSCRIPTIONS.forOwner(ownerId);
    if (!current?.periodEnd) await PLANS.revoke(ownerId, "subscription");
  }
  return PLANS.planFor(ownerId);
}

/** Defaults to practice: live coaching on, which is the gentler surprise. */
function readMode(value: unknown): SessionMode {
  return value === "real" ? "real" : "practice";
}

/**
 * Timings for the exchange being submitted, in milliseconds from the start of
 * the session.
 *
 * The clock belongs to the client because only the client knows the facts that
 * matter: when the interviewer's synthesised voice actually stopped, and when
 * the candidate started and stopped talking. The server's own generation
 * timings would measure something else entirely.
 *
 * Anything malformed becomes null rather than a number. A wrong timing is far
 * worse than a missing one — a missing one drops out of the metric, a wrong
 * one silently skews every trend built on it.
 */
interface Timings {
  interviewerEndedMs: number | null;
  answerStartedMs: number | null;
  answerEndedMs: number | null;
}

function readTimings(body: Record<string, unknown>): Timings {
  const raw = body["timings"];
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const ms = (value: unknown): number | null => {
    const parsed = Number(value);
    // A negative offset, a NaN, or something past the session TTL is a client
    // bug rather than a measurement.
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > SESSION_TTL_SECONDS * 1000) {
      return null;
    }
    return Math.round(parsed);
  };
  return {
    interviewerEndedMs: ms(source["interviewerEndedMs"]),
    answerStartedMs: ms(source["answerStartedMs"]),
    answerEndedMs: ms(source["answerEndedMs"]),
  };
}

/**
 * Mirrors the live conversation into the durable store.
 *
 * The whole transcript is rewritten every time rather than appending the new
 * turns. `InterviewSession.transcript` is authoritative for both text and
 * ordering, the write is an upsert keyed on position, and doing it this way
 * means a turn dropped by a failed write earlier is repaired by the next one
 * instead of leaving a permanent hole in the timeline.
 *
 * Timings are attached to the two turns the caller just closed: the final
 * interviewer turn the candidate heard, and the answer they gave.
 */
async function recordTranscript(
  sessionId: string,
  transcript: readonly { speaker: "interviewer" | "candidate"; text: string }[],
  timings?: Timings,
): Promise<void> {
  const turns: RecordedTurn[] = transcript.map((turn, idx) => ({
    idx,
    speaker: turn.speaker,
    text: turn.text,
    tStartMs: null,
    tEndMs: null,
  }));

  if (timings) {
    let lastCandidate: RecordedTurn | undefined;
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i]!.speaker === "candidate") {
        lastCandidate = turns[i]!;
        break;
      }
    }
    if (lastCandidate) {
      lastCandidate.tStartMs = timings.answerStartedMs;
      lastCandidate.tEndMs = timings.answerEndedMs;
      const preceding = turns[lastCandidate.idx - 1];
      if (preceding?.speaker === "interviewer") {
        preceding.tEndMs = timings.interviewerEndedMs;
      }
    }
  }

  await PROGRESS.recordTurns(sessionId, turns);
}

/**
 * Records without letting a storage failure reach the candidate.
 *
 * Progress is valuable but it is not the interview. A Postgres hiccup must not
 * fail a turn the candidate already spoke and cannot easily repeat.
 */
async function recordQuietly(work: Promise<unknown>): Promise<void> {
  try {
    await work;
  } catch (error) {
    console.error("[realsessions] progress write failed:", error);
  }
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

  const siteUrl = () => process.env.REALSESSIONS_SITE_URL ?? "http://localhost:5173";

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
      console.error("[realsessions] email delivery failed:", error);
    }
  };

  const sendVerification = async (accountId: string, email: string) => {
    const { token, hash } = newResetToken();
    await ACCOUNTS.putToken("verify", hash, accountId, VERIFY_TTL_SECONDS);
    await deliver(verifyEmail(email, `${siteUrl()}/verify?token=${token}`));
  };

  const signIn = async (accountId: string): Promise<void> => {
    if (priorIdentity?.kind === "guest") {
      // Preferences and progress are separate stores, so both have to move.
      // Missing either one makes creating an account destroy the very history
      // that motivated creating it.
      await USERS.transfer(priorIdentity.id, accountId);
      await recordQuietly(PROGRESS.transfer(priorIdentity.id, accountId));
      await recordQuietly(PROFILES.transfer(priorIdentity.id, accountId));
      await recordQuietly(PLANS.transfer(priorIdentity.id, accountId));
      await recordQuietly(SUBSCRIPTIONS.transfer(priorIdentity.id, accountId));
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
    // The landing-page list is keyed by email because it is collected before
    // anyone has an account. This is the first moment the two are known
    // together, so it is where the grant is claimed.
    const granted = await PLANS.redeemEarlyAccess(account.email, account.id).catch(
      (error: unknown) => {
        console.error("[realsessions] early-access redemption failed:", error);
        return false;
      },
    );
    json(res, 201, { email: account.email, earlyAccess: granted });
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

  if (req.method === "POST" && path === "/api/early-access") {
    if (await limited(res, `early:${clientIp(req)}`, RULES.signup)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body["email"]);
    if (!email) return json(res, 400, { error: "Enter a valid email address." });

    const text = (key: string) =>
      typeof body[key] === "string" ? (body[key] as string).trim() : "";
    const role = text("role");
    const company = text("company");
    if (role === "") return json(res, 400, { error: "Tell us the role you are targeting." });

    const until = earlyAccessUntil();
    const fresh = await PLANS.recordEarlyAccess(email, role, company, until);

    // Same answer whether or not the address was already on the list. A
    // distinct "already registered" would turn this open endpoint into a way
    // to test whether someone signed up.
    json(res, 202, {
      ok: true,
      months: 6,
      message: fresh
        ? "You are on the list. Create an account with this address and the first six months are on us."
        : "You are on the list. Create an account with this address and the first six months are on us.",
    });
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

  if (req.method === "POST" && path === "/api/billing/webhook") {
    // Public by necessity — Mercado Pago has no cookie. The signature is the
    // authentication, and it is checked before the body is looked at.
    const check = verifySignature({
      signature: header(req, "x-signature"),
      requestId: header(req, "x-request-id"),
      // Mercado Pago puts the id on the query string; the body carries it too
      // but the signed manifest is built from the query one.
      dataId: url.searchParams.get("data.id") ?? undefined,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    });

    if (!check.ok) {
      console.warn(`[realsessions] rejected billing webhook: ${check.reason}`);
      // 401 rather than 400: this is an authentication failure, and Mercado
      // Pago retries on 5xx but not on this, which is what we want for a forgery.
      return json(res, 401, { error: "Invalid signature." });
    }

    const externalId = url.searchParams.get("data.id")!;
    try {
      await reconcileSubscription(externalId);
    } catch (error) {
      console.error("[realsessions] billing reconcile failed:", error);
      // 500 so Mercado Pago retries. Swallowing it would silently strand a
      // paying customer on the free plan.
      return json(res, 500, { error: "Could not reconcile." });
    }
    return json(res, 200, { ok: true });
  }

  if (req.method === "GET" && path === "/api/voice/config") {
    // Deliberately in front of the authentication gate: it is asked before the
    // microphone is opened, the answer is identical for everyone, and making
    // it authenticated cost a 401 on the first call of every session.
    json(res, 200, { live: deepgramConfigured() });
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

  /**
   * What this identity is allowed to do.
   *
   * Resolved per request rather than cached on the token: a grant can start or
   * lapse between requests, and a stale capability set is the difference
   * between a paywall and a giveaway.
   */
  const plan = await PLANS.planFor(identity.id);
  const can = capabilitiesFor(plan);

  /**
   * The review queue.
   *
   * Gated on an allowlist of verified account emails, checked here rather than
   * anywhere near the client. The queue is the only thing standing between a
   * stranger's text and an interview prompt, so "is this person a reviewer" is
   * not a question the browser gets to answer.
   */
  const reviewer = await (async () => {
    if (!reviewEnabled() || identity.kind !== "user") return null;
    const account = await ACCOUNTS.findById(identity.id);
    if (!account) return null;
    return isReviewer({
      email: account.email,
      emailVerified: Boolean(account.emailVerifiedAt),
    })
      ? account.email
      : null;
  })();

  /** 402 with the feature named, so the client can show the right upsell. */
  const requiresPremium = (feature: string): void => {
    json(res, 402, {
      error: "That is part of the paid plan.",
      feature,
      plan,
    });
  };

  if (req.method === "GET" && path === "/api/billing") {
    const configured = mercadoPagoConfigured() && planConfig() !== null;
    json(res, 200, {
      configured,
      plan: planConfig(),
      subscription: await SUBSCRIPTIONS.forOwner(identity.id),
    });
    return;
  }

  if (req.method === "POST" && path === "/api/billing/checkout") {
    if (await limited(res, `checkout:${identity.id}`, RULES.checkout)) return;

    const config = planConfig();
    if (!mercadoPagoConfigured() || !config) {
      return json(res, 503, {
        error: "Payments are not configured on this deployment yet.",
      });
    }
    if (plan === "premium") {
      return json(res, 409, { error: "You are already on the paid plan." });
    }

    // Mercado Pago requires a payer email, and a guest has none. This is also
    // the honest product answer: a subscription has to outlive a browser.
    const account =
      identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;
    if (!account) {
      return json(res, 403, {
        error: "Create an account first — a subscription has to outlive this browser.",
      });
    }

    const created = await createPreapproval({
      externalReference: identity.id,
      payerEmail: account.email,
      backUrl: `${siteUrl()}/app/settings`,
      reason: "Real Sessions — monthly",
      plan: config,
    });

    await SUBSCRIPTIONS.put({
      ownerId: identity.id,
      externalId: created.id,
      // Recorded before they pay so the webhook can find the owner even if
      // external_reference does not come back.
      status: "pending",
      periodEnd: null,
    });

    json(res, 201, { initPoint: created.initPoint });
    return;
  }

  if (req.method === "POST" && path === "/api/billing/cancel") {
    const held = await SUBSCRIPTIONS.forOwner(identity.id);
    if (!held) return json(res, 404, { error: "No subscription to cancel." });

    await cancelPreapproval(held.externalId);
    // Reconciled rather than assumed: the provider is the authority on what
    // just happened, including how long the paid period still runs.
    const resolved = await reconcileSubscription(held.externalId);
    json(res, 200, { plan: resolved ?? "free" });
    return;
  }

  if (req.method === "GET" && path === "/api/plan") {
    json(res, 200, { plan, capabilities: can, reviewer: reviewer !== null });
    return;
  }

  if (req.method === "GET" && path === "/api/context") {
    json(res, 200, { profile: await PROFILES.get(identity.id) });
    return;
  }

  if (req.method === "POST" && path === "/api/context/document") {
    if (!can.candidateProfile) return requiresPremium("candidateProfile");
    if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;

    const upload = await readUpload(req);
    if (!upload) {
      return json(res, 400, {
        error: "Attach a PDF, a .docx, or a plain text file.",
      });
    }

    const kind = kindFor(upload.filename, upload.contentType);
    if (!kind) {
      return json(res, 415, {
        error: "We can read PDF, .docx and plain text. Other formats we would only guess at.",
      });
    }

    const text = await extractText(upload.data, kind);
    const brief = await writeBrief(text);
    await PROFILES.putSource(identity.id, upload.filename, text, brief);
    json(res, 201, { profile: await PROFILES.get(identity.id) });
    return;
  }

  if (req.method === "PUT" && path === "/api/context/links") {
    if (!can.candidateProfile) return requiresPremium("candidateProfile");
    const body = await readJson(req);
    const raw = Array.isArray(body["links"]) ? body["links"] : [];

    const links: ProfileLink[] = [];
    const rejected: string[] = [];
    for (const entry of raw.slice(0, MAX_LINKS * 2)) {
      const classified = typeof entry === "string" ? classifyLink(entry) : null;
      if (classified) links.push(classified);
      else if (typeof entry === "string" && entry.trim() !== "") rejected.push(entry);
    }

    await PROFILES.putLinks(identity.id, links);
    // Rejected links are reported rather than dropped in silence — someone who
    // typed a bare "linkedin" needs to know it did not save.
    json(res, 200, { profile: await PROFILES.get(identity.id), rejected });
    return;
  }

  if (req.method === "DELETE" && path === "/api/context") {
    await PROFILES.clear(identity.id);
    json(res, 200, { profile: await PROFILES.get(identity.id) });
    return;
  }

  if (req.method === "POST" && path === "/api/contributions") {
    if (await limited(res, `contribute:${identity.id}`, RULES.contribute)) return;
    const body = await readJson(req);

    const companyId = typeof body["companyId"] === "string" ? body["companyId"] : "";
    const company = COMPANIES.find((entry) => entry.id === companyId);
    if (!company) return json(res, 400, { error: "Pick a company from the list." });

    const question = readQuestion(body["question"]);
    if (!question) {
      return json(res, 400, {
        error: "Write the question as you remember it — between 12 and 400 characters.",
      });
    }

    const optional = (key: string): string | null => {
      const value = body[key];
      return typeof value === "string" && value.trim() !== ""
        ? value.trim().slice(0, 120)
        : null;
    };

    const stored = await CONTRIBUTIONS.submit(identity.id, {
      companyId,
      question,
      stage: optional("stage"),
      role: optional("role"),
    });

    json(res, stored ? 201 : 200, {
      ok: true,
      stored,
      // Said plainly because it is the honest state of the pipeline: nothing
      // contributed reaches an interview until a person confirms it.
      message: stored
        ? "Thank you. It goes to review before it can shape any interview."
        : "You have already reported that one.",
    });
    return;
  }

  if (req.method === "GET" && path === "/api/review") {
    // 404 rather than 403 for a non-reviewer: whether this deployment has a
    // review queue at all is not something to confirm to everyone who asks.
    if (!reviewer) return json(res, 404, { error: `No route for GET ${path}` });
    json(res, 200, {
      queue: await CONTRIBUTIONS.pending(50),
      depth: await CONTRIBUTIONS.queueDepth(),
      companies: COMPANIES.map(({ id, name }) => ({ id, name })),
    });
    return;
  }

  const reviewMatch = path.match(/^\/api\/review\/(\d+)$/);
  if (req.method === "POST" && reviewMatch) {
    if (!reviewer) return json(res, 404, { error: `No route for POST ${path}` });

    const body = await readJson(req);
    const decision = body["status"];
    if (decision !== "verified" && decision !== "rejected") {
      return json(res, 400, { error: "Decide either verified or rejected." });
    }

    const decided = await CONTRIBUTIONS.decide({
      id: Number(reviewMatch[1]),
      status: decision,
      reviewer,
    });

    // False means someone else already decided it. Reported rather than
    // swallowed, so a reviewer working the queue alongside another does not
    // think their click did something it did not.
    json(res, decided ? 200 : 409, {
      decided,
      ...(decided ? {} : { error: "Already decided by someone else." }),
    });
    return;
  }

  if (req.method === "POST" && path === "/api/sessions") {
    if (await limited(res, `start:${identity.id}`, RULES.startSession)) return;
    const body = await readJson(req);
    // Free runs against a role, not an employer. The downgrade happens here
    // rather than by hiding the picker, because hiding a control is a courtesy
    // and this is the paywall.
    const context = readContext(body, can.targetCompany);
    const mode = readMode(body["mode"]);
    // An unknown or absent id resolves to the company's own default rather
    // than to a neutral interviewer — every session has a temperament.
    const persona =
      can.choosePersona &&
      typeof body["personaId"] === "string" &&
      body["personaId"] !== ""
        ? findPersona(body["personaId"])
        : defaultPersonaFor(context.companyName);

    // The brief is read once, here, and travels in the session snapshot — so
    // an interview keeps the CV it started with even if one is uploaded
    // halfway through.
    const profile = can.candidateProfile
      ? await PROFILES.get(identity.id).catch(() => null)
      : null;
    const candidateBrief = profile ? renderProfileBrief(profile) : "";

    // Only what a reviewer has verified, and only for a named company — a free
    // session runs against the generic one and has no crowd questions to draw
    // on. A read failure costs the interview nothing.
    const known = findCompany(context.companyName);
    const knownQuestions = known
      ? await CONTRIBUTIONS.verified(known.id)
          .then((rows) => rows.map((row) => row.question))
          .catch(() => [])
      : [];

    const session = new InterviewSession(context, {
      personaId: persona.id,
      candidateBrief: candidateBrief === "" ? null : candidateBrief,
      knownQuestions,
      ...(PROVIDER ? { provider: PROVIDER } : {}),
    });
    const sessionId = randomUUID();

    // The durable row is written before the first turn is generated, because
    // every later turn write references it. An abandoned interview leaves a
    // row with no completion, which is exactly what it was.
    await recordQuietly(
      PROGRESS.createSession({
        id: sessionId,
        ownerId: identity.id,
        company: context.companyName,
        sectorId: sectorForCompany(context.companyName)?.id ?? null,
        role: context.targetRole,
        stage: context.interviewStage,
        mode,
        personaId: persona.id,
      }),
    );

    const persist = async (): Promise<void> => {
      await STORE.set(sessionId, {
        snapshot: session.snapshot(),
        context,
        ownerId: identity.id,
        createdAt: Date.now(),
        mode,
      });
      await recordQuietly(recordTranscript(sessionId, session.transcript));
    };

    if (wantsStream(req)) {
      openStream(res);
      sendEvent(res, "session", { sessionId, persona });
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
    json(res, 201, { sessionId, turn, persona });
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
    const timings = readTimings(body);
    const session = InterviewSession.restore(
      stored.snapshot,
      PROVIDER ? { provider: PROVIDER } : {},
    );

    const persist = async (): Promise<void> => {
      await STORE.set(sessionId, { ...stored, snapshot: session.snapshot() });
      await recordQuietly(recordTranscript(sessionId, session.transcript, timings));
    };

    if (wantsStream(req)) {
      openStream(res);
      const turn = await session.submitAnswerStream(answer, (chunk) =>
        sendEvent(res, "delta", { text: chunk }),
      );
      // Written back only after the turn completes, so a failed call leaves
      // the stored conversation where the candidate can retry from.
      await persist();
      sendEvent(res, "turn", { turn });
      res.end();
      return;
    }

    const turn = await session.submitAnswer(answer);
    await persist();
    json(res, 200, { turn });
    return;
  }

  const coachMatch = path.match(/^\/api\/sessions\/([\w-]+)\/coach$/);
  if (req.method === "POST" && coachMatch) {
    if (await limited(res, `coach:${identity.id}`, RULES.coach)) return;
    const stored = await STORE.get(coachMatch[1]!);
    if (!stored || stored.ownerId !== identity.id) {
      return json(res, 404, { error: "Session not found or expired." });
    }
    // Coaching is withheld in real mode by the server, not by the client
    // hiding a panel. The point of real mode is that the help is not there.
    if (stored.mode === "real") return json(res, 200, { tips: [] });
    if (!can.liveCoaching) return requiresPremium("liveCoaching");

    const session = InterviewSession.restore(
      stored.snapshot,
      PROVIDER ? { provider: PROVIDER } : {},
    );
    const transcript = session.transcript;

    // Scanning back for the candidate rather than reading the last two turns.
    // By the time this endpoint is called the interviewer has already replied,
    // so the transcript ends on a question — reading from the end found the
    // wrong pair every time and the coach silently returned nothing.
    let answerAt = -1;
    for (let i = transcript.length - 1; i >= 0; i -= 1) {
      if (transcript[i]!.speaker === "candidate") {
        answerAt = i;
        break;
      }
    }
    const answerTurn = answerAt === -1 ? undefined : transcript[answerAt];
    const questionTurn = answerAt <= 0 ? undefined : transcript[answerAt - 1];
    if (!answerTurn || questionTurn?.speaker !== "interviewer") {
      return json(res, 200, { tips: [] });
    }

    const tips = await coachTurn(
      stored.context,
      questionTurn.text,
      answerTurn.text,
      PROVIDER ? { provider: PROVIDER } : {},
    );
    json(res, 200, { tips });
    return;
  }

  const evalMatch = path.match(/^\/api\/sessions\/([\w-]+)\/evaluation$/);
  if (req.method === "POST" && evalMatch) {
    if (await limited(res, `eval:${identity.id}`, RULES.evaluation)) return;
    const stored = await STORE.get(evalMatch[1]!);
    if (!stored || stored.ownerId !== identity.id) {
      return json(res, 404, { error: "Session not found or expired." });
    }
    const sessionId = evalMatch[1]!;
    const session = InterviewSession.restore(
      stored.snapshot,
      PROVIDER ? { provider: PROVIDER } : {},
    );
    const evaluation = await evaluateInterview(
      stored.context,
      session.transcript,
      PROVIDER ? { provider: PROVIDER } : {},
    );
    const score = evaluation.overall_score_percentage;

    // The transcript is rewritten once more before metrics are computed, so
    // the numbers are derived from the same turns that will be read back on
    // the history screen rather than from a copy that could have drifted.
    await recordQuietly(recordTranscript(sessionId, session.transcript));
    const detail = await PROGRESS.getSession(identity.id, sessionId);
    const metrics = computeMetrics(detail?.turns ?? []);

    // Read before completing, so the session being scored is not counted as
    // one of the sessions it is being compared against.
    const history = await PROGRESS.listSessions(identity.id);
    const previous = history.filter((entry) => entry.id !== sessionId);

    await recordQuietly(
      PROGRESS.completeSession({ sessionId, score, evaluation, metrics }),
    );

    const today = new Date().toISOString().slice(0, 10);
    const mode = stored.mode ?? "practice";
    const events = xpForSession({
      score,
      mode,
      history: previous,
      // From the XP log, not from the session count: the cap has to hold even
      // when the awards per session change.
      xpToday: await PROGRESS.xpOnDay(identity.id, today),
      today,
    });
    await recordQuietly(PROGRESS.addXp(identity.id, sessionId, events));

    const earned = await PROGRESS.awardBadges(
      identity.id,
      badgesForSession({
        score,
        mode,
        stage: stored.context.interviewStage,
        sectorId: sectorForCompany(stored.context.companyName)?.id ?? null,
        company: stored.context.companyName,
        metrics,
        history: previous,
      }),
      sessionId,
    ).catch((error: unknown) => {
      console.error("[realsessions] badge write failed:", error);
      return [] as string[];
    });

    json(res, 200, {
      ...shapeFeedback({ evaluation, metrics }, can.advancedFeedback),
      usage: session.usage,
      // XP and badges stay on the free plan on purpose. They are the loop that
      // brings someone back for a second session, and a progress system that
      // only rewards subscribers rewards nobody at the moment it matters.
      xp: {
        events,
        gained: events.reduce((total, event) => total + event.amount, 0),
      },
      // Only the newly earned ones, so the client can celebrate exactly what
      // just happened rather than re-announcing a badge from last week.
      badges: earned.map((id) => BADGES.find((badge) => badge.id === id) ?? { id }),
    });
    return;
  }

  if (req.method === "GET" && path === "/api/history") {
    const all = await PROGRESS.listSessions(identity.id);
    json(res, 200, {
      sessions: all
        .slice(0, can.historyLimit)
        // Each summary carries its metrics for the history rows to plot.
        .map((entry) => (can.advancedFeedback ? entry : { ...entry, metrics: null })),
      // The client shows what is behind the wall rather than pretending the
      // sessions do not exist. They are the reason to upgrade.
      withheld: Math.max(0, all.length - can.historyLimit),
    });
    return;
  }

  const historyMatch = path.match(/^\/api\/history\/([\w-]+)$/);
  if (req.method === "GET" && historyMatch) {
    const record = await PROGRESS.getSession(identity.id, historyMatch[1]!);
    // Scoped to the identity, so another caller's id reads as missing.
    if (!record) return json(res, 404, { error: "Session not found." });
    // Gated identically to /evaluation. Without this a free caller reads the
    // paid half straight back out of their own history a moment later.
    json(res, 200, { session: shapeFeedback(record, can.advancedFeedback) });
    return;
  }

  /**
   * The progress series. Oldest first, because it is read as a timeline —
   * the list view wants newest first and they are deliberately not the same
   * endpoint.
   */
  if (req.method === "GET" && path === "/api/progress") {
    const sessions = (await PROGRESS.listSessions(identity.id))
      .filter((entry) => entry.completedAt !== null)
      .slice(0, can.historyLimit)
      .reverse();

    const axes = sessions.map((entry) => ({
      sessionId: entry.id,
      completedAt: entry.completedAt,
      scores: axisScores({
        metrics: entry.metrics,
        // Passing null here made the vocabulary axis fall back to a proxy and
        // left the structure axis permanently empty, even though both scores
        // were sitting in the stored evaluation.
        evaluation:
          entry.vocabularyScore === null || entry.structureScore === null
            ? null
            : {
                vocabulary_feedback: {
                  score_out_of_10: entry.vocabularyScore,
                  good_usage: [],
                  missed_opportunities_or_errors: [],
                },
                structure_feedback: {
                  score_out_of_10: entry.structureScore,
                  feedback_text: "",
                },
              },
      }),
    }));

    json(res, 200, { sessions, axes, axisNames: AXES });
    return;
  }

  /**
   * The gamification profile: XP, level, badges.
   *
   * Not to be confused with /api/context, which is the candidate's CV. Both
   * lived at /api/profile for a while and the first match won, so this route
   * was unreachable and the Progress screen's level and badges silently
   * rendered from the wrong shape.
   */
  if (req.method === "GET" && path === "/api/profile") {
    const profile = await PROGRESS.profile(identity.id);
    json(res, 200, {
      xp: profile.xp,
      ...levelForXp(profile.xp),
      badges: profile.badges.map((held) => ({
        ...held,
        ...(BADGES.find((badge) => badge.id === held.badgeId) ?? {}),
      })),
      catalogue: BADGES,
    });
    return;
  }

  if (req.method === "GET" && path === "/api/leaderboard") {
    const rows = await PROGRESS.leaderboard(30);
    // Owner ids are opaque identity strings and must not leave the server —
    // publishing them would let anyone holding one read another person's rank.
    // The caller gets their own position and the shape of the league, nothing
    // that identifies the people in it.
    const rank = rows.findIndex((row) => row.ownerId === identity.id);
    json(res, 200, {
      rows: rows.map((row, index) => ({
        position: index + 1,
        xp: row.xp,
        you: row.ownerId === identity.id,
      })),
      you: rank === -1 ? null : rank + 1,
    });
    return;
  }

  if (req.method === "GET" && path === "/api/catalogue") {
    json(res, 200, { sectors: SECTORS, companies: COMPANIES, personas: PERSONAS });
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

export const server = createServer((req, res) => {
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
      console.error("[realsessions] mid-stream:", error);
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
    // Both carry a message written for the person who uploaded the file.
    if (error instanceof ExtractionError || error instanceof BriefError) {
      return json(res, 422, { error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/Missing or empty field|too large|empty|already/i.test(message)) {
      return json(res, 400, { error: message });
    }
    console.error("[realsessions]", error);
    json(res, 500, { error: "Internal error." });
  });
});

/**
 * Boot only when this file is what was run.
 *
 * Without the guard, importing this module to test its routes would connect to
 * Redis and Postgres and bind the port. The routes are the largest untested
 * surface in the project, and this is what makes them reachable.
 */
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
const redis = await getRedis();
const db = await getDb();
const store = createSessionStore(redis);
configure({
  sessions: store,
  users: createUserStore(redis),
  accounts: createAccountStore(redis),
  mailer: createEmailSender(),
  limiter: createRateLimiter(redis),
  progress: createProgressStore(db),
  plans: createEntitlementStore(db),
  profiles: createProfileStore(db),
  contributions: createContributionStore(db),
  subscriptions: createSubscriptionStore(db),
});

// The catalogue is code (see sectors.ts) and the table is a copy of it, so
// this runs on every boot rather than as a migration someone has to remember.
if (db) await seedCatalogue(db);

/**
 * The voice socket shares the HTTP port.
 *
 * Identity comes from the same cookie as every other request — an upgrade
 * carries headers, so there is no second auth scheme to get wrong. A rejected
 * upgrade never allocates a WebSocket.
 */
attachVoiceGateway(server, {
  identify: (req) => {
    const identity = verifyToken(readCookie(req.headers.cookie));
    return identity ? identity.id : null;
  },
});

server.listen(PORT, () => {
  console.log(
    `Real Sessions API on http://localhost:${PORT} ` +
      `(sessions: ${store.kind}, progress: ${PROGRESS.kind}, ` +
      `rate limits: ${LIMITER.kind}, email: ${MAILER.kind}, ` +
      `voice: ${deepgramConfigured() ? "deepgram" : "browser"})`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    // Close the Redis connection so an in-flight write is not cut mid-command.
    server.close(() => {
      void store
        .close()
        .then(() => PROGRESS.close())
        .then(closeRedis)
        .then(closeDb)
        .then(() => process.exit(0));
    });
  });
}
}
