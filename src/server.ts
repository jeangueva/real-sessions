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
 *   POST /api/history/:id/share         → { shared: { token, url } }
 *   DELETE /api/history/:id/share       → { shared: null }
 *   GET  /api/shared/:token             → { report }  (public, no identity)
 *   GET  /api/applications              → { applications }
 *   POST /api/applications              → { application }
 *   PATCH /api/applications/:id         → { application }
 *   DELETE /api/applications/:id        → { deleted }
 *   GET  /api/progress                  → { sessions, axes }
 *   GET  /api/profile                   → { xp, level, badges }  (gamification)
 *   GET  /api/leaderboard               → { rows }
 *   GET  /api/catalogue                 → { sectors, companies, personas }
 *   GET  /api/billing                   → { configured, plan, subscription }
 *   POST /api/billing/checkout          → { initPoint } to send the payer to
 *   POST /api/billing/subscribe         → takes a card token, starts the plan
 *   POST /api/billing/reconcile         → asks the provider whether it settled
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
 *   GET  /api/auth/config               → { google }  (public, no identity)
 *   POST /api/auth/google               → signs in with a Google ID token
 *   DELETE /api/account                 → erases the account and its data
 *
 * Every route but /api/auth requires that identity, and every interview is
 * owned by the identity that created it.
 *
 * The exception is /api/shared/:token, where the token IS the authorisation:
 * it is a link the owner chose to hand out, and it answers a reader who has
 * no identity at all. What that reader receives is built by `publicReport`,
 * field by field — see the reasoning there.
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
  accountDeletedEmail,
  createEmailSender,
  earlyAccessEmail,
  earlyAccessUnlockedEmail,
  inactivityEmail,
  defenseCountdownEmail,
  COUNTDOWN_DAYS,
  lastFreeInterviewEmail,
  passwordChangedEmail,
  googleOnlyEmail,
  resetEmail,
  reviewQueueEmail,
  subscriptionMail,
  verifyEmail,
  weeklyDigestEmail,
  type EmailMessage,
  type EmailSender,
} from "./email.js";
import { createRateLimiter, MemoryRateLimiter, RULES, type RateLimiter } from "./rate-limit.js";
import { closeRedis, getRedis } from "./redis.js";
import { InterviewSession } from "./interviewer.js";
import type { ModelProvider } from "./providers/index.js";
import { evaluateInterview, EvaluationParseError, gradeRetry } from "./evaluator.js";
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
  type SessionDetail,
  type ApplicationStatus,
  isApplicationStatus,
} from "./progress-store.js";
import { computeMetrics } from "./metrics.js";
import type { SessionMetrics } from "./metrics.js";
import {
  axisScores,
  badgesForSession,
  DAILY_GOAL_XP,
  missionKind,
  shareMissionXp,
  weekStart as missionWeekStart,
  weeklyMissions,
  levelForXp,
  xpForSession,
  BADGES,
  AXES,
  DAILY_XP_CAP,
} from "./gamification.js";
import { coachTurn } from "./coach.js";
import { COMPANIES, SECTORS, findCompany, sectorForCompany } from "./sectors.js";
import { PERSONAS, castFor, findPersona } from "./personas.js";
import {
  capabilitiesFor,
  normalisePromoCode,
  promoCodesFromEnv,
  createEntitlementStore,
  EARLY_ACCESS_MONTHS,
  earlyAccessClosesAt,
  earlyAccessOpen,
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
import {
  analyzeThesis,
  createThesisStore,
  extractPages,
  extractPhoto,
  MAX_THESIS_BYTES,
  renderDossier,
  ThesisAnalysisError,
  type ThesisStore,
} from "./thesis.js";
import type { DefenseSetup } from "./prompts/interviewer.js";
import { findFormat, publicFormats } from "./defense-formats.js";
import { DEFENSE_SCENARIOS, SCENARIOS, scenarioForDegree, soloJurorFor } from "./prompts/defense.js";
import { createPresenceStore, MAX_FRAME_CHARS, MAX_FRAMES, readPresence, type PresenceStore } from "./presence.js";
import { createInstitutionStore, seatHeld, type InstitutionStore } from "./institutions.js";
import { COMMISSION_RATE, createAdvisorStore, normalizeCode, type AdvisorStore } from "./advisors.js";
import { googleTtsConfigured, googleVoiceFor, synthesizeGoogle } from "./voice/google-tts.js";
import { azureConfigured, azureVoiceFor, synthesizeAzure } from "./voice/azure-tts.js";
import { createDefenseQuestionStore, universityKey, type DefenseQuestionStore } from "./defense-questions.js";
import {
  analyzeObservations,
  isGiftToken,
  MAX_OBSERVATIONS_TEXT,
  readJury,
  readMentorRequest,
} from "./defense-extras.js";
import {
  authRedirect,
  createLtiStore,
  LtiError,
  ltiJwks,
  postScore,
  readState,
  verifyLaunch,
  type JwksFetcher,
  type LtiStore,
} from "./lti.js";
import { createB2bLeadStore, readLead, type B2bLeadStore } from "./b2b.js";
import { payoutSummary, readPayout } from "./advisors.js";
import { createHmac as hmacFor, randomBytes as randomFor, timingSafeEqual as sameBytes } from "node:crypto";
import { writeStudy } from "./study.js";
import { DEFAULT_SLOT_SECONDS, readSlides, reviewSlides, wordCounts } from "./slides.js";
import {
  createDefensePackStore,
  isPackKind,
  PACK_KINDS,
  remainingCredits,
  unlocks,
  ADVISOR_PRO_CREDITS,
  ADVISOR_PRO_SEATS,
  type DefensePackStore,
  type PackGrant,
  type PackKind,
} from "./defense-packs.js";

/** Free rehearsals of a defence, per account, ever. */
const FREE_DEFENSES = 1;

/** The currency every pack is sold in: the Mercado Pago account's own. */
const PACK_CURRENCY = process.env.DEFENSE_PACK_CURRENCY ?? process.env.MERCADOPAGO_CURRENCY ?? "PEN";

/**
 * What someone may still rehearse: full defences left in their packs, and
 * whether the free express one is spent.
 */
/** Whether the top pack, with a real teacher, is on sale. Off until there are teachers. */
const DOCENTE_ENABLED = process.env.DEFENSE_DOCENTE_ENABLED === "1";

/** The kinds a student can buy right now. */
function studentOffers(): PackKind[] {
  return (Object.keys(PACK_KINDS) as PackKind[]).filter(
    (kind) => !PACK_KINDS[kind].advisor && (kind !== "docente" || DOCENTE_ENABLED),
  );
}

/**
 * A rehearsal's grade, to the gradebook of the course it was launched from.
 * Quiet on failure: the record is in Mockio either way, and a platform that
 * refuses a score is the university's to look at, not the student's.
 */
async function sendGradeToCourse(ownerId: string, acta: { grade: number; grade_max: number; verdict?: string | null }) {
  try {
    const link = await LTI.linkOfAccount(ownerId);
    if (!link?.lineitem) return;
    const platform = await LTI.platformById(link.platformId);
    if (!platform) return;
    await postScore(platform, link, {
      given: acta.grade,
      maximum: acta.grade_max,
      comment: `Ensayo de sustentación en Mockio${acta.verdict ? ` · ${acta.verdict}` : ""}`,
    });
  } catch (error) {
    console.error("[mockio] grade passback failed:", error);
  }
}

/**
 * The one-time pass from an LTI launch to a first-party page: signed, two
 * minutes long, spent on first use. The launch arrives as a cross-site post
 * — often inside an iframe, where a cookie cannot be set — so the session is
 * started on a top-level page of our own instead.
 */
const usedPasses = new Map<string, number>();

function ltiPass(accountId: string, to: string): string {
  const payload = Buffer.from(JSON.stringify({ a: accountId, t: to, e: Date.now() + 120_000, r: randomFor(8).toString("hex") })).toString("base64url");
  const mac = hmacFor("sha256", process.env.REALSESSIONS_SESSION_SECRET ?? "mockio-lti-dev-state").update(`pass:${payload}`).digest("base64url");
  return `${payload}.${mac}`;
}

function readLtiPass(pass: string): { accountId: string; to: string } | null {
  const [payload, mac] = pass.split(".");
  if (!payload || !mac) return null;
  const expected = hmacFor("sha256", process.env.REALSESSIONS_SESSION_SECRET ?? "mockio-lti-dev-state").update(`pass:${payload}`).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !sameBytes(given, expected)) return null;
  const now = Date.now();
  for (const [key, expires] of usedPasses) if (expires < now) usedPasses.delete(key);
  if (usedPasses.has(mac)) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { a: string; t: string; e: number };
  if (parsed.e < now) return null;
  usedPasses.set(mac, parsed.e);
  // Only our own pages: the destination was chosen by the server, but a
  // pass is a bearer token and must never become an open redirect.
  return { accountId: parsed.a, to: ["/app", "/app/advisor"].includes(parsed.t) ? parsed.t : "/app" };
}

async function defenseAllowance(ownerId: string): Promise<{
  credits: number;
  freeLeft: number;
  modes: boolean;
  group: boolean;
  /** Who pays for the rehearsals beyond the student's own: an advisor or a school. */
  sponsor: { kind: "advisor" | "institution"; name: string } | null;
  /** The school's rubric, when the student rehearses on its account. */
  rubric: string | null;
  /** A session with a real teacher is included: the top pack. */
  mentor: boolean;
  /**
   * Anything paid for, by anyone: the real jury, the observations and the
   * real questions' text open with it. Credits spent do not close them — a
   * student who used all five still prepares with what they bought.
   */
  paid: boolean;
}> {
  const [packs, past, sponsored] = await Promise.all([
    readQuietly(PACKS.active(ownerId), []),
    readQuietly(PROGRESS.listSessions(ownerId), []),
    readQuietly(sponsorship(ownerId), null),
  ]);
  const full = past.filter((entry) => entry.stage === "Sustentación de tesis").map((entry) => entry.startedAt);
  const express = past.filter((entry) => entry.stage.startsWith("Sustentación")).length;
  // A sponsor's rehearsals count as one more grant: whatever is used is
  // used from all of them together, so nobody is charged twice for one.
  const grants = sponsored ? [...packs, sponsored.grant] : packs;
  const own = unlocks(packs);
  return {
    credits: remainingCredits(grants, full),
    freeLeft: Math.max(0, FREE_DEFENSES - express),
    modes: own.modes || sponsored?.modes === true,
    group: own.group,
    sponsor: sponsored ? { kind: sponsored.kind, name: sponsored.name } : null,
    rubric: sponsored?.rubric ?? null,
    mentor: own.mentor,
    paid: grants.length > 0,
  };
}

/**
 * The rehearsals someone else pays for: the student's school, if they hold a
 * seat in a cohort in date, or else their advisor's Pro plan, if they share
 * their progress and are among its first students.
 */
async function sponsorship(studentId: string): Promise<{
  kind: "advisor" | "institution";
  name: string;
  modes: boolean;
  rubric: string | null;
  grant: PackGrant;
} | null> {
  const membership = await INSTITUTIONS.membership(studentId);
  if (membership) {
    const institution = await INSTITUTIONS.byCode(membership.code);
    if (institution && seatHeld(institution, await INSTITUTIONS.members(institution.code), studentId)) {
      return {
        kind: "institution",
        name: institution.name,
        modes: true,
        rubric: institution.rubric,
        grant: {
          paymentId: `institution:${institution.code}`,
          kind: "sustentacion",
          credits: institution.creditsPerStudent,
          grantedAt: membership.joinedAt,
          expiresAt: institution.expiresAt,
        },
      };
    }
  }
  const link = await ADVISORS.linkOf(studentId);
  if (!link?.share) return null;
  const advisor = await ADVISORS.byCode(link.code);
  if (!advisor) return null;
  const pro = (await PACKS.active(advisor.ownerId)).find((pack) => pack.kind === "asesor_pro");
  if (!pro) return null;
  const seated = (await ADVISORS.students(link.code))
    .filter((entry) => entry.share)
    .sort((a, b) => Date.parse(a.linkedAt) - Date.parse(b.linkedAt))
    .slice(0, ADVISOR_PRO_SEATS)
    .some((entry) => entry.studentId === studentId);
  if (!seated) return null;
  return {
    kind: "advisor",
    name: advisor.name,
    modes: false,
    rubric: null,
    grant: {
      paymentId: `advisor:${link.code}`,
      kind: "sustentacion",
      credits: ADVISOR_PRO_CREDITS,
      // From when this student's sponsored month began.
      grantedAt: Date.parse(link.linkedAt) > Date.parse(pro.grantedAt) ? link.linkedAt : pro.grantedAt,
      expiresAt: pro.expiresAt,
    },
  };
}

/**
 * The student's last finished defences, oldest first: the grade on its own
 * scale and the readiness index, for the "your progress" strip. Read from
 * the stored records, a handful at a time — nobody rehearses fifty times.
 */
async function defenseProgress(ownerId: string) {
  const sessions = await readQuietly(PROGRESS.listSessions(ownerId), []);
  const finished = sessions.filter((entry) => entry.stage.startsWith("Sustentación") && entry.completedAt).slice(0, 8);
  const details = await Promise.all(finished.map((entry) => readQuietly(PROGRESS.getSession(ownerId, entry.id), null)));
  return details
    .filter((detail): detail is NonNullable<typeof detail> => Boolean(detail?.evaluation?.acta))
    .map((detail) => {
      const acta = detail.evaluation!.acta!;
      return {
        id: detail.id,
        at: detail.startedAt,
        grade: acta.grade,
        gradeMax: acta.grade_max,
        passMark: acta.pass_mark,
        readiness: acta.readiness,
      };
    })
    .reverse();
}

/**
 * One student as their advisor or school sees them: first name, thesis title
 * and date, how many rehearsals, first and latest score. Never the thesis
 * text, never an answer, never an email.
 */
async function studentSummary(studentId: string) {
  const [thesis, sessions, preferences] = await Promise.all([
    readQuietly(THESES.get(studentId), null),
    readQuietly(PROGRESS.listSessions(studentId), []),
    readQuietly(USERS.getPreferences(studentId), null),
  ]);
  const defences = sessions.filter((entry) => entry.stage.startsWith("Sustentación"));
  const graded = defences.filter((entry) => entry.score !== null);
  return {
    name: preferences?.candidateName?.trim().split(/\s+/)[0] || null,
    thesis: thesis?.analysis.title ?? null,
    defenseDate: thesis?.defenseDate ?? null,
    rehearsals: defences.length,
    lastScore: graded[0]?.score ?? null,
    firstScore: graded.at(-1)?.score ?? null,
    lastAt: defences[0]?.startedAt ?? null,
  };
}

/**
 * Questions real juries at this university asked, for the panel to draw on.
 *
 * Verified ones only, and fenced as quoted material: they were written by
 * other students, and a reviewer having read them is what lets them near a
 * prompt at all. A read failure costs the rehearsal nothing.
 */
async function realQuestionsBlock(university: string): Promise<string> {
  const found = await readQuietly(REAL_QUESTIONS.verified(universityKey(university), 8), []);
  if (found.length === 0) return "";
  return [
    "",
    "",
    "QUESTIONS REAL JURIES AT THIS UNIVERSITY HAVE ASKED (reported anonymously by students after their defence, verified). Ask at least one of them during the session, reworded to this thesis — they are what this university's juries really ask; never read them out as a list:",
    ...found.map((entry) => `- "${entry.question.replace(/"/g, "'")}"`),
  ].join("\n");
}

/**
 * Grants a pack for one Mercado Pago payment, after reading it back.
 *
 * The notification and the payer's return both land here; the payment id is
 * unique in the store, so whichever arrives second changes nothing.
 */
async function settlePackPayment(paymentId: string, expectedOwner?: string): Promise<"granted" | "already" | "not-yet" | "not-ours"> {
  const payment = await fetchPayment(paymentId);
  // "pack:<kind>:<owner>", or "pack:<owner>" from before there were kinds.
  const reference = payment.externalReference ?? "";
  if (!reference.startsWith("pack:")) return "not-ours";
  const [first, ...rest] = reference.slice("pack:".length).split(":");
  const kind: PackKind = rest.length > 0 && isPackKind(first) ? first : "sustentacion";
  const ownerId = rest.length > 0 ? rest.join(":") : first ?? "";
  if (expectedOwner && ownerId !== expectedOwner) return "not-ours";
  if (payment.status !== "approved") return "not-yet";
  // Paid what that offer costs, in its currency: a preference is ours, but
  // the check is cheap and keeps a misconfigured price from granting a pass.
  if (payment.currency !== PACK_CURRENCY || payment.amount + 0.001 < PACK_KINDS[kind].amount) return "not-ours";
  const granted = await PACKS.grant(ownerId, payment.id, kind);
  // The advisor who brought this student earns their share of it. Quiet on
  // failure: a missed commission is fixed by hand, a failed grant is not.
  if (granted) {
    const link = await readQuietly(ADVISORS.linkOf(ownerId), null);
    if (link) {
      await recordQuietly(
        ADVISORS.recordCommission(link.code, {
          paymentId: payment.id,
          studentId: ownerId,
          amount: Math.round(payment.amount * COMMISSION_RATE * 100) / 100,
          currency: payment.currency,
        }),
      );
    }
  }
  return granted ? "granted" : "already";
}

const DEFENSE_MODEL = process.env.REALSESSIONS_DEFENSE_MODEL ?? "anthropic/claude-sonnet-5";
const DEFENSE_FALLBACKS = (process.env.REALSESSIONS_DEFENSE_FALLBACKS ?? "qwen/qwen3.7-plus")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
import { attachVoiceGateway } from "./voice/gateway.js";
import { isReviewer, reviewEnabled, reviewerEmails } from "./reviewers.js";
import { MAX_POSTING_CHARS } from "./prompts/interviewer.js";
import { FOREVER_SOURCE, holdsForeverPremium } from "./forever.js";
import {
  googleClientId,
  verifyGoogleIdToken,
  type GoogleIdentity,
} from "./google.js";
import {
  INACTIVE_DAYS,
  JOBS,
  lifecycleEmailEnabled,
  NUDGE_COOLDOWN_DAYS,
  unsubscribeTokenValid,
  unsubscribeUrl,
} from "./lifecycle.js";
import { createLifecycleStore, type LifecycleStore } from "./lifecycle-store.js";
import { AREAS, ROLES, interviewerTitle, roleIdFor } from "./roles.js";
import { ratesFrom } from "./fx.js";
import { normaliseCountry, regionFor } from "./billing/regions.js";
import {
  cancelPaddleSubscription,
  fetchPaddleSubscription,
  fetchPaddleTransaction,
  paddleConfig,
  parseSubscriptionEvent,
  verifyPaddleSignature,
} from "./billing/paddle.js";
import type { PaddleSubscription } from "./billing/paddle.js";
import {
  MAX_COMBINED,
  isAfterTheOffer,
  isDefense,
  resolveStages,
  stageCatalogue,
  titlesFor,
} from "./stages.js";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  findLanguage,
  voiceFor,
  juryVoiceFor,
} from "./languages.js";
import { findLevel, levelCatalogue, readyToLevelUp } from "./levels.js";
import { pressureRequested } from "./pressure.js";
import { createStaticSite, type StaticSite } from "./static.js";
import {
  cancelPreapproval,
  checkoutBlockReason,
  createPreapproval,
  createPackPreference,
  fetchPayment,
  fetchPreapproval,
  billingMode,
  grantsAccess,
  MercadoPagoError,
  mercadoPagoConfigured,
  planConfig,
  planOffer,
  planForCycle,
  isBillingCycle,
  type BillingCycle,
  createCardSubscription,
  publicKey,
  readAmount,
  verifySignature,
  type PreapprovalStatus,
} from "./billing/mercadopago.js";
import {
  createSubscriptionStore,
  type SubscriptionStore,
} from "./billing/store.js";
import { deepgramConfigured } from "./voice/deepgram.js";
import {
  MAX_SPEECH_CHARS,
  SPEECH_MIME,
  synthesize,
  ttsConfigured,
} from "./voice/tts.js";
import { writeBrief, BriefError } from "./brief.js";
import {
  createUserStore,
  nameFromEmail,
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
let THESES: ThesisStore;
let PACKS: DefensePackStore;
let REAL_QUESTIONS: DefenseQuestionStore;
let ADVISORS: AdvisorStore;
let INSTITUTIONS: InstitutionStore;
let LTI: LtiStore;
let LEADS: B2bLeadStore;
/** The platforms' key sets are read through this; a test supplies its own. */
let LTI_JWKS: JwksFetcher | undefined;
let PRESENCE: PresenceStore;
let CONTRIBUTIONS: ContributionStore;
let SUBSCRIPTIONS: SubscriptionStore;
let LIFECYCLE: LifecycleStore;
/**
 * The built web app, when one is present beside the server.
 *
 * Null in development, where Vite serves the app and proxies /api here.
 */
let SITE: StaticSite | null = null;
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
let VERIFY_GOOGLE: typeof verifyGoogleIdToken = verifyGoogleIdToken;

export interface ServerDependencies {
  sessions: SessionStore;
  users: UserStore;
  progress: ProgressStore;
  plans: EntitlementStore;
  profiles: ProfileStore;
  /** Optional so every existing test keeps its wiring; memory when absent. */
  theses?: ThesisStore;
  packs?: DefensePackStore;
  realQuestions?: DefenseQuestionStore;
  advisors?: AdvisorStore;
  institutions?: InstitutionStore;
  /** Universities' platforms connected over LTI 1.3. */
  lti?: LtiStore;
  ltiJwks?: JwksFetcher;
  leads?: B2bLeadStore;
  presence?: PresenceStore;
  contributions: ContributionStore;
  subscriptions: SubscriptionStore;
  lifecycle: LifecycleStore;
  accounts: AccountStore;
  mailer: EmailSender;
  limiter: RateLimiter;
  provider?: ModelProvider;
  /**
   * How a Google token is checked, injected like every other collaborator.
   *
   * Defaults to the real verifier, which talks to Google for its public keys.
   * A test cannot mint a token Google signed, so without this seam the only
   * testable part of signing in with Google would be its refusals — and the
   * part worth testing is what happens to an account afterwards.
   */
  verifyGoogle?: typeof verifyGoogleIdToken;
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
  THESES = deps.theses ?? createThesisStore(null);
  PACKS = deps.packs ?? createDefensePackStore(null);
  REAL_QUESTIONS = deps.realQuestions ?? createDefenseQuestionStore(null);
  ADVISORS = deps.advisors ?? createAdvisorStore(null);
  INSTITUTIONS = deps.institutions ?? createInstitutionStore(null);
  LTI = deps.lti ?? createLtiStore(null);
  LTI_JWKS = deps.ltiJwks;
  LEADS = deps.leads ?? createB2bLeadStore(null);
  PRESENCE = deps.presence ?? createPresenceStore(null);
  CONTRIBUTIONS = deps.contributions;
  SUBSCRIPTIONS = deps.subscriptions;
  LIFECYCLE = deps.lifecycle;
  ACCOUNTS = deps.accounts;
  MAILER = deps.mailer;
  LIMITER = deps.limiter;
  PROVIDER = deps.provider;
  VERIFY_GOOGLE = deps.verifyGoogle ?? verifyGoogleIdToken;
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

/**
 * Headers every response carries, API and page alike.
 *
 * Deliberately short. `frame-ancestors 'none'` stops another site framing the
 * app — clickjacking on pages that take passwords and payments — without a full
 * Content-Security-Policy, which would have to list the hero video, the fonts
 * and Mercado Pago's card script before it could ship without breaking one of
 * them. HSTS is production-only: on localhost it would pin a developer's
 * browser to https for months.
 */
function securityHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  res.setHeader("X-Frame-Options", "DENY");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000");
  }
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
  limit = MAX_UPLOAD_BYTES,
): Promise<{ filename: string; contentType: string; data: Buffer } | null> {
  const tooLarge = `That file is too large. The limit is ${Math.round(limit / 1024 / 1024)} MB.`;
  const type = req.headers["content-type"] ?? "";
  if (!type.includes("multipart/form-data")) return null;

  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > limit) {
    throw new Error(tooLarge);
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    // Checked while reading as well as up front: content-length is a claim by
    // the client, not a guarantee.
    if (size > limit) {
      throw new Error(tooLarge);
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
/**
 * The part of a resolved context the interview screen displays.
 *
 * `readContext` can replace what the client asked for — a free session runs
 * against a generic employer whatever company was picked — so the screen has
 * to render what the interview is actually about rather than what was
 * requested. `generic` is what lets it say so out loud instead of quietly
 * printing a different name than the one the candidate chose.
 */
function shown(context: InterviewContext): {
  companyName: string;
  targetRole: string;
  interviewStage: string;
  industry: string;
  generic: boolean;
} {
  return {
    companyName: context.companyName,
    targetRole: context.targetRole,
    interviewStage: context.interviewStage,
    industry: context.industry,
    generic: context.companyName === GENERIC_COMPANY,
  };
}

/** Interface locales the report can be written in, by the name a model reads. */
/**
 * Pays the weekly sharing mission the first time something is shared this
 * week, and returns what was paid so the client can say so. A storage
 * failure pays nothing rather than failing the share.
 */
async function recordShare(ownerId: string): Promise<{ events: { kind: string; amount: number }[]; gained: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const shared = await readQuietly(
    PROGRESS.hasXpSince(ownerId, missionKind("week-share"), missionWeekStart(today)),
    true,
  );
  const events = shareMissionXp(shared);
  await recordQuietly(PROGRESS.addXp(ownerId, null, events));
  return { events, gained: events.reduce((total, event) => total + event.amount, 0) };
}

const REPORT_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  it: "Italian",
  de: "German",
  ru: "Russian",
  hi: "Hindi",
  ar: "Arabic",
  he: "Hebrew",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
};

/** The longest company, role or stage name a session will store. */
const CONTEXT_FIELD_MAX = 120;

function readContext(
  body: Record<string, unknown>,
  targetCompany = true,
): InterviewContext {
  const required = ["targetRole", "companyName", "interviewStage"] as const;

  const missing = required.filter(
    (key) => typeof body[key] !== "string" || (body[key] as string).trim() === "",
  );
  if (missing.length > 0) {
    throw new Error(`Missing or empty field(s): ${missing.join(", ")}`);
  }

  /**
   * Trimmed and capped. Company and role had no upper bound: whatever the
   * client sent was stored and then rendered on every card and report that
   * names the session. 120 is longer than any real job title or legal name
   * and short enough that a pasted paragraph cannot become a "role".
   */
  const text = (key: string): string =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, CONTEXT_FIELD_MAX) : "";

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
/**
 * What a stranger holding a share link is allowed to see.
 *
 * Built field by field rather than by deleting from the session, and that
 * direction is the whole security property. A blacklist is a list somebody has
 * to remember to extend: the day a column is added to `sessions` — an email, a
 * note, an uploaded CV's text — it ships to every share link in the world and
 * nobody notices, because nothing failed. A whitelist means a new field is
 * invisible until somebody writes it down here on purpose.
 *
 * So: the report, and just enough around it for the page to make sense. Not
 * the owner id, which is the identity the whole product is keyed by. Not the
 * transcript — that is the candidate's own words under pressure, and sharing a
 * score is not consenting to publish a recording of yourself struggling with
 * a question. Not the internal session id, which would let a reader try it
 * against the authenticated endpoints.
 *
 * The evaluation goes out as its owner sees it. A premium owner's link carries
 * the next steps and the metrics — somebody sharing their report is sharing
 * their report. A free owner's link carries the free half, through the same
 * `shapeFeedback` the owner's own screen uses: sharing is free so that the
 * product spreads, and it must not become a way round the paywall, where a
 * free candidate opens their own link and reads what they did not pay for.
 */
function publicReport(
  record: SessionDetail,
  advanced: boolean,
): {
  company: string;
  role: string;
  stage: string;
  completedAt: string | null;
  score: number | null;
  evaluation: Evaluation | null;
  metrics: SessionMetrics | null;
} {
  const shaped = shapeFeedback(
    { evaluation: record.evaluation, metrics: record.metrics },
    advanced,
  );
  return {
    company: record.company,
    role: record.role,
    stage: record.stage,
    completedAt: record.completedAt,
    score: record.score,
    evaluation: shaped.evaluation,
    metrics: shaped.metrics,
  };
}

/**
 * Which billing cycle a checkout asked for.
 *
 * Takes the parsed body rather than the request, because a request body can
 * be read exactly once — reading it here and again in the route left the
 * route with an empty object and turned every card payment into a 400.
 *
 * Absent means monthly, so a client that knows nothing about years keeps
 * working. An unknown value is refused rather than coerced: "yearly" misread
 * as monthly charges a twelfth of what somebody agreed to, and "monthly"
 * misread as yearly charges twelve times.
 */
function cycleFrom(body: Record<string, unknown>): BillingCycle | null {
  const raw = body["cycle"];
  if (raw === undefined) return "monthly";
  return isBillingCycle(raw) ? raw : null;
}

/**
 * Claims the early-access months an address was promised, if any.
 *
 * Shared by the two ways an address gets proved: a confirmation link consumed
 * from the inbox, and signing in with Google, which proves it the same way
 * Google proves it to itself. The landing-page list is keyed by email because
 * it is collected before anyone has an account, and the grant is claimed when
 * the address is proved rather than when it is typed — typing an address
 * proves nothing about owning it.
 *
 * A failure here never fails the sign-in it is attached to. Somebody who
 * cannot get into their account because a promotional grant could not be
 * written has been given a worse problem than the one we were solving.
 */
/**
 * Gives the handful of addresses that hold premium for free the row that says
 * so.
 *
 * This existed as a module with tests and no caller: `forever.ts` was written,
 * imported here, and never invoked, so putting an address in the environment
 * variable did exactly nothing. The tests passed because they tested the
 * module in isolation — nothing tested that it was wired to anything.
 *
 * Checked at sign-in rather than only at sign-up, which makes it self-healing:
 * adding an address to the list reaches somebody who already has an account
 * the next time they sign in, instead of never.
 *
 * Skipped when the account is already premium, which is both the idempotence —
 * no second row per sign-in — and the right behaviour for a paying subscriber
 * who is also on the list. If their subscription later lapses they fall to
 * free, and the next sign-in grants this.
 */
async function claimForeverPremium(account: { id: string; email: string }): Promise<void> {
  if (!holdsForeverPremium(account.email)) return;
  try {
    if ((await PLANS.planFor(account.id)) === "premium") return;
    await PLANS.grant(account.id, "premium", FOREVER_SOURCE, null);
  } catch (error) {
    // Never fails a sign-in. Somebody locked out because a comped grant could
    // not be written has a worse problem than the one being solved.
    console.error("[mockio] forever-premium grant failed:", error);
  }
}

async function claimEarlyAccess(account: { id: string; email: string }): Promise<Date | null> {
  return PLANS.redeemEarlyAccess(account.email, account.id).catch((error: unknown) => {
    console.error("[mockio] early-access redemption failed:", error);
    return null;
  });
}

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
/**
 * Sends without letting the outcome reach the caller.
 *
 * The same rule as the request-scoped `deliver`, for the paths that run
 * outside a request: a webhook that 500s because a mail bounced would have
 * Mercado Pago retry a reconciliation that already succeeded, and each retry
 * would try to send again.
 */
async function mail(message: EmailMessage): Promise<void> {
  try {
    await MAILER.send(message);
  } catch (error) {
    console.error("[mockio] email delivery failed:", error);
  }
}

/**
 * Tells the customer what the provider just did to their subscription.
 *
 * Only on a change: the status is compared against the row as it was before
 * this notification was applied, so Mercado Pago's retries — which resend the
 * same notification — do not resend the mail. A first authorization has no
 * previous row and counts as a change.
 *
 * Every one of these was previously silent, which mattered most for `paused`:
 * that is what the provider does when it cannot charge the card, and the
 * customer's only signal was the paid features disappearing.
 */
async function notifySubscription(
  ownerId: string,
  previous: PreapprovalStatus | null,
  next: PreapprovalStatus,
  periodEnd: Date | null,
): Promise<void> {
  const account = await ACCOUNTS.findById(ownerId);
  // Guests cannot subscribe, and an account erased mid-flight has nowhere to
  // write to. Neither is an error worth failing the webhook over.
  if (!account?.email) return;

  const message = subscriptionMail({
    email: account.email,
    previous,
    next,
    accessUntil: periodEnd,
    plan: planConfig(),
  });
  if (message) await mail(message);
}


/**
 * The canonical origin, for links in mail.
 *
 * Module scope rather than the request closure it used to live in: the
 * scheduled jobs below build unsubscribe links and run outside any request.
 */
const siteUrl = () => process.env.REALSESSIONS_SITE_URL ?? "http://localhost:5173";

/**
 * The scheduled mail, run from a timer in this process.
 *
 * No queue and no second service: the work is a handful of rows a day, and a
 * worker that has to be deployed and watched before it has anything to do is
 * more operations than the problem. `claim` is what makes it safe anyway — it
 * is a conditional UPDATE, so if this ever runs on two instances exactly one
 * of them wins each period and nobody is mailed twice.
 *
 * Failures are logged and swallowed per recipient. One bad address must not
 * end the run and leave everyone after it unmailed.
 */
async function runLifecycleJobs(): Promise<void> {
  // Nothing is claimed when it is off, so a deployment that is not meant to
  // send does not silently mark the jobs as run either — turning it on later
  // starts from a clean ledger rather than thinking it already sent today.
  if (!lifecycleEmailEnabled()) return;
  for (const { job, everyMs } of JOBS) {
    let claimed = false;
    try {
      claimed = await LIFECYCLE.claim(job, everyMs);
    } catch (error) {
      console.error(`[mockio] could not claim job ${job}:`, error);
      continue;
    }
    if (!claimed) continue;

    try {
      if (job === "inactivity") await runInactivityNudge();
      if (job === "weekly-digest") await runWeeklyDigest();
      if (job === "defense-countdown") await runDefenseCountdown();
    } catch (error) {
      console.error(`[mockio] job ${job} failed:`, error);
    }
  }
}

/**
 * Resolves an owner to an address that may receive lifecycle mail.
 *
 * Three ways to be ineligible and all of them are quiet: a guest has no
 * account, an address can have opted out, and one that heard from us recently
 * is not due again. The opt-out and the cooldown are keyed by address rather
 * than by owner, which is why they cannot be part of the query that found the
 * owner in the first place.
 */
async function lifecycleAddress(
  ownerId: string,
  kind: "inactivity" | "weekly-digest",
  cooldownDays: number,
): Promise<string | null> {
  const account = await ACCOUNTS.findById(ownerId).catch(() => null);
  if (!account?.email) return null;
  if (await LIFECYCLE.hasOptedOut(account.email).catch(() => true)) return null;
  if (await LIFECYCLE.sentRecently(account.email, kind, cooldownDays).catch(() => true)) {
    return null;
  }
  return account.email;
}

async function runInactivityNudge(): Promise<void> {
  const owners = await LIFECYCLE.lapsedOwners(200);
  for (const { ownerId } of owners) {
    const email = await lifecycleAddress(ownerId, "inactivity", NUDGE_COOLDOWN_DAYS);
    if (!email) continue;
    await mail(
      inactivityEmail(email, {
        days: INACTIVE_DAYS,
        unsubscribeUrl: unsubscribeUrl(siteUrl(), email),
      }),
    );
    await LIFECYCLE.markSent(email, "inactivity").catch(() => undefined);
  }
}

/** Today as a calendar date in Lima, where the defences being counted down are. */
export function limaDate(now = new Date(), offsetDays = 0): string {
  const shifted = new Date(now.getTime() + offsetDays * 86_400_000);
  return shifted.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/**
 * The week before a defence: one mail on each of the countdown days.
 *
 * Only from 7 a.m. Lima time, so the day-of mail arrives before the student
 * leaves rather than at midnight. Each day is recorded on the thesis once
 * sent, so the job can run every few hours without repeating itself.
 */
async function runDefenseCountdown(): Promise<void> {
  const now = new Date();
  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/Lima", hour: "numeric", hour12: false }));
  if (hour < 7) return;
  const today = limaDate(now);
  const rows = await THESES.countdownCandidates(today, limaDate(now, 7));
  for (const row of rows) {
    const daysLeft = Math.round((Date.parse(row.defenseDate) - Date.parse(today)) / 86_400_000);
    const day = COUNTDOWN_DAYS.find((entry) => entry === daysLeft);
    if (day === undefined || row.sent.includes(day)) continue;
    const account = await ACCOUNTS.findById(row.ownerId).catch(() => null);
    if (!account?.email) continue;
    if (await LIFECYCLE.hasOptedOut(account.email).catch(() => true)) continue;
    await mail(
      defenseCountdownEmail(account.email, {
        day,
        language: row.language,
        risks: row.risks,
        // The morning mail opens the warm-up itself.
        url: `${siteUrl()}/app${day === 0 ? "/thesis/warmup" : ""}`,
        unsubscribeUrl: unsubscribeUrl(siteUrl(), account.email),
      }),
    );
    await THESES.markCountdown(row.ownerId, day).catch(() => undefined);
  }
}

async function runWeeklyDigest(): Promise<void> {
  const rows = await LIFECYCLE.activeOwners(500);
  for (const row of rows) {
    // Six days rather than seven: a weekly job that drifts a few minutes later
    // each run would otherwise skip a week for everyone, every few months.
    const email = await lifecycleAddress(row.ownerId, "weekly-digest", 6);
    if (!email) continue;
    await mail(
      weeklyDigestEmail(email, {
        sessions: row.sessions,
        bestScore: row.bestScore,
        xp: row.xp,
        unsubscribeUrl: unsubscribeUrl(siteUrl(), email),
      }),
    );
    await LIFECYCLE.markSent(email, "weekly-digest").catch(() => undefined);
  }
}

/**
 * Whether a refusal may carry the provider's own words back to the browser.
 *
 * Two conditions, not one. `MERCADOPAGO_MODE` says which credentials are in
 * use, and on its own it is a single environment variable standing between a
 * candidate and Mercado Pago's internal wording — one typo in a dashboard and
 * a real payer reads which of their cards the provider refused and why, which
 * is a list worth having for someone working through stolen cards.
 *
 * So the site has to also not be the public one. Getting this wrong now takes
 * two mistakes that have to agree with each other, and the log keeps the
 * detail either way.
 */
function mayExplainRefusal(): boolean {
  if (billingMode() !== "test") return false;
  return !/(^|\.)getmockio\.com$/i.test(new URL(siteUrl()).hostname);
}

async function reconcileSubscription(externalId: string): Promise<Plan | null> {
  const remote = await fetchPreapproval(externalId);
  // external_reference is our identity, round-tripped through the provider.
  // Falling back to the stored row covers a preapproval created before this
  // field was set.
  const known = await SUBSCRIPTIONS.byExternalId(externalId);
  const ownerId = remote.externalReference ?? known?.ownerId ?? null;
  if (!ownerId) return null;

  // Read before the row is overwritten: this is what makes the mail below fire
  // once per real change rather than once per provider retry.
  const previousStatus = known?.status ?? null;
  const periodEnd = remote.nextPaymentDate ? new Date(remote.nextPaymentDate) : null;
  await SUBSCRIPTIONS.put({
    ownerId,
    externalId,
    status: remote.status,
    periodEnd: periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
  });

  const settled = periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null;
  await notifySubscription(ownerId, previousStatus, remote.status, settled);

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

/** Cancels with whichever provider holds the subscription. */
async function cancelAtProvider(held: { provider: "mercadopago" | "paddle"; externalId: string }) {
  if (held.provider === "paddle") {
    const config = paddleConfig();
    if (!config) throw new Error("Paddle subscription held but Paddle is not configured.");
    await cancelPaddleSubscription(config, held.externalId);
    return;
  }
  await cancelPreapproval(held.externalId);
}

/** Reads the provider's current view of a held subscription and applies it. */
async function reconcileAtProvider(held: {
  provider: "mercadopago" | "paddle";
  externalId: string;
}): Promise<Plan | null> {
  if (held.provider === "paddle") {
    const config = paddleConfig();
    if (!config) return null;
    const sub = await fetchPaddleSubscription(config, held.externalId);
    return sub ? applyPaddleSubscription(sub) : null;
  }
  return reconcileSubscription(held.externalId);
}

/**
 * The Paddle twin of `reconcileSubscription`: same store, same grant, same
 * mails, driven by what Paddle's notification says rather than by a read.
 *
 * The owner comes from `custom_data`, which the checkout sets to our account
 * id; a later event without it (Paddle does not always repeat it) is matched
 * through the stored row instead.
 */
async function applyPaddleSubscription(sub: PaddleSubscription): Promise<Plan | null> {
  const known = await SUBSCRIPTIONS.byExternalId(sub.id);
  const ownerId = sub.ownerId ?? known?.ownerId ?? null;
  if (!ownerId) return null;

  const previousStatus = known?.status ?? null;
  await SUBSCRIPTIONS.put({
    ownerId,
    provider: "paddle",
    externalId: sub.id,
    status: sub.status,
    periodEnd: sub.periodEnd,
  });
  await notifySubscription(ownerId, previousStatus, sub.status, sub.periodEnd);

  if (grantsAccess(sub.status)) {
    await PLANS.grant(ownerId, "premium", "subscription", sub.periodEnd);
    return "premium";
  }
  if (sub.status === "cancelled" && !sub.periodEnd) await PLANS.revoke(ownerId, "subscription");
  return PLANS.planFor(ownerId);
}

/** Reads a request body as text, for webhooks whose signature covers the raw bytes. */
async function readRaw(req: IncomingMessage, limit = 256 * 1024): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Request body too large.");
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * The reader's country: Cloudflare's, when the request came through it, and
 * otherwise what the browser said about itself. Only ever used to choose
 * which price and checkout to show — Paddle charges by the billing address it
 * collects, so a wrong guess here costs nobody anything.
 */
/**
 * Where the reader is, by IP first.
 *
 * The edge's country (`cf-ipcountry`) is where the request came from; the
 * browser's guess (`?country=`) is only its language and timezone, and a
 * Peruvian with a Spanish-from-Spain browser was sold in euros through Paddle
 * instead of soles through Mercado Pago. So the guess is used only when the
 * edge does not know (no header, or "XX").
 */
function readerCountry(req: IncomingMessage, url: URL): string | null {
  return normaliseCountry(header(req, "cf-ipcountry")) ?? url.searchParams.get("country");
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
    console.error("[mockio] progress write failed:", error);
  }
}

/**
 * Reads, falling back rather than throwing.
 *
 * The evaluation route is where this matters. By the time it touches the
 * database the model has already run and already been paid for, and an
 * unguarded read between there and the response threw that away — the
 * candidate saw an error for a report that existed. Everything the route needs
 * from storage is either recomputable or has a sane empty value, so a database
 * blip costs the progress record and not the evaluation.
 */
async function readQuietly<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch (error) {
    console.error("[mockio] progress read failed:", error);
    return fallback;
  }
}

/**
 * The Monday the allowance last renewed, in UTC.
 *
 * Monday rather than a rolling seven days from each person's first interview,
 * because an allowance you can predict is one you can plan around: "five a
 * week, Mondays" is a sentence someone can hold, and a window that slides
 * with every session is one nobody can.
 *
 * UTC rather than the candidate's own timezone, for the reason the monthly
 * window used it: doing it locally needs the client to say what the zone is,
 * and an allowance that renews a few hours early for someone in UTC-5 is a
 * much smaller problem than one that renews late.
 */
function weekStart(now: Date): Date {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  // getUTCDay is 0 on Sunday, which belongs to the week that began six days
  // earlier rather than to the one starting tomorrow.
  const since = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - since);
  return start;
}

/**
 * Writes the report for one finished interview, once.
 *
 * Two callers reach this: the client asking for its report, and the server
 * itself the moment the last turn is given — so a candidate who closes the tab
 * at "thank you for your time" still has a report waiting, instead of an
 * interview that answered everything and was never scored.
 *
 * Once means once. A second call while the first is running gets the same
 * promise; a call after it finished gets the stored report back, with no new
 * model call and no second helping of XP. The result with XP and badges is
 * kept for a few minutes so the client that arrives just after the server
 * finished still gets to celebrate them.
 */
type EvaluationPayload = Record<string, unknown>;
const evaluations = new Map<string, Promise<EvaluationPayload>>();

function evaluateOnce(
  ownerId: string,
  sessionId: string,
  stored: NonNullable<Awaited<ReturnType<typeof STORE.get>>>,
  advanced: boolean,
  reportLanguage: string | undefined,
): Promise<EvaluationPayload> {
  const running = evaluations.get(sessionId);
  if (running) return running;
  const job = (async (): Promise<EvaluationPayload> => {
    const done = await readQuietly(PROGRESS.getSession(ownerId, sessionId), null);
    if (done?.completedAt && done.evaluation) {
      return {
        ...shapeFeedback(
          { evaluation: done.evaluation, metrics: done.metrics ?? computeMetrics(done.turns) },
          advanced,
        ),
        xp: null,
        badges: [],
      };
    }
    const session = InterviewSession.restore(
      stored.snapshot,
      PROVIDER ? { provider: PROVIDER } : {},
    );
    const evaluation = await evaluateInterview(
      stored.context,
      session.transcript,
      {
        ...(PROVIDER ? { provider: PROVIDER } : {}),
        ...(stored.stages ? { stages: stored.stages } : {}),
        ...(stored.language ? { language: stored.language } : {}),
        ...(stored.level ? { level: stored.level } : {}),
        ...(stored.pressure ? { pressure: true } : {}),
        ...(reportLanguage ? { reportLanguage } : {}),
        // A defence is deliberated by its jury, on the dossier it read.
        ...(stored.snapshot.defense ? { defense: stored.snapshot.defense } : {}),
      },
    );
    const score = evaluation.overall_score_percentage;

    // The transcript is rewritten once more before metrics are computed, so
    // the numbers are derived from the same turns that will be read back on
    // the history screen rather than from a copy that could have drifted.
    await recordQuietly(recordTranscript(sessionId, session.transcript));

    // Everything from here to the response is guarded. The model call above is
    // the expensive, already-spent part; losing the report it produced because
    // a read failed afterwards is the worst outcome this route has.
    //
    // Falling back to the in-memory transcript rather than to nothing: metrics
    // are derived from turns, and the session object still holds them. Only the
    // speech timings are lost, which the metrics already treat as optional.
    const detail = await readQuietly(PROGRESS.getSession(ownerId, sessionId), null);
    const metrics = computeMetrics(
      detail?.turns ??
        session.transcript.map((turn, idx) => ({
          idx,
          speaker: turn.speaker,
          text: turn.text,
          tStartMs: null,
          tEndMs: null,
        })),
    );

    // Read before completing, so the session being scored is not counted as
    // one of the sessions it is being compared against.
    const history = await readQuietly(PROGRESS.listSessions(ownerId), []);
    const previous = history.filter((entry) => entry.id !== sessionId);

    await recordQuietly(
      PROGRESS.completeSession({ sessionId, score, evaluation, metrics }),
    );
    // A defence from a university's course: its grade goes to that course's
    // gradebook. In the background — the student is waiting on the report,
    // not on Moodle.
    if (evaluation.acta) void sendGradeToCourse(ownerId, evaluation.acta);

    const today = new Date().toISOString().slice(0, 10);
    const mode = stored.mode ?? "practice";
    const events = xpForSession({
      score,
      mode,
      history: previous,
      // From the XP log, not from the session count: the cap has to hold even
      // when the awards per session change.
      // A failed read here would award a full day's XP again. Falling back to
      // the cap rather than to zero means a storage blip withholds XP instead
      // of handing out an unlimited amount of it.
      xpToday: await readQuietly(PROGRESS.xpOnDay(ownerId, today), DAILY_XP_CAP),
      today,
    });
    await recordQuietly(PROGRESS.addXp(ownerId, sessionId, events));

    const earned = await readQuietly(
      PROGRESS.awardBadges(
        ownerId,
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
      ),
      [] as string[],
    );

    return {
      ...shapeFeedback({ evaluation, metrics }, advanced),
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
    };
  })();
  evaluations.set(sessionId, job);
  // Forgotten on failure at once, so a retry runs again; kept for ten
  // minutes on success, for the client's own request to pick up.
  job.then(
    () => setTimeout(() => evaluations.delete(sessionId), 10 * 60 * 1000).unref(),
    () => evaluations.delete(sessionId),
  );
  return job;
}

/** The Monday after one. */
function nextWeek(start: Date): Date {
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;

  /**
   * Gone: this handed out an anonymous identity to anyone who asked, and
   * every protected route accepted it. An interview now belongs to an
   * account from the moment it starts.
   *
   * Answered rather than deleted, and with the code check kept in front, so a
   * client still holding the old flow is told to sign in instead of being
   * met by the single-page app's HTML where it expected JSON.
   */
  if (req.method === "POST" && path === "/api/auth") {
    if (await limited(res, `auth:${clientIp(req)}`, RULES.auth)) return;
    const body = await readJson(req);
    if (!accessCodeAccepted(body["accessCode"])) {
      // Same response whether the code was wrong or absent.
      return json(res, 403, { error: "That access code did not work.", code: "badAccessCode" });
    }
    return json(res, 410, {
      error: "Create an account or sign in — Mockio no longer runs without one.",
    });
  }

  const secureCookies = process.env.NODE_ENV === "production";
  /** The signed-in identity, if the request carried a valid one. */
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
      console.error("[mockio] email delivery failed:", error);
    }
  };

  const sendVerification = async (accountId: string, email: string) => {
    const { token, hash } = newResetToken();
    await ACCOUNTS.putToken("verify", hash, accountId, VERIFY_TTL_SECONDS);
    await deliver(verifyEmail(email, `${siteUrl()}/verify?token=${token}`));
  };

  /**
   * Nothing to carry across any more.
   *
   * This used to move five stores — preferences, progress, profile,
   * entitlements, subscription — from an anonymous browser identity onto the
   * new account, because signing up used to mean giving up the history that
   * motivated signing up. There is no anonymous identity to move from now:
   * an interview cannot exist before an account does.
   *
   * The `transfer` methods stay on the stores. They are how an account will
   * absorb another one if that ever becomes a feature, and deleting them
   * would be removing a capability rather than a caller.
   */
  const signIn = async (accountId: string): Promise<void> => {
    const { token } = issueToken({ id: accountId });
    res.setHeader("Set-Cookie", cookieHeader(token, secureCookies, "user"));
  };

  if (req.method === "POST" && path === "/api/accounts") {
    if (await limited(res, `signup:${clientIp(req)}`, RULES.signup)) return;
    const body = await readJson(req);

    const email = normalizeEmail(body["email"]);
    if (!email) return json(res, 400, { error: "Enter a valid email address.", code: "badEmail" });

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
      return json(res, 409, { error: "That email is already registered.", code: "emailTaken" });
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
      json(res, 401, { error: "Email or password is incorrect.", code: "badLogin" });

    if (!email || typeof supplied !== "string") return reject();
    if (await limited(res, `login-email:${email}`, RULES.loginByEmail)) return;

    const account = await ACCOUNTS.findByEmail(email);
    if (!account) return reject();
    if (!(await verifyPassword(supplied, account.passwordHash))) return reject();

    await claimForeverPremium(account);
    await signIn(account.id);
    json(res, 200, { email: account.email });
    return;
  }

  /**
   * What the sign-in screen needs to know before anybody signs in.
   *
   * Public, and it has to be: the page that shows the Google button is served
   * to someone with no identity at all. The Client ID is not a secret — it
   * ships inside the HTML of every site that uses Google sign-in — and null
   * here is how the button knows not to draw itself on a deployment where
   * Google is not configured.
   */
  if (req.method === "GET" && path === "/api/auth/config") {
    return json(res, 200, { google: googleClientId() });
  }

  /**
   * Signing in with Google.
   *
   * The browser posts the token Google signed and this exchanges it for our
   * own session cookie. Everything that makes it safe happens in
   * `verifyGoogleIdToken` — audience, issuer, signature, expiry, and that
   * Google itself verified the address.
   *
   * Linking by email is the decision worth stating. Somebody who signed up
   * with a password and later clicks the Google button lands on their own
   * account rather than a second one, because Google has proved the address
   * belongs to them and the alternative — two accounts on one email — orphans
   * their history and cannot be explained to them afterwards.
   */
  if (req.method === "POST" && path === "/api/auth/google") {
    if (await limited(res, `google-ip:${clientIp(req)}`, RULES.loginByIp)) return;

    const clientId = googleClientId();
    if (!clientId) {
      return json(res, 503, { error: "Signing in with Google is not available." });
    }

    const body = await readJson(req);
    const credential = typeof body["credential"] === "string" ? body["credential"] : "";

    let identity: GoogleIdentity;
    try {
      identity = await VERIFY_GOOGLE(credential, { clientId });
    } catch (error) {
      /**
       * One message for every reason, and the detail only in the log.
       *
       * The reasons are "expired", "signed by somebody else", "minted for
       * another application" and "that address is not verified" — a set that
       * tells anybody probing this endpoint exactly which of their attempts
       * got closest.
       */
      console.error("[mockio] google sign-in refused:", error);
      return json(res, 401, { error: "That Google sign-in could not be verified." });
    }

    let account = await ACCOUNTS.findByEmail(identity.email);
    if (!account) {
      // Null password: there is nothing to compare against, and
      // `verifyPassword` refuses it outright.
      account = await ACCOUNTS.create(identity.email, null);
      // Lost a race with another tab, or with the same person signing up by
      // password a second ago. Theirs won; this reads it back rather than
      // failing a sign-in that is perfectly valid.
      if (!account) account = await ACCOUNTS.findByEmail(identity.email);
      if (!account) {
        return json(res, 500, { error: "We could not create your account just now. Try again in a moment." });
      }
    }

    /**
     * Google verified the address, so we do too.
     *
     * The same thing a confirmation link proves, proved by the same party
     * that owns the mailbox. Sending them a confirmation email after Google
     * has already said yes would be asking for a second opinion from the
     * first opinion.
     */
    if (!account.emailVerifiedAt) {
      await ACCOUNTS.markEmailVerified(account.id);
      await claimEarlyAccess(account);
    }

    await claimForeverPremium(account);
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
    if (account && account.passwordHash === null) {
      /**
       * Nothing to reset: they signed up with Google.
       *
       * Told rather than ignored. A reset link that never arrives reads as a
       * deleted account, and the person then makes a second one with the same
       * address — which they cannot, because the address is taken. Saying it
       * leaks nothing: the mail goes only to the address itself and the HTTP
       * response below is identical either way.
       */
      await deliver(googleOnlyEmail(account.email));
    } else if (account) {
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
        code: "resetInvalid",
      });
    }

    await ACCOUNTS.updatePassword(
      accountId,
      await hashPassword(body["password"] as string),
    );
    /**
     * Told after the fact, to the address on the account.
     *
     * The reset mail proves someone asked; this proves it worked. It is the
     * only thing between a quiet takeover and the owner noticing, so it goes
     * out whether or not the person who just typed a new password is the
     * owner — which is exactly the case it exists for.
     */
    const changed = await ACCOUNTS.findById(accountId);
    if (changed?.email) await deliver(passwordChangedEmail(changed.email));
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
        code: "verifyInvalid",
      });
    }

    await ACCOUNTS.markEmailVerified(accountId);
    const account = await ACCOUNTS.findById(accountId);
    const grantedUntil = account ? await claimEarlyAccess(account) : null;
    if (account) await claimForeverPremium(account);
    if (account && grantedUntil) {
      // The page this request answers says the months are unlocked, but the
      // link is often opened on a different device from the one the account is
      // used on. A failed send never undoes a confirmed address.
      try {
        await deliver(
          earlyAccessUnlockedEmail(account.email, {
            months: EARLY_ACCESS_MONTHS,
            until: grantedUntil,
            appUrl: `${siteUrl()}/app`,
          }),
        );
      } catch (error) {
        console.error("[mockio] early-access unlocked mail failed:", error);
      }
    }
    // Deliberately does not sign anyone in. A link from an inbox proves the
    // address, not that the person clicking it is at their own device.
    json(res, 200, { ok: true, earlyAccess: grantedUntil !== null });
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

  if (req.method === "GET" && path === "/api/pricing") {
    // In front of the authentication gate: the landing page asks before anyone
    // has an identity, and it is the same `planConfig()` the checkout charges
    // from. A price written into the page instead would be a second source of
    // truth, and the one people read before deciding.
    // The rates come along so the page can show the price in the reader's
    // currency beside the one the card is charged. Null when the provider is
    // unreachable — the page then shows only what is charged.
    const plan = planConfig();
    const rates = plan ? await ratesFrom(plan.currency) : null;
    // Which checkout and price this reader gets. Peru — and every country
    // while Paddle is not configured — is Mercado Pago in soles, exactly as
    // before; elsewhere it is the regional price in local currency.
    const region = regionFor(readerCountry(req, url), paddleConfig() !== null);
    json(res, 200, { plan, offer: planOffer(), rates, region });
    return;
  }

  if (req.method === "GET" && path === "/api/early-access") {
    // In front of the authentication gate: the landing page asks before anyone
    // has an identity. The closing moment comes from the same function the
    // POST below enforces, so the countdown and the refusal cannot disagree.
    const closesAt = earlyAccessClosesAt();
    json(res, 200, {
      open: earlyAccessOpen(new Date(), closesAt),
      closesAt: closesAt?.toISOString() ?? null,
      months: EARLY_ACCESS_MONTHS,
    });
    return;
  }

  if (req.method === "POST" && path === "/api/early-access") {
    if (await limited(res, `early:${clientIp(req)}`, RULES.signup)) return;
    // Refused before anything is recorded or mailed. The countdown on the
    // landing page reached zero at this same moment, and taking the address
    // anyway would turn that count into a lie.
    if (!earlyAccessOpen()) {
      return json(res, 410, { error: "Early access has closed — the paid plan is open to everyone." });
    }
    const body = await readJson(req);
    const email = normalizeEmail(body["email"]);
    if (!email) return json(res, 400, { error: "Enter a valid email address.", code: "badEmail" });

    const text = (key: string) =>
      typeof body[key] === "string" ? (body[key] as string).trim() : "";
    const role = text("role");
    const company = text("company");
    if (role === "") return json(res, 400, { error: "Tell us the role you are targeting." });

    const until = earlyAccessUntil();
    const fresh = await PLANS.recordEarlyAccess(email, role, company, until);

    /**
     * Only on the first registration of an address.
     *
     * This endpoint is open and unauthenticated, so mailing on every call
     * would make it a way to send mail to anyone repeatedly. `fresh` is false
     * the second time, which caps it at one per address — and the response
     * stays identical either way, so this does not become the enumeration
     * oracle the identical text exists to prevent.
     */
    if (fresh) {
      await deliver(
        earlyAccessEmail(email, { months: EARLY_ACCESS_MONTHS, until }),
      );
    }

    // Same answer whether or not the address was already on the list. A
    // distinct "already registered" would turn this open endpoint into a way
    // to test whether someone signed up.
    json(res, 202, {
      ok: true,
      months: EARLY_ACCESS_MONTHS,
      message:
        "You are on the list. Create an account with this address and confirm it from your inbox, and the first six months are on us.",
    });
    return;
  }

  /**
   * Unsubscribing from lifecycle mail.
   *
   * POST, and public. POST because corporate mail scanners follow every link
   * in a message before a human sees it, and an unsubscribe that happens on
   * GET would quietly opt people out of mail they never read — the link in the
   * mail points at a page, and the page is what sends this.
   *
   * Public because someone who no longer wants our mail should not have to
   * sign in to stop it. The HMAC in the link is the authorisation: it proves
   * the address was sent by us, and it is checked in constant time so it
   * cannot be guessed one character at a time.
   */
  if (req.method === "POST" && path === "/api/email/unsubscribe") {
    if (await limited(res, `unsub:${clientIp(req)}`, RULES.unsubscribe)) return;
    const body = await readJson(req);
    const email = normalizeEmail(body["email"]);
    const token = typeof body["token"] === "string" ? body["token"] : "";
    if (!email || !unsubscribeTokenValid(email, token)) {
      return json(res, 400, { error: "That unsubscribe link is not valid." });
    }
    await LIFECYCLE.optOut(email).catch((error: unknown) => {
      console.error("[mockio] opt-out failed:", error);
    });
    // Same answer whether or not the address was already opted out: repeating
    // the request is not an error, and the second click should not look like
    // one to someone making sure it worked.
    json(res, 200, {
      ok: true,
      message: "Done. You will not get reminders or summaries at this address.",
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
      console.warn(`[mockio] rejected billing webhook: ${check.reason}`);
      // 401 rather than 400: this is an authentication failure, and Mercado
      // Pago retries on 5xx but not on this, which is what we want for a forgery.
      return json(res, 401, { error: "Invalid signature." });
    }

    const externalId = url.searchParams.get("data.id")!;
    // One-time payments (the Pack Sustentación) arrive on the same URL as
    // subscription changes, told apart by their type.
    const kind = url.searchParams.get("type") ?? url.searchParams.get("topic");
    if (kind === "payment") {
      try {
        const outcome = await settlePackPayment(externalId);
        return json(res, 200, { ok: true, outcome });
      } catch (error) {
        if (error instanceof MercadoPagoError && error.status === 404) {
          return json(res, 200, { ok: true, reconciled: false });
        }
        console.error("[mockio] pack webhook failed:", error);
        return json(res, 500, { error: "We could not record that just now." });
      }
    }
    try {
      await reconcileSubscription(externalId);
    } catch (error) {
      /**
       * A notification about a subscription that does not exist is answered,
       * not retried.
       *
       * Mercado Pago's own "test this URL" button sends id 123456, and every
       * other id it invents is equally unresolvable — a 500 told it to try
       * again, forever, for something that can never resolve. A 404 from the
       * provider is a final answer, so this acknowledges it and says so in
       * the log.
       *
       * Everything else still retries: a timeout or a 5xx is the case the
       * retry exists for, and swallowing it would strand a paying customer on
       * the free plan.
       */
      if (error instanceof MercadoPagoError && error.status === 404) {
        console.warn(
          `[mockio] billing webhook for unknown subscription ${externalId}; nothing to reconcile`,
        );
        return json(res, 200, { ok: true, reconciled: false });
      }
      console.error("[mockio] billing reconcile failed:", error);
      return json(res, 500, { error: "We could not check your payment just now. Your access has not changed." });
    }
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && path === "/api/billing/paddle/webhook") {
    // Public by necessity, like Mercado Pago's: the signature over the raw
    // body is the authentication, checked before the body is parsed.
    const config = paddleConfig();
    if (!config) return json(res, 503, { error: "Paddle is not configured." });
    const raw = await readRaw(req);
    const check = verifyPaddleSignature({
      header: header(req, "paddle-signature"),
      rawBody: raw,
      secret: config.webhookSecret,
    });
    if (!check.ok) {
      console.warn(`[mockio] rejected Paddle webhook: ${check.reason}`);
      return json(res, 401, { error: "Invalid signature." });
    }
    let sub: PaddleSubscription | null = null;
    try {
      sub = parseSubscriptionEvent(JSON.parse(raw));
    } catch {
      return json(res, 400, { error: "Unreadable body." });
    }
    // Events this product does not act on (transactions, customers) are
    // acknowledged so Paddle stops sending them.
    if (!sub) return json(res, 200, { ok: true, handled: false });
    try {
      const plan = await applyPaddleSubscription(sub);
      if (plan === null) console.warn(`[mockio] Paddle webhook for ${sub.id} with no owner; ignored`);
      return json(res, 200, { ok: true });
    } catch (error) {
      console.error("[mockio] Paddle webhook failed:", error);
      return json(res, 500, { error: "We could not record that just now." });
    }
  }

  if (req.method === "GET" && path === "/api/voice/config") {
    // Deliberately in front of the authentication gate: it is asked before the
    // microphone is opened, the answer is identical for everyone, and making
    // it authenticated cost a 401 on the first call of every session.
    json(res, 200, { live: deepgramConfigured(), speech: ttsConfigured() || googleTtsConfigured() || azureConfigured() });
    return;
  }

  /**
   * A shared report, by its token.
   *
   * Unauthenticated, and in front of the gate for that reason: the whole
   * point is a link that works for somebody who has never heard of this
   * product. The token is the authorisation — 128 random bits, which is why
   * this can exist at all.
   *
   * Rate limited by IP on the `auth` rule, the one other anonymous route. Not
   * because a report is expensive to serve — it is one query — but because
   * without it this endpoint is an oracle: a script could walk tokens and
   * learn which ones are real. At ten an hour, finding one by guessing takes
   * longer than the universe has been running.
   *
   * 404 for a token that does not resolve, with the same body as one that
   * never existed. A revoked link and a fabricated one are indistinguishable
   * from the outside, which is what makes revoking meaningful.
   */
  const sharedMatch = path.match(/^\/api\/shared\/([\w-]+)$/);
  if (req.method === "GET" && sharedMatch) {
    if (await limited(res, `shared:${clientIp(req)}`, RULES.auth)) return;
    const record = await PROGRESS.sessionByShareToken(sharedMatch[1]!);
    // Only a finished interview has a report to show. An abandoned one would
    // render as an empty page, and its owner shared a result, not a start.
    if (!record || record.completedAt === null) {
      return json(res, 404, { error: "This report is not available." });
    }
    // The owner's plan now, not at the time of sharing: a link from someone
    // who has since subscribed shows what they now have, and one from a lapsed
    // subscriber stops showing what they no longer pay for.
    const advanced = capabilitiesFor(await PLANS.planFor(record.ownerId)).advancedFeedback;
    json(res, 200, { report: publicReport(record, advanced) });
    return;
  }

  /**
   * LTI 1.3, the university's platform side. Public: the platform is the
   * caller, and every claim it makes is checked against the keys it published
   * before anyone is signed in.
   */
  if (req.method === "GET" && path === "/lti/jwks") {
    res.setHeader("Cache-Control", "public, max-age=3600");
    return json(res, 200, ltiJwks());
  }

  /** The URLs a university's IT types into Moodle or Canvas, in one place. */
  if (req.method === "GET" && path === "/lti/config") {
    const base = siteUrl();
    return json(res, 200, {
      title: "Mockio — Sustentación de tesis",
      description: "Ensayo de sustentación por voz con un jurado de 3 que leyó la tesis.",
      target_link_uri: `${base}/lti/launch`,
      oidc_initiation_url: `${base}/lti/login`,
      redirect_uris: [`${base}/lti/launch`],
      jwks_uri: `${base}/lti/jwks`,
      scopes: ["https://purl.imsglobal.org/spec/lti-ags/scope/score", "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem"],
      claims: ["iss", "sub", "name", "email"],
    });
  }

  if ((req.method === "GET" || req.method === "POST") && path === "/lti/login") {
    if (await limited(res, `lti-login:${clientIp(req)}`, RULES.ltiLaunch)) return;
    const params = req.method === "POST" ? new URLSearchParams(await readRaw(req, 8_000)) : url.searchParams;
    const iss = params.get("iss") ?? "";
    const loginHint = params.get("login_hint") ?? "";
    const platform = iss && loginHint ? await LTI.platform(iss, params.get("client_id")) : null;
    if (!platform) return json(res, 400, { error: "Esta plataforma no está conectada a Mockio." });
    res.writeHead(302, {
      Location: authRedirect(platform, {
        loginHint,
        messageHint: params.get("lti_message_hint"),
        redirectUri: `${siteUrl()}/lti/launch`,
      }),
    });
    res.end();
    return;
  }

  if (req.method === "POST" && path === "/lti/launch") {
    if (await limited(res, `lti-launch:${clientIp(req)}`, RULES.ltiLaunch)) return;
    const form = new URLSearchParams(await readRaw(req, 64_000));
    const ltiPage = (status: number, body: string) => {
      // The one page the university's course frames: it holds a link and no
      // session, so it may sit inside their iframe. Everything else keeps
      // refusing to be framed.
      res.removeHeader("X-Frame-Options");
      res.writeHead(status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "frame-ancestors *",
      });
      res.end(`<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mockio</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#111"><main style="max-width:28rem;padding:1.5rem;text-align:center">${body}</main></body></html>`);
    };
    try {
      const { platformId, nonce } = readState(form.get("state") ?? "");
      const platform = await LTI.platformById(platformId);
      if (!platform) throw new LtiError("Esta plataforma ya no está conectada.");
      const launch = await verifyLaunch(form.get("id_token") ?? "", platform, nonce, LTI_JWKS);

      // Who this is here: the person the platform already sent once, else the
      // account with their address, else a new one. A platform that hides
      // emails gets an address of ours that never receives mail.
      const known = await LTI.userBySub(platform.id, launch.sub);
      let account = known ? await ACCOUNTS.findById(known.accountId) : null;
      if (!account) {
        const email =
          launch.email ??
          `lti-${hmacFor("sha256", "mockio-lti-user").update(`${platform.issuer}|${launch.sub}`).digest("hex").slice(0, 20)}@lti.getmockio.com`;
        account = (await ACCOUNTS.findByEmail(email)) ?? (await ACCOUNTS.create(email, null)) ?? (await ACCOUNTS.findByEmail(email));
        if (!account) throw new LtiError("No pudimos crear tu cuenta. Inténtalo de nuevo.");
        // The university vouches for the address it sent.
        if (launch.email && !account.emailVerifiedAt) await ACCOUNTS.markEmailVerified(account.id);
        if (launch.name) {
          const preferences = await readQuietly(USERS.getPreferences(account.id), null);
          if (preferences && !preferences.candidateName.trim()) {
            await recordQuietly(USERS.setPreferences(account.id, { ...preferences, candidateName: launch.name }));
          }
        }
      }
      await LTI.linkUser({ platformId: platform.id, sub: launch.sub, accountId: account.id, lineitem: launch.lineitem });
      // Students take a seat in the school's cohort; whether one is free is
      // decided where the seats are counted, as for a typed code.
      if (platform.institutionCode && !launch.instructor && !(await readQuietly(INSTITUTIONS.membership(account.id), null))) {
        await recordQuietly(INSTITUTIONS.join(account.id, platform.institutionCode));
      }
      const pass = ltiPass(account.id, launch.instructor ? "/app/advisor" : "/app");
      const next = `/lti/continue?pass=${encodeURIComponent(pass)}`;
      // Inside an iframe the session cookie would be a third-party one and
      // dropped, so the page opens Mockio in its own tab instead.
      return ltiPage(
        200,
        `<p style="font-size:1.1rem">Abriendo Mockio…</p><p><a id="go" href="${next}" target="_blank" rel="noopener" style="display:inline-block;margin-top:1rem;padding:.75rem 1.25rem;border-radius:999px;background:#5e5ce6;color:#fff;text-decoration:none;font-weight:600">Abrir Mockio</a></p><script>if(window.top===window.self){location.replace(${JSON.stringify(next)})}</script>`,
      );
    } catch (error) {
      console.error("[mockio] LTI launch refused:", error);
      const reason = error instanceof LtiError ? error.message : "No pudimos abrir Mockio desde tu curso.";
      return ltiPage(400, `<p style="font-size:1.1rem">${reason.replace(/[<>&"]/g, "")}</p><p style="color:#666">Vuelve a abrir Mockio desde tu curso. Si se repite, avisa a tu docente.</p>`);
    }
  }

  if (req.method === "GET" && path === "/lti/continue") {
    const pass = readLtiPass(url.searchParams.get("pass") ?? "");
    if (!pass) {
      res.writeHead(302, { Location: "/signin" });
      res.end();
      return;
    }
    const { token } = issueToken({ id: pass.accountId });
    res.writeHead(302, { "Set-Cookie": cookieHeader(token, secureCookies, "user"), Location: pass.to });
    res.end();
    return;
  }

  /** The institutions' form: a lead, mailed to the team. */
  if (req.method === "POST" && path === "/api/b2b/lead") {
    if (await limited(res, `lead:${clientIp(req)}`, RULES.auth)) return;
    const lead = readLead(await readJson(req));
    if (typeof lead === "string") return json(res, 400, { error: lead });
    await recordQuietly(LEADS.add(lead));
    await mail({
      to: process.env.B2B_INBOX ?? "hello@getmockio.com",
      subject: `Institución interesada — ${lead.institution}`,
      text: [
        `${lead.name}${lead.role ? `, ${lead.role}` : ""}`,
        `Correo: ${lead.email}`,
        `Institución: ${lead.institution}${lead.country ? ` (${lead.country})` : ""}`,
        lead.students ? `Estudiantes: ${lead.students}` : null,
        lead.platform ? `Plataforma: ${lead.platform}` : null,
        lead.message ? `\n${lead.message}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    });
    return json(res, 201, { ok: true });
  }

  /**
   * The gift page: someone pays for a student's pack.
   *
   * Public, like a shared report, and for the same reason the token is the
   * authorisation: 128 random bits made for this thesis. It shows the
   * student's first name and the thesis title — what a parent needs to
   * recognise the request — and nothing else. Paying credits the student's
   * account through the same reference their own purchase uses.
   */
  const giftMatch = path.match(/^\/api\/gift\/([\w-]+)(\/checkout|\/sync)?$/);
  if (giftMatch && (req.method === "GET" || req.method === "POST")) {
    if (await limited(res, `shared:${clientIp(req)}`, RULES.auth)) return;
    const token = giftMatch[1]!;
    const owner = isGiftToken(token) ? await THESES.ownerByGift(token) : null;
    if (!owner) return json(res, 404, { error: "Este enlace no está disponible." });
    const offers = (["sustentacion", "intensivo", "docente"] as const).filter((kind) => kind !== "docente" || DOCENTE_ENABLED).map((kind) => ({
      kind,
      amount: PACK_KINDS[kind].amount,
      currency: PACK_CURRENCY,
      credits: PACK_KINDS[kind].credits,
      days: PACK_KINDS[kind].days,
    }));
    if (req.method === "GET" && !giftMatch[2]) {
      const [thesis, preferences] = await Promise.all([
        readQuietly(THESES.get(owner), null),
        readQuietly(USERS.getPreferences(owner), null),
      ]);
      return json(res, 200, {
        name: preferences?.candidateName?.trim().split(/\s+/)[0] || null,
        thesis: thesis?.analysis.title ?? null,
        defenseDate: thesis?.defenseDate ?? null,
        offers,
        available: mercadoPagoConfigured(),
      });
    }
    // Back from Mercado Pago: settled now rather than when the webhook comes,
    // and only for this student — a payment for anyone else is not ours.
    if (req.method === "POST" && giftMatch[2] === "/sync") {
      const paymentId = String((await readJson(req))["paymentId"] ?? "");
      if (!/^\d{3,20}$/.test(paymentId)) return json(res, 400, { error: "Ese pago no es reconocible." });
      try {
        const outcome = await settlePackPayment(paymentId, owner);
        if (outcome === "not-ours") return json(res, 404, { error: "Ese pago no es reconocible." });
        return json(res, 200, { outcome });
      } catch (error) {
        console.error("[mockio] gift sync failed:", error);
        return json(res, 502, { error: "No pudimos confirmar el pago ahora. Si se cobró, se acreditará en unos minutos." });
      }
    }
    if (req.method === "POST" && giftMatch[2] === "/checkout") {
      if (!mercadoPagoConfigured()) return json(res, 503, { error: "Los pagos todavía no están activos.", code: "payOff" });
      const blocked = checkoutBlockReason();
      if (blocked) return json(res, 503, { error: blocked });
      const body = await readJson(req);
      const kind = offers.find((offer) => offer.kind === body["kind"])?.kind ?? "sustentacion";
      const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        return json(res, 400, { error: "Escribe tu correo para el comprobante." });
      }
      const created = await createPackPreference({
        externalReference: `pack:${kind}:${owner}`,
        payerEmail: email,
        title: PACK_KINDS[kind].title,
        amount: PACK_KINDS[kind].amount,
        currency: PACK_CURRENCY,
        backUrl: `${siteUrl()}/regalo/${token}`,
        notificationUrl: `${siteUrl()}/api/billing/webhook?source_news=webhooks`,
      });
      return json(res, 201, { initPoint: created.initPoint });
    }
  }

  /**
   * Anything that is not an API call belongs to the web app, when one is
   * deployed alongside.
   *
   * In front of the authentication gate, necessarily: the page a visitor loads
   * is what obtains the identity cookie in the first place, so serving it only
   * to callers who already have one is a door locked from the inside. API
   * paths are excluded outright, so this cannot shadow a route below it — a
   * mistyped /api/… still answers as an API rather than returning HTML.
   */
  if (
    SITE &&
    (req.method === "GET" || req.method === "HEAD") &&
    !path.startsWith("/api/")
  ) {
    // HEAD used to fall past this into the authenticated API, so asking the
    // size of a public asset answered 401 while fetching it answered 200.
    const headOnly = req.method === "HEAD";
    const range = req.headers["range"];
    if (
      await SITE.serve(path, res, {
        ...(typeof range === "string" ? { range } : {}),
        headOnly,
      })
    )
      return;
  }

  // Everything past this point is authenticated.
  const identity = priorIdentity;
  if (!identity) {
    return json(res, 401, {
      error: "Not authenticated.",
      code: "signedOut",
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
    // `configured` is what the UI branches on to show the upgrade button, so
    // a deployment that would refuse the checkout reports itself unconfigured
    // rather than offering a button that 503s.
    const configured =
      mercadoPagoConfigured() && planConfig() !== null && checkoutBlockReason() === null;
    json(res, 200, {
      configured,
      plan: planConfig(),
      offer: planOffer(),
      // Safe to serve: this key can tokenise a card and nothing else. Null
      // when unset, and the client falls back to the redirect checkout.
      publicKey: configured ? publicKey() : null,
      // Said out loud, because Mercado Pago's sandbox and production
      // credentials are indistinguishable: a deployment left in the wrong one
      // looks exactly like the right one until money does or does not move.
      mode: billingMode(),
      subscription: await SUBSCRIPTIONS.forOwner(identity.id),
      // Where this reader is sold from, and what the browser needs to open
      // Paddle's checkout. The client token and price ids are public by
      // design; the API key and webhook secret never leave the server.
      region: regionFor(readerCountry(req, url), paddleConfig() !== null),
      paddle: (() => {
        const paddle = paddleConfig();
        return paddle
          ? {
              env: paddle.env,
              clientToken: paddle.clientToken,
              priceMonthly: paddle.priceMonthly,
              priceYearly: paddle.priceYearly,
              // Round-trips through Paddle as custom_data so the webhook
              // knows whose subscription it is. Someone editing it can only
              // pay for another account's premium.
              ownerId: identity.id,
            }
          : null;
      })(),
    });
    return;
  }

  /**
   * Asks the provider whether a subscription of ours has settled.
   *
   * The hosted checkout leaves a row saying `pending` and walks the payer to
   * Mercado Pago. What turns that into a paid plan is the webhook — and a
   * webhook is a promise from someone else's server. Late, lost, or refused,
   * and the payer comes back to a page reading "you are on the free plan"
   * with the money gone.
   *
   * This lived inside `GET /api/billing` for a while, which meant a read that
   * wrote: correct, and a surprise to anyone who opened the file later. It is
   * its own POST now, called by the panel when it loads. The cost of moving
   * it is that a client which forgets to call it brings the old bug back
   * silently, so the test that holds this is the one on the panel, not the
   * one here.
   *
   * Answers 200 with the plan in every case a caller can do anything about:
   * nothing to reconcile, nothing changed, or settled. A provider that cannot
   * be reached is a 502 — the panel keeps its stored status and says nothing,
   * rather than failing to render because Mercado Pago is down.
   */
  if (req.method === "POST" && path === "/api/billing/reconcile") {
    // One outbound call to the provider per request, on our credentials, the
    // same as every other billing route that reaches them.
    if (await limited(res, `reconcile:${identity.id}`, RULES.checkout)) return;

    const held = await SUBSCRIPTIONS.forOwner(identity.id);
    // `pending` only. It is the status that belongs to the minutes between
    // opening a checkout and finishing it, and the only one the provider can
    // still change on its own. `cancelled` and `paused` also fail
    // `grantsAccess`, so asking about those would put a round-trip on every
    // load of the panel, for someone who cancelled months ago, that can never
    // change the answer.
    if (held?.status !== "pending") {
      return json(res, 200, { plan: await PLANS.planFor(identity.id) });
    }
    try {
      const settled = await reconcileAtProvider(held);
      return json(res, 200, { plan: settled ?? (await PLANS.planFor(identity.id)) });
    } catch (error) {
      console.warn("[mockio] could not reconcile:", error);
      return json(res, 502, { error: "We could not reach the payment provider. Nothing was charged." });
    }
  }

  if (req.method === "DELETE" && path === "/api/account") {
    /**
     * A guest can erase their own data too.
     *
     * They accumulate the same things a signed-up account does — transcripts,
     * scores, XP, a row on the leaderboard — and until this existed the only
     * deletion route told them they had nothing to delete. "You have no
     * account" is a true statement about the sign-up table and a false one
     * about the data, and it left the person who most wanted out with no way
     * out.
     *
     * No email confirmation, because there is no email to type. The
     * confirmation is in the interface instead, and the blast radius is one
     * browser's own cookie: this can only ever erase the caller.
     */
    const account =
      identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;

    if (identity.kind === "user") {
      if (!account) return json(res, 404, { error: "We could not find an account for that address." });

      // Typing the address is the confirmation. A button alone is too easy to
      // hit for something with no undo, and this is the one action in the
      // product that destroys data on purpose.
      const body = await readJson(req);
      if (normalizeEmail(body["email"]) !== account.email) {
        return json(res, 400, {
          error: "Type your email address exactly to confirm.",
        });
      }
    }

    /**
     * Billing first, and it is allowed to fail the request.
     *
     * Everything after this is irreversible, and deleting the account while a
     * subscription is still live would leave someone paying Mercado Pago for a
     * product they can no longer reach — with no account left to cancel it
     * from. Better to refuse the deletion and say why.
     */
    const subscription = await SUBSCRIPTIONS.forOwner(identity.id).catch(() => null);
    if (subscription && subscription.status !== "cancelled") {
      try {
        await cancelAtProvider(subscription);
      } catch (error) {
        console.error("[mockio] cancel before delete failed:", error);
        return json(res, 502, {
          error:
            "We could not cancel your subscription, so nothing was deleted. " +
            "Cancel it first, then delete the account.",
        });
      }
    }

    // Data before identity: if this dies halfway, the account still exists and
    // the request can be retried. Erasing the account first would strand the
    // rest with no way to reach it.
    await recordQuietly(PROGRESS.eraseOwner(identity.id));
    await recordQuietly(PROFILES.clear(identity.id));
    await recordQuietly(THESES.delete(identity.id));
    await recordQuietly(PACKS.eraseOwner(identity.id));
    await recordQuietly(ADVISORS.eraseOwner(identity.id));
    await recordQuietly(INSTITUTIONS.eraseOwner(identity.id));
    await recordQuietly(PRESENCE.eraseOwner(identity.id));
    await recordQuietly(PLANS.eraseOwner(identity.id));
    await recordQuietly(SUBSCRIPTIONS.eraseOwner(identity.id));
    await recordQuietly(USERS.eraseOwner(identity.id));
    // Only a signed-up identity has a row here; a guest never did.
    if (account) await ACCOUNTS.erase(identity.id);
    /**
     * Sent after the erase, from the address captured before it.
     *
     * Last rather than first, because a deletion that failed halfway would
     * otherwise have confirmed itself to someone whose account still exists.
     * A guest has no address and gets nothing — the interface is their
     * confirmation, as the comment above says.
     */
    if (account?.email) await deliver(accountDeletedEmail(account.email));

    res.setHeader("Set-Cookie", clearCookieHeader(secureCookies));
    json(res, 200, {
      ok: true,
      // Said explicitly because it is the one thing that survives, and someone
      // deleting their account deserves to know what does.
      kept: "Questions you contributed stay, anonymised — they were never linked to you.",
    });
    return;
  }

  /**
   * Redeeming a promotion code.
   *
   * Separate from the checkout rather than a field inside it, because they
   * are different acts: one is a payment and the other is a grant, and
   * folding the second into the first means every change to the payment flow
   * has to be reasoned about twice.
   */
  if (req.method === "POST" && path === "/api/billing/promo") {
    /**
     * Rate limited hard, and keyed by identity as well as address.
     *
     * A promotion code is a short string that is worth money, which makes
     * guessing it worth doing. Without a limit, eight characters fall to a
     * script in an afternoon.
     */
    if (await limited(res, `promo:${identity.id}`, RULES.checkout)) return;
    if (await limited(res, `promo-ip:${clientIp(req)}`, RULES.checkout)) return;

    const account = identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;
    /**
     * A proved address, for the same reason early access needs one.
     *
     * Otherwise one person makes a hundred throwaway accounts and takes every
     * seat of a hundred-seat promotion, and the people it was for find it
     * sold out.
     */
    if (!account?.emailVerifiedAt) {
      return json(res, 403, {
        error: "Confirm your email address first — the link is in your inbox.",
      });
    }

    const body = await readJson(req);
    const code = normalisePromoCode(body["code"]);
    if (code === "") return json(res, 400, { error: "Enter a code.", code: "noPromo" });

    // Already paying: being charged and comped at the same time is not a
    // thing anybody wants, and the grant would quietly overlap a subscription
    // they keep paying for.
    const subscription = await SUBSCRIPTIONS.forOwner(identity.id).catch(() => null);
    if (subscription && grantsAccess(subscription.status)) {
      return json(res, 409, {
        error: "You are already on the paid plan. Cancel first if you want to use a code.",
      });
    }

    const result = await PLANS.redeemPromo(code, identity.id);
    if (!result.ok) {
      const says: Record<typeof result.reason, string> = {
        unknown: "That code is not valid.",
        expired: "That code has expired.",
        full: "That code has been fully claimed.",
        taken: "You have already used that code.",
      };
      // 404 only for a code that does not exist; the rest are states of a
      // real code and deserve their own answer.
      return json(res, result.reason === "unknown" ? 404 : 409, {
        error: says[result.reason],
        reason: result.reason,
        // The reason is already the distinction the panel needs; it doubles
        // as the code the client translates by.
        code: `promo_${result.reason}`,
      });
    }

    json(res, 200, {
      plan: await PLANS.planFor(identity.id),
      until: result.until.toISOString(),
    });
    return;
  }

  if (req.method === "POST" && path === "/api/billing/subscribe") {
    if (await limited(res, `checkout:${identity.id}`, RULES.checkout)) return;

    // Read once: a request body cannot be read twice, and both the cycle and
    // the card token live in this one.
    const body = await readJson(req);
    const requested = cycleFrom(body);
    if (requested === null) {
      return json(res, 400, { error: "That is not a billing cycle." });
    }
    const config = planForCycle(requested);
    if (!mercadoPagoConfigured() || !config) {
      return json(res, 503, {
        error: "Payments are not configured on this deployment yet.",
        code: "payOff",
      });
    }
    // The same guard the redirect flow answers to. Collecting the card on our
    // own page makes it easier to forget there is real money behind it, not
    // harder, so this is checked in exactly the same place.
    const blockedCard = checkoutBlockReason();
    if (blockedCard) {
      console.error("[mockio] subscribe refused:", blockedCard);
      return json(res, 503, { error: blockedCard });
    }
    if (plan === "premium") {
      return json(res, 409, { error: "You are already on the paid plan." });
    }

    const subscriber =
      identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;
    if (!subscriber) {
      return json(res, 403, {
        error: "Create an account first — a subscription has to outlive this browser.",
      });
    }

    const cardTokenId =
      typeof body["cardTokenId"] === "string" ? body["cardTokenId"].trim() : "";
    if (cardTokenId === "") {
      return json(res, 400, { error: "Fill in the card details first.", code: "noCard" });
    }

    let opened;
    try {
      opened = await createCardSubscription({
        externalReference: identity.id,
        payerEmail: subscriber.email,
        cardTokenId,
        // Required even though this flow never redirects: see the field's
        // comment. The same page the payer is already standing on.
        // `#plan`, not the bare page. Settings opens on Appearance without a
        // fragment, and the panel that settles a subscription only mounts on
        // the plan tab — so a payer returned to `/app/settings` would land on
        // the wrong tab, never ask the provider anything, and sit on `pending`
        // with the money gone.
        backUrl: `${siteUrl()}/app/settings#plan`,
        reason: `Mockio — ${config.cycle}`,
        plan: config,
      });
    } catch (error) {
      // A declined card arrives as a rejected request, and the candidate needs
      // to hear that rather than a stack trace. The detail goes to the log.
      console.error("[mockio] subscribe failed:", error);
      return json(res, 402, {
        error: "That card was declined. Try another one, or check with your bank.",
        // In the sandbox the only person who ever sees this is the one
        // testing the integration, and "declined" is useless to them: the
        // reason is the difference between a wrong test card, a currency the
        // account cannot take, and credentials from two different
        // applications. Withheld in live, where the reader is a candidate and
        // the provider's wording would tell an attacker which cards to stop
        // trying.
        ...(mayExplainRefusal() && error instanceof MercadoPagoError
          ? { detail: error.message }
          : {}),
      });
    }

    await SUBSCRIPTIONS.put({
      ownerId: identity.id,
      externalId: opened.id,
      status: opened.status,
      // Mercado Pago sends an ISO string; the store holds a Date. An
      // unparseable one is dropped rather than stored as Invalid Date, the
      // same way the webhook handles it.
      periodEnd: (() => {
        if (!opened.nextPaymentDate) return null;
        const at = new Date(opened.nextPaymentDate);
        return Number.isNaN(at.getTime()) ? null : at;
      })(),
    });

    // Anything but authorized means Mercado Pago did not take the card, and
    // saying "you are on the paid plan" here would be a lie the webhook would
    // later have to contradict.
    if (!grantsAccess(opened.status)) {
      return json(res, 402, {
        error: "Mercado Pago did not authorize that card.",
        status: opened.status,
      });
    }

    /**
     * The entitlement, now rather than when the webhook arrives.
     *
     * This route wrote the subscription row and stopped, and the grant that
     * actually moves someone onto the paid plan lives in `reconcileSubscription`
     * — which only the webhook called. So an authorized card left the payer on
     * the free plan until a notification arrived, and if the webhook was
     * misconfigured, unreachable, or signed with the wrong secret, it never
     * did: money taken, nothing unlocked, and no way to tell which half broke.
     *
     * Reconciling here keeps the single path from a payment to an entitlement
     * — the provider is still the authority, it is just asked immediately. A
     * failure is logged and left to the webhook, which remains the backstop
     * rather than the only route.
     */
    try {
      await reconcileSubscription(opened.id);
    } catch (error) {
      console.error("[mockio] subscribe reconcile failed:", error);
    }

    json(res, 201, { status: opened.status });
    return;
  }

  if (req.method === "POST" && path === "/api/billing/checkout") {
    if (await limited(res, `checkout:${identity.id}`, RULES.checkout)) return;

    const requested = cycleFrom(await readJson(req));
    if (requested === null) {
      return json(res, 400, { error: "That is not a billing cycle." });
    }
    const config = planForCycle(requested);
    if (!mercadoPagoConfigured() || !config) {
      return json(res, 503, {
        error: "Payments are not configured on this deployment yet.",
        code: "payOff",
      });
    }
    // Checked here rather than at boot: a deployment with the wrong token
    // should still serve interviews, it just must not take anyone's money.
    const blocked = checkoutBlockReason();
    if (blocked) {
      console.error("[mockio] checkout refused:", blocked);
      return json(res, 503, { error: blocked });
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
      // `#plan`, not the bare page. Settings opens on Appearance without a
        // fragment, and the panel that settles a subscription only mounts on
        // the plan tab — so a payer returned to `/app/settings` would land on
        // the wrong tab, never ask the provider anything, and sit on `pending`
        // with the money gone.
        backUrl: `${siteUrl()}/app/settings#plan`,
      reason: `Mockio — ${config.cycle}`,
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

  /**
   * Settles a Paddle checkout from the browser's side.
   *
   * The webhook is what normally switches the plan on, and a webhook is a
   * promise from someone else's server: late, lost, or — on a developer's
   * machine — unable to reach us at all. The checkout tells the page which
   * transaction it completed; this asks Paddle about it directly and applies
   * the subscription it opened. The transaction has to carry this account's
   * id, so nobody can claim someone else's payment.
   */
  if (req.method === "POST" && path === "/api/billing/paddle/sync") {
    const config = paddleConfig();
    if (!config) return json(res, 503, { error: "Paddle is not configured." });
    if (await limited(res, `paddle-sync:${identity.id}`, RULES.checkout)) return;
    const body = await readJson(req);
    const transactionId = typeof body["transactionId"] === "string" ? body["transactionId"] : "";
    if (!/^txn_[a-z0-9]+$/i.test(transactionId)) {
      return json(res, 400, { error: "That is not a checkout we recognise." });
    }
    try {
      const txn = await fetchPaddleTransaction(config, transactionId);
      if (!txn || txn.ownerId !== identity.id) {
        return json(res, 404, { error: "That is not a checkout we recognise." });
      }
      if (!txn.subscriptionId) return json(res, 202, { plan: await PLANS.planFor(identity.id), settled: false });
      const sub = await fetchPaddleSubscription(config, txn.subscriptionId);
      if (!sub) return json(res, 202, { plan: await PLANS.planFor(identity.id), settled: false });
      const plan = await applyPaddleSubscription({ ...sub, ownerId: identity.id });
      return json(res, 200, { plan: plan ?? "free", settled: true });
    } catch (error) {
      console.error("[mockio] Paddle sync failed:", error);
      return json(res, 502, { error: "We could not check your payment just now. Your access has not changed." });
    }
  }

  if (req.method === "POST" && path === "/api/billing/cancel") {
    const held = await SUBSCRIPTIONS.forOwner(identity.id);
    if (!held) return json(res, 404, { error: "There is no subscription to cancel." });

    await cancelAtProvider(held);
    // Reconciled rather than assumed: the provider is the authority on what
    // just happened, including how long the paid period still runs.
    const resolved = await reconcileAtProvider(held);
    json(res, 200, { plan: resolved ?? "free" });
    return;
  }

  /**
   * The interviewer's voice.
   *
   * The client sends a persona, never a model: which voice that maps to is a
   * server decision, so a caller cannot point the account's Deepgram key at an
   * arbitrary voice — or at arbitrary text, since the length cap lives here too.
   *
   * Failure is answered honestly rather than papered over. A 5xx tells the
   * client to stop asking and fall back to the browser synthesiser for the rest
   * of the session; retrying every sentence against a provider that is down
   * would leave the interview stuttering into silence.
   */
  if (req.method === "POST" && path === "/api/voice/speak") {
    if (!ttsConfigured() && !googleTtsConfigured() && !azureConfigured()) {
      return json(res, 503, { error: "Speech is not configured." });
    }
    if (await limited(res, `speech:${identity.id}`, RULES.speech)) return;

    const body = await readJson(req);
    const text = typeof body["text"] === "string" ? body["text"].trim() : "";
    if (text === "") return json(res, 400, { error: "There is nothing to say yet." });
    if (text.length > MAX_SPEECH_CHARS) {
      return json(res, 400, { error: "That phrase is too long to read aloud." });
    }

    const persona = findPersona(
      typeof body["personaId"] === "string" ? body["personaId"] : null,
    );
    // The same person in a different language. Null means the vendor has no
    // voice for it — Portuguese — and the client speaks through the browser.
    const spoken = findLanguage(
      typeof body["language"] === "string" ? body["language"] : null,
    );
    // A thesis jury names its country, so it can speak with that accent:
    // Azure's voice for the country when configured, otherwise the closest
    // Aura has.
    const country = typeof body["country"] === "string" ? body["country"].toUpperCase().slice(0, 3) : null;
    const azure = country && spoken.id === "es" && azureConfigured() ? azureVoiceFor(persona.id, country) : null;
    if (azure) {
      try {
        const audio = await synthesizeAzure(text, azure);
        res.writeHead(200, {
          "Content-Type": SPEECH_MIME,
          "Content-Length": String(audio.byteLength),
          "Cache-Control": "private, max-age=3600",
        });
        res.end(Buffer.from(audio));
        return;
      } catch (error) {
        // Fall through to Aura: a voice without the accent beats silence.
        console.error("[mockio] azure speak failed:", error);
      }
    }
    const jury = country && spoken.id === "es" ? juryVoiceFor(persona.id, country) : null;
    const voice = ttsConfigured() ? (jury ?? voiceFor(persona.id, persona.voice.model, spoken)) : null;
    // A language the main provider does not speak — Portuguese — goes to
    // Google when it is configured, with a voice cast per persona the same way.
    const google = !voice && googleTtsConfigured() ? googleVoiceFor(persona.id, spoken.id) : null;
    if (google) {
      try {
        const audio = await synthesizeGoogle(text, google);
        res.writeHead(200, {
          "Content-Type": SPEECH_MIME,
          "Content-Length": String(audio.byteLength),
          "Cache-Control": "private, max-age=3600",
        });
        res.end(Buffer.from(audio));
      } catch (error) {
        console.error("[mockio] google speak failed:", error);
        json(res, 502, { error: "The voice is unavailable right now." });
      }
      return;
    }
    if (!voice) {
      return json(res, 409, {
        error: `No ${spoken.promptLabel} voice is available.`,
      });
    }

    try {
      const audio = await synthesize(text, voice);
      res.writeHead(200, {
        "Content-Type": SPEECH_MIME,
        "Content-Length": String(audio.byteLength),
        // Same phrase, same voice, same bytes — but a transcript is what the
        // candidate said around it, so this stays out of shared caches.
        "Cache-Control": "private, max-age=3600",
      });
      res.end(Buffer.from(audio));
    } catch (error) {
      // 502 whatever went wrong: from the client's side a bad key, a timeout
      // and a provider outage all mean the same thing — use the browser voice.
      console.error("[mockio] speak failed:", error);
      // The provider's own message can carry account detail, so it is logged
      // and not returned.
      json(res, 502, { error: "The voice did not come through. The interview continues in text." });
    }
    return;
  }

  if (req.method === "GET" && path === "/api/plan") {
    json(res, 200, { plan, capabilities: can, reviewer: reviewer !== null });
    return;
  }

  /**
   * The thesis behind a defence simulation.
   *
   * Uploading reads it page by page and writes the diagnosis in the same
   * request — a minute or two for a long one, which the client shows as a
   * progress state. Doing it in the background would need a job queue to say
   * "ready" later, and the person is waiting on this screen either way.
   */
  if (req.method === "GET" && path === "/api/thesis") {
    json(res, 200, {
      thesis: await THESES.get(identity.id),
      allowance: await defenseAllowance(identity.id),
      pack: { amount: PACK_KINDS.sustentacion.amount, currency: PACK_CURRENCY, available: mercadoPagoConfigured() },
      // What a student can buy; the advisor plan is offered on the advisor page.
      offers: studentOffers().map((kind) => ({
        kind,
        amount: PACK_KINDS[kind].amount,
        currency: PACK_CURRENCY,
        credits: PACK_KINDS[kind].credits,
        days: PACK_KINDS[kind].days,
        modes: PACK_KINDS[kind].modes,
        group: PACK_KINDS[kind].group,
      })),
      formats: publicFormats(),
      progress: await defenseProgress(identity.id),
    });
    return;
  }

  /** Buys a Pack Sustentación: a Checkout Pro link for one payment. */
  if (req.method === "POST" && path === "/api/billing/defense-pack") {
    if (await limited(res, `checkout:${identity.id}`, RULES.checkout)) return;
    if (!mercadoPagoConfigured()) {
      return json(res, 503, { error: "Los pagos todavía no están activos.", code: "payOff" });
    }
    const blocked = checkoutBlockReason();
    if (blocked) {
      console.error("[mockio] pack checkout refused:", blocked);
      return json(res, 503, { error: blocked });
    }
    const account = identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;
    if (!account) {
      return json(res, 403, { error: "Crea una cuenta primero: tus ensayos tienen que quedar guardados." });
    }
    const requested = (await readJson(req))["kind"];
    const kind: PackKind = isPackKind(requested) ? requested : "sustentacion";
    if (kind === "docente" && !DOCENTE_ENABLED) {
      return json(res, 404, { error: "Ese plan no está disponible por ahora." });
    }
    if (PACK_KINDS[kind].advisor && !(await ADVISORS.get(identity.id))) {
      return json(res, 403, { error: "Crea tu código de asesor antes de activar Asesor Pro." });
    }
    const created = await createPackPreference({
      externalReference: `pack:${kind}:${identity.id}`,
      payerEmail: account.email,
      title: PACK_KINDS[kind].title,
      amount: PACK_KINDS[kind].amount,
      currency: PACK_CURRENCY,
      backUrl: `${siteUrl()}${PACK_KINDS[kind].advisor ? "/app/advisor" : "/app"}`,
      notificationUrl: `${siteUrl()}/api/billing/webhook?source_news=webhooks`,
    });
    json(res, 201, { initPoint: created.initPoint });
    return;
  }

  /** The payer's return from Checkout Pro, settled without waiting on the webhook. */
  if (req.method === "POST" && path === "/api/billing/defense-pack/sync") {
    if (await limited(res, `checkout:${identity.id}`, RULES.checkout)) return;
    const body = await readJson(req);
    const paymentId = typeof body["paymentId"] === "string" ? body["paymentId"] : "";
    if (!/^\d{3,20}$/.test(paymentId)) return json(res, 400, { error: "Ese pago no es reconocible." });
    try {
      const outcome = await settlePackPayment(paymentId, identity.id);
      if (outcome === "not-ours") return json(res, 404, { error: "Ese pago no es reconocible." });
      return json(res, 200, { outcome, allowance: await defenseAllowance(identity.id) });
    } catch (error) {
      console.error("[mockio] pack sync failed:", error);
      return json(res, 502, { error: "No pudimos confirmar el pago ahora. Si se cobró, aparecerá en unos minutos." });
    }
  }

  if (req.method === "POST" && path === "/api/thesis") {
    if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;
    const upload = await readUpload(req, MAX_THESIS_BYTES);
    if (!upload) return json(res, 400, { error: "Adjunta tu tesis en PDF o Word (.docx)." });
    // A photo of a page is accepted too — a printed copy and a phone is
    // sometimes all a student has.
    const photo = /^image\/(jpeg|png|webp)$/.test(upload.contentType) || /\.(jpe?g|png|webp)$/i.test(upload.filename);
    const kind = photo ? null : kindFor(upload.filename, upload.contentType);
    if (!photo && !kind) {
      return json(res, 415, { error: "Podemos leer PDF, Word (.docx) y fotos (JPG o PNG)." });
    }
    const ocr = PROVIDER ? { provider: PROVIDER } : {};
    const pages = photo
      ? await extractPhoto(upload.data, upload.contentType.startsWith("image/") ? upload.contentType : "image/jpeg", ocr)
      : await extractPages(upload.data, kind!, undefined, ocr);
    const analysis = await analyzeThesis(pages, PROVIDER ? { provider: PROVIDER } : {});
    await THESES.put(identity.id, upload.filename, pages, analysis);
    json(res, 201, { thesis: await THESES.get(identity.id) });
    return;
  }

  /**
   * The slides, reviewed against the thesis.
   *
   * PDF only: every slide tool exports it, and it is one parser rather than
   * three. `minutes` is the exposition slot, which universities set.
   */
  if (req.method === "POST" && path === "/api/thesis/slides") {
    if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;
    const stored = await THESES.get(identity.id);
    if (!stored) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    const upload = await readUpload(req, MAX_THESIS_BYTES);
    if (!upload) return json(res, 400, { error: "Adjunta tus diapositivas en PDF." });
    if (kindFor(upload.filename, upload.contentType) !== "pdf") {
      return json(res, 415, { error: "Exporta tus diapositivas a PDF y súbelas de nuevo." });
    }
    const minutes = Number(url.searchParams.get("minutes") ?? 20);
    const slotSeconds = Number.isFinite(minutes) && minutes >= 5 && minutes <= 90 ? Math.round(minutes * 60) : DEFAULT_SLOT_SECONDS;
    const slides = await readSlides(upload.data);
    const review = await reviewSlides(slides, stored.analysis, slotSeconds, PROVIDER ? { provider: PROVIDER } : {});
    await THESES.putSlides(identity.id, {
      fileName: upload.filename,
      slideCount: slides.length,
      words: wordCounts(slides),
      slotSeconds,
      review,
      reviewedAt: new Date().toISOString(),
    });
    json(res, 201, { thesis: await THESES.get(identity.id) });
    return;
  }

  /** The defence date, for the countdown. Null clears it. */
  if (req.method === "PUT" && path === "/api/thesis/date") {
    const body = await readJson(req);
    const raw = body["date"];
    const date = raw === null ? null : typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
    if (date === undefined) return json(res, 400, { error: "Esa fecha no es válida." });
    if (date !== null && date < limaDate()) return json(res, 400, { error: "Esa fecha ya pasó." });
    await THESES.setDefenseDate(identity.id, date);
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  /**
   * The defence sheet and review cards. Written on the first request rather
   * than at upload: most students want them in the last week, and writing
   * them for every upload would pay for material nobody opens.
   */
  if (req.method === "POST" && path === "/api/thesis/study") {
    if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;
    const stored = await THESES.get(identity.id);
    const pages = stored ? await THESES.pages(identity.id) : null;
    if (!stored || !pages) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    if (!stored.study) {
      await THESES.putStudy(identity.id, await writeStudy(pages, stored.analysis, PROVIDER ? { provider: PROVIDER } : {}));
    }
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  if (req.method === "DELETE" && path === "/api/thesis/slides") {
    await THESES.putSlides(identity.id, null);
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  /**
   * Questions from a real defence, given back after it. Anonymous, capped per
   * person and university, and pending until a reviewer verifies them.
   */
  if (req.method === "POST" && path === "/api/thesis/questions") {
    if (await limited(res, `contribute:${identity.id}`, RULES.contribute)) return;
    const body = await readJson(req);
    const university = typeof body["university"] === "string" ? body["university"].trim() : "";
    if (universityKey(university) === "") return json(res, 400, { error: "Escribe el nombre de tu universidad." });
    if (body["consent"] !== true) {
      return json(res, 400, { error: "Necesitamos tu permiso para guardar las preguntas de forma anónima." });
    }
    const questions = (Array.isArray(body["questions"]) ? body["questions"] : [])
      .map((entry) => readQuestion(entry))
      .filter((entry): entry is string => entry !== null)
      .slice(0, 10);
    if (questions.length === 0) {
      return json(res, 400, { error: "Escribe al menos una pregunta, como la recuerdes (entre 12 y 400 caracteres)." });
    }
    const stored = await THESES.get(identity.id).catch(() => null);
    const saved = await REAL_QUESTIONS.submit(identity.id, {
      university,
      country: typeof body["country"] === "string" ? body["country"].slice(0, 2).toUpperCase() : null,
      field: stored?.analysis.field.slice(0, 120) ?? null,
      questions,
    });
    json(res, 201, { saved });
    return;
  }

  /** How many verified real questions a university has, for the rehearsal screen. */
  if (req.method === "GET" && path === "/api/thesis/questions") {
    const university = url.searchParams.get("university") ?? "";
    const key = universityKey(university);
    if (key === "") return json(res, 200, { verified: 0, sameField: 0, questions: [], locked: true });
    /**
     * The count for everyone — knowing they exist is what sells them — and
     * the questions themselves to whoever paid, theirs first: same field
     * before the rest of the university.
     */
    const [verified, found, stored, allowance] = await Promise.all([
      REAL_QUESTIONS.countVerified(key),
      readQuietly(REAL_QUESTIONS.verified(key, 40), []),
      readQuietly(THESES.get(identity.id), null),
      defenseAllowance(identity.id),
    ]);
    const field = stored ? universityKey(stored.analysis.field) : "";
    const ours = (entry: { field: string | null }) => field !== "" && entry.field !== null && universityKey(entry.field) === field;
    const sorted = [...found.filter(ours), ...found.filter((entry) => !ours(entry))];
    json(res, 200, {
      verified,
      sameField: found.filter(ours).length,
      locked: !allowance.paid,
      questions: allowance.paid ? sorted.map((entry) => ({ question: entry.question, sameField: ours(entry) })) : [],
    });
    return;
  }

  /**
   * The real jury: who will sit on the panel, by seat. Saved by anyone, so a
   * free student can fill it in and see what it will do; used on the paid
   * rehearsals only, which the screen says beside it.
   */
  if (req.method === "PUT" && path === "/api/thesis/jury") {
    const stored = await THESES.get(identity.id);
    if (!stored) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    const jury = readJury((await readJson(req))["jury"]);
    if (jury === null) return json(res, 400, { error: "Ese jurado no se pudo leer." });
    await THESES.putJury(identity.id, jury);
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  /**
   * The jury's written observations, read against the thesis: each one on
   * its page with what to do about it. Paid — it is a long read of the whole
   * thesis — and kept, so the student ticks them off as they go.
   */
  if (req.method === "POST" && path === "/api/thesis/observations") {
    if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;
    const stored = await THESES.get(identity.id);
    const pages = stored ? await THESES.pages(identity.id) : null;
    if (!stored || !pages) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    if (!(await defenseAllowance(identity.id)).paid) {
      return json(res, 402, { error: "Levantar observaciones es parte de los planes de pago.", code: "observationsLocked" });
    }
    const text = String((await readJson(req))["text"] ?? "").trim().slice(0, MAX_OBSERVATIONS_TEXT);
    if (text.length < 40) return json(res, 400, { error: "Pega las observaciones del jurado tal como te las dieron." });
    try {
      const observations = await analyzeObservations(pages, stored.analysis, text, PROVIDER ? { provider: PROVIDER } : {});
      await THESES.putObservations(identity.id, observations);
    } catch (error) {
      console.error("[mockio] observations failed:", error);
      return json(res, 502, { error: "No pudimos leer las observaciones. Inténtalo de nuevo en un momento." });
    }
    json(res, 201, { thesis: await THESES.get(identity.id) });
    return;
  }

  /** Ticks one observation done, or open again. */
  if (req.method === "PATCH" && path === "/api/thesis/observations") {
    const stored = await THESES.get(identity.id);
    if (!stored?.observations) return json(res, 404, { error: "No hay observaciones guardadas." });
    const body = await readJson(req);
    const index = Number(body["index"]);
    if (!Number.isInteger(index) || index < 0 || index >= stored.observations.items.length) {
      return json(res, 400, { error: "Esa observación no existe." });
    }
    const items = stored.observations.items.map((item, at) => (at === index ? { ...item, done: body["done"] === true } : item));
    await THESES.putObservations(identity.id, { ...stored.observations, items });
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  if (req.method === "DELETE" && path === "/api/thesis/observations") {
    await THESES.putObservations(identity.id, null);
    json(res, 200, { thesis: await THESES.get(identity.id) });
    return;
  }

  /**
   * The session with a real teacher, requested. Arranged by hand: the
   * request goes to the team's inbox with the thesis title and the latest
   * record, and the student is told to expect a message within a day.
   */
  if (req.method === "POST" && path === "/api/thesis/mentor") {
    if (await limited(res, `contribute:${identity.id}`, RULES.contribute)) return;
    const stored = await THESES.get(identity.id);
    if (!stored) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    if (!(await defenseAllowance(identity.id)).mentor) {
      return json(res, 402, { error: "La sesión con un docente es parte del plan Sustentación con docente.", code: "mentorLocked" });
    }
    const request = readMentorRequest(await readJson(req));
    if (!request) return json(res, 400, { error: "Cuéntanos qué días y horas te acomodan." });
    const account = await ACCOUNTS.findById(identity.id);
    const latest = (await defenseProgress(identity.id)).at(-1);
    await THESES.putMentor(identity.id, request);
    await mail({
      to: process.env.MENTOR_INBOX ?? "hello@getmockio.com",
      subject: `Sesión con docente — ${stored.analysis.title.slice(0, 80)}`,
      text: [
        `Estudiante: ${account?.email ?? identity.id}`,
        request.phone ? `Teléfono: ${request.phone}` : null,
        `Tesis: ${stored.analysis.title} (${stored.analysis.field})`,
        stored.defenseDate ? `Sustenta el: ${stored.defenseDate}` : null,
        latest ? `Último ensayo: ${latest.grade}/${latest.gradeMax}, preparación ${latest.readiness}%` : "Sin ensayos completos todavía.",
        "",
        `Disponibilidad: ${request.availability}`,
        request.note ? `Nota: ${request.note}` : null,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    });
    json(res, 201, { thesis: await THESES.get(identity.id) });
    return;
  }

  /** The link that lets someone else pay, made on first ask. */
  if (req.method === "GET" && path === "/api/thesis/gift") {
    const token = await THESES.giftToken(identity.id);
    if (!token) return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
    json(res, 200, { url: `${siteUrl()}/regalo/${token}` });
    return;
  }

  /** One click, everything: the pages and the diagnosis. */
  if (req.method === "DELETE" && path === "/api/thesis") {
    await THESES.delete(identity.id);
    json(res, 200, { thesis: null });
    return;
  }

  /**
   * Advisors: their own page, and the students linked to them.
   *
   * What an advisor sees of a student is limited to what the student chose to
   * share, and to the thesis work itself — never transcripts, never an email.
   */
  if (req.method === "GET" && path === "/api/advisor") {
    const advisor = await ADVISORS.get(identity.id);
    // A school's coordinator sees the cohort here too, advisor or not.
    const owned = await readQuietly(INSTITUTIONS.ownedBy(identity.id), null);
    const cohort = owned
      ? {
          name: owned.name,
          code: owned.code,
          seats: owned.seats,
          creditsPerStudent: owned.creditsPerStudent,
          expiresAt: owned.expiresAt,
          students: await Promise.all(
            (await INSTITUTIONS.members(owned.code)).slice(0, owned.seats).map((member) => studentSummary(member.studentId)),
          ),
        }
      : null;
    if (!advisor) return json(res, 200, { advisor: null, cohort });
    const links = await ADVISORS.students(advisor.code);
    const students = await Promise.all(links.filter((link) => link.share).map((link) => studentSummary(link.studentId)));
    const earned = await ADVISORS.commissions(advisor.code);
    const pro = (await readQuietly(PACKS.active(identity.id), [])).find((pack) => pack.kind === "asesor_pro") ?? null;
    json(res, 200, {
      cohort,
      pro: {
        active: pro !== null,
        expiresAt: pro?.expiresAt ?? null,
        seats: ADVISOR_PRO_SEATS,
        creditsPerStudent: ADVISOR_PRO_CREDITS,
        used: Math.min(ADVISOR_PRO_SEATS, students.length),
        amount: PACK_KINDS.asesor_pro.amount,
        currency: PACK_CURRENCY,
      },
      advisor,
      link: `${siteUrl()}/?asesor=${advisor.code}`,
      linked: links.length,
      students,
      commissions: {
        ...payoutSummary(earned),
        // Kept for older clients: everything unpaid, held or not.
        pending: earned.filter((entry) => !entry.paidAt).reduce((sum, entry) => sum + entry.amount, 0),
        currency: earned[0]?.currency ?? PACK_CURRENCY,
        rate: COMMISSION_RATE,
      },
    });
    return;
  }

  if (req.method === "POST" && path === "/api/advisor") {
    const account = identity.kind === "user" ? await ACCOUNTS.findById(identity.id) : null;
    if (!account) return json(res, 403, { error: "Crea una cuenta para tener tu código de asesor." });
    const body = await readJson(req);
    const name = typeof body["name"] === "string" ? body["name"].trim().slice(0, 80) : "";
    if (name.length < 3) return json(res, 400, { error: "Escribe tu nombre como lo conocen tus alumnos." });
    json(res, 201, { advisor: await ADVISORS.create(identity.id, name) });
    return;
  }

  /** The student's side: their advisor, and whether they share their progress. */
  if (req.method === "GET" && path === "/api/advisor/link") {
    const link = await ADVISORS.linkOf(identity.id);
    const advisor = link ? await ADVISORS.byCode(link.code) : null;
    const membership = await INSTITUTIONS.membership(identity.id);
    const institution = membership ? await INSTITUTIONS.byCode(membership.code) : null;
    json(res, 200, {
      link: link && advisor ? { code: link.code, advisorName: advisor.name, share: link.share } : null,
      institution: institution ? { name: institution.name, code: institution.code } : null,
    });
    return;
  }

  if (req.method === "DELETE" && path === "/api/institution") {
    await INSTITUTIONS.leave(identity.id);
    json(res, 200, { institution: null });
    return;
  }

  if (req.method === "POST" && path === "/api/advisor/link") {
    const body = await readJson(req);
    const code = normalizeCode(body["code"]);
    const advisor = code ? await ADVISORS.byCode(code) : null;
    // The same box takes a school's code. Joining a cohort shares progress
    // with the school — that is what it pays for — so it needs the box ticked.
    const institution = !advisor && code ? await INSTITUTIONS.byCode(code) : null;
    if (institution) {
      if (body["share"] !== true) {
        return json(res, 400, {
          error: `Para unirte a ${institution.name} marca la casilla de compartir tu avance: tu institución lo ve porque paga tus ensayos.`,
        });
      }
      await INSTITUTIONS.join(identity.id, institution.code);
      return json(res, 200, { link: null, institution: { name: institution.name, code: institution.code } });
    }
    if (!code || !advisor) return json(res, 404, { error: "Ese código no existe." });
    if (advisor.ownerId === identity.id) return json(res, 400, { error: "Ese es tu propio código." });
    // From a link the student just followed: linked, not sharing. Typed in on
    // purpose, with the share box ticked: the student's choice on both.
    const share = body["share"] === true;
    const link = await ADVISORS.link(identity.id, code, share, body["replace"] === true);
    json(res, 200, { link: link ? { code: link.code, advisorName: advisor.name, share: link.share } : null });
    return;
  }

  if (req.method === "PUT" && path === "/api/advisor/link") {
    await ADVISORS.setShare(identity.id, (await readJson(req))["share"] === true);
    const link = await ADVISORS.linkOf(identity.id);
    const advisor = link ? await ADVISORS.byCode(link.code) : null;
    json(res, 200, { link: link && advisor ? { code: link.code, advisorName: advisor.name, share: link.share } : null });
    return;
  }

  /** How an affiliate wants their commissions paid. */
  if (req.method === "PUT" && path === "/api/advisor/payout") {
    const advisor = await ADVISORS.get(identity.id);
    if (!advisor) return json(res, 404, { error: "Crea tu código de afiliado primero." });
    const payout = readPayout(await readJson(req));
    if (!payout) return json(res, 400, { error: "Elige cómo cobrar y escribe la cuenta y el titular." });
    await ADVISORS.setPayout(identity.id, payout);
    return json(res, 200, { payout });
  }

  if (req.method === "DELETE" && path === "/api/advisor/link") {
    await ADVISORS.unlink(identity.id);
    json(res, 200, { link: null });
    return;
  }

  /**
   * Camera presence: a few still frames in, a reading out. The frames are
   * read and dropped; only the reading is kept, against the session.
   */
  const presenceMatch = path.match(/^\/api\/sessions\/([^/]+)\/presence$/);
  if (presenceMatch) {
    const sessionId = presenceMatch[1]!;
    if (req.method === "GET") {
      return json(res, 200, { presence: await readQuietly(PRESENCE.get(identity.id, sessionId), null) });
    }
    if (req.method === "POST") {
      if (await limited(res, `upload:${identity.id}`, RULES.upload)) return;
      const owned = await readQuietly(PROGRESS.getSession(identity.id, sessionId), null);
      if (!owned) return json(res, 404, { error: "That session is not yours." });
      const body = JSON.parse((await readRaw(req, (MAX_FRAMES + 1) * MAX_FRAME_CHARS)) || "{}") as Record<string, unknown>;
      const frames = (Array.isArray(body["frames"]) ? body["frames"] : [])
        .filter((frame): frame is string => typeof frame === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(frame))
        .filter((frame) => frame.length <= MAX_FRAME_CHARS)
        .slice(0, MAX_FRAMES);
      if (frames.length < 2) return json(res, 400, { error: "Not enough frames to judge presence." });
      const language = typeof body["readerLanguage"] === "string" ? body["readerLanguage"].slice(0, 20) : "English";
      const presence = await readPresence(frames, language, PROVIDER ? { provider: PROVIDER } : {});
      await PRESENCE.put(identity.id, sessionId, presence);
      return json(res, 201, { presence });
    }
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
    if (!company) return json(res, 400, { error: "Choose a company from the list." });

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
      // Normalised to a known role id, or null. Free text gave "Backend
      // Engineer", "backend engineer" and "BE" as three different roles with
      // one question each, which makes filtering by role useless.
      role: roleIdFor(optional("role")),
    });

    /**
     * Wakes the reviewers when the queue stops being empty.
     *
     * Depth exactly one means this submission is the only thing waiting, so
     * the queue just went from empty to not. That is the whole rate limit: a
     * queue already one deep cannot become one deep again until it has been
     * cleared, so no scheduler and no stored flag are needed, and the
     * reviewers are not mailed once per contribution — which is how a
     * notification gets filtered into a folder nobody opens.
     */
    if (stored) {
      const depth = await CONTRIBUTIONS.queueDepth().catch(() => 0);
      if (depth === 1) {
        const url = `${siteUrl()}/app/review`;
        for (const address of reviewerEmails()) {
          await deliver(reviewQueueEmail(address, url));
        }
      }
    }

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
      roles: ROLES.map(({ id, label }) => ({ id, label })),
    });
    return;
  }

  /** The defence questions waiting for a reviewer, beside the interview ones. */
  if (req.method === "GET" && path === "/api/review/defense") {
    if (!reviewer) return json(res, 404, { error: `No route for GET ${path}` });
    json(res, 200, { queue: await REAL_QUESTIONS.pending(50) });
    return;
  }

  const defenseReview = path.match(/^\/api\/review\/defense\/(\d+)$/);
  if (req.method === "POST" && defenseReview) {
    if (!reviewer) return json(res, 404, { error: `No route for POST ${path}` });
    const decision = (await readJson(req))["status"];
    if (decision !== "verified" && decision !== "rejected") {
      return json(res, 400, { error: "Choose verified or rejected." });
    }
    const done = await REAL_QUESTIONS.decide({ id: Number(defenseReview[1]), status: decision, reviewer });
    json(res, done ? 200 : 404, done ? { ok: true } : { error: "That question is not waiting for review." });
    return;
  }

  const reviewMatch = path.match(/^\/api\/review\/(\d+)$/);
  if (req.method === "POST" && reviewMatch) {
    if (!reviewer) return json(res, 404, { error: `No route for POST ${path}` });

    const body = await readJson(req);
    const decision = body["status"];
    if (decision !== "verified" && decision !== "rejected") {
      return json(res, 400, { error: "Choose verified or rejected." });
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
      ...(decided ? {} : { error: "Another reviewer already answered this one." }),
    });
    return;
  }

  if (req.method === "POST" && path === "/api/sessions") {
    if (await limited(res, `start:${identity.id}`, RULES.startSession)) return;

    /**
     * The free plan's monthly allowance.
     *
     * Checked before anything is read or generated, so a candidate who is out
     * of interviews is told so rather than being charged the cost of finding
     * out. The window is the calendar month in UTC, which is a decision and
     * not a neutral one: someone in UTC-5 sees their allowance renew at 7pm on
     * the last day of the month. Doing it in their own timezone needs the
     * client to say what that is, and a cap that resets a few hours early is a
     * much smaller problem than one that resets late.
     *
     * A store that cannot answer does not block the interview. Failing open
     * costs a few cents; failing closed tells a paying-adjacent candidate the
     * product is broken because a count timed out.
     */
    let spendsLastFree = false;
    let monthResetsAt: Date | null = null;
    let freeLimit = 0;
    if (can.weeklySessions !== null) {
      const now = new Date();
      const start = weekStart(now);
      const used = await PROGRESS.sessionsSince(
        identity.id,
        start.toISOString(),
      ).catch(() => 0);
      // The one about to start spends the last of the allowance. Captured
      // here, sent once the durable row exists — telling someone they are out
      // before the interview is written would be wrong if the write failed.
      spendsLastFree = used === can.weeklySessions - 1;
      monthResetsAt = nextWeek(start);
      freeLimit = can.weeklySessions;
      if (used >= can.weeklySessions) {
        return json(res, 402, {
          error: `You have used all ${can.weeklySessions} free interviews this week.`,
          code: "weekly_limit",
          used,
          limit: can.weeklySessions,
          // So the client can say when, rather than "later".
          resetsAt: monthResetsAt.toISOString(),
        });
      }
    }

    const body = await readJson(req);
    /**
     * One session can cover several rounds, because real ones do — a screen
     * that drifts into behavioural, a technical that closes on values. The
     * old single `interviewStage` still works and is what an older client
     * sends; `stages` is the ordered list.
     */
    /**
     * The interview language, on the paid plan only.
     *
     * Free rehearses the English interview the product is named for. This is
     * not the interface language — that is a separate setting and not
     * something to charge for.
     */
    const language = findLanguage(
      can.interviewLanguage && typeof body["language"] === "string"
        ? body["language"]
        : DEFAULT_LANGUAGE,
    );
    /**
     * Stress mode.
     *
     * Free, like the English level and for the same reason: it changes how
     * hard the interview feels, not what the product gives away, and the
     * candidate who most needs to rehearse being interrupted is the one who
     * has never been interviewed in English at all.
     */
    const pressure = pressureRequested(body["pressure"]);
    const wantedStages = Array.isArray(body["stages"])
      ? (body["stages"] as unknown[]).filter(
          (entry): entry is string => typeof entry === "string",
        )
      : undefined;
    // Free runs against a role, not an employer. The downgrade happens here
    // rather than by hiding the picker, because hiding a control is a courtesy
    // and this is the paywall.
    const context = readContext(body, can.targetCompany);
    /**
     * What the interviewer calls them.
     *
     * Their own setting first, then a guess from the address they signed up
     * with, and otherwise nothing — the prompt is told the name is unknown
     * and greets them without one. This used to be the string "Mariana",
     * hardcoded in the client, which meant everyone who ever signed up was
     * greeted as someone else.
     */
    const preferences = await USERS.getPreferences(identity.id).catch(() => null);
    /**
     * How much English the candidate has.
     *
     * Free, deliberately, and the one axis on this screen that is. The
     * candidate who needs it is the one who cannot yet follow a native-pace
     * interviewer, and putting that behind the paywall would sell the product
     * to everyone except the people it is for.
     */
    const level = findLevel(
      typeof body["level"] === "string"
        ? body["level"]
        : (preferences?.defaultLevel ?? null),
    );

    const signedUp =
      identity.kind === "user" ? await ACCOUNTS.findById(identity.id).catch(() => null) : null;
    context.candidateName =
      preferences?.candidateName?.trim() ||
      nameFromEmail(signedUp?.email) ||
      "unknown — greet them without a name";
    const mode = readMode(body["mode"]);
    // An unknown or absent id resolves to the company's own default rather
    // than to a neutral interviewer — every session has a temperament.
    const requested =
      can.choosePersona &&
      typeof body["personaId"] === "string" &&
      body["personaId"] !== ""
        ? findPersona(body["personaId"])
        : null;

    // The brief is read once, here, and travels in the session snapshot — so
    // an interview keeps the CV it started with even if one is uploaded
    // halfway through.
    const profile = can.candidateProfile
      ? await PROFILES.get(identity.id).catch(() => null)
      : null;
    const candidateBrief = profile ? renderProfileBrief(profile) : "";

    /**
     * The advertisement they are answering, if they pasted one.
     *
     * Behind the same gate as the CV, and for the same reason: this is the
     * difference between rehearsing the role and rehearsing the interview on
     * Thursday. Read from the request rather than stored, because a posting
     * belongs to one application and keeping it would quietly apply it to
     * every later interview.
     *
     * Trimmed to the prompt's cap here as well as there — a megabyte of
     * pasted HTML should not travel through the session snapshot to be cut at
     * the far end.
     */
    /**
     * The application this rehearses for, when it rehearses for one.
     *
     * Resolved against the store rather than trusted: the id arrives from a
     * client, and `getApplication` is scoped by owner, so somebody else's id
     * reads as absent and the interview simply runs without a posting.
     */
    const applicationId =
      can.trackApplications && typeof body["applicationId"] === "string"
        ? body["applicationId"]
        : null;
    const application = applicationId
      ? await readQuietly(PROGRESS.getApplication(identity.id, applicationId), null)
      : null;

    const postingRaw =
      typeof body["jobPosting"] === "string" ? body["jobPosting"].trim() : "";
    /**
     * The stored posting wins over a pasted one.
     *
     * Because the stored one is the whole point of having applications: the
     * advertisement is pasted once and serves every rehearsal after it. A
     * client that sends both is a client with a stale textarea, and honouring
     * the textarea would mean the second rehearsal for a job silently used
     * different material than the first.
     */
    const jobPosting =
      application?.posting ??
      (can.targetCompany && postingRaw !== ""
        ? postingRaw.slice(0, MAX_POSTING_CHARS)
        : null);

    // Only what a reviewer has verified, and only for a named company — a free
    // session runs against the generic one and has no crowd questions to draw
    // on. A read failure costs the interview nothing.
    const known = findCompany(context.companyName);
    const knownQuestions = known
      ? await CONTRIBUTIONS.verified(known.id, roleIdFor(context.targetRole))
          .then((rows) => rows.map((row) => row.question))
          .catch(() => [])
      : [];

    let rounds = resolveStages(context.targetRole, wantedStages ?? context.interviewStage);
    /**
     * A thesis defence: the panel needs the thesis, and the full panel is paid.
     *
     * Free gets the express rehearsal — one juror, ten minutes — which is the
     * taste of the product the plan is built around. Downgraded here rather
     * than refused, the same way a free interview loses its employer.
     */
    let defense: DefenseSetup | null = null;
    if (isDefense(rounds)) {
      const stored = await THESES.get(identity.id);
      const pages = stored ? await THESES.pages(identity.id) : null;
      if (!stored || !pages) {
        return json(res, 409, { error: "Sube tu tesis primero.", code: "noThesis" });
      }
      /**
       * The full panel spends a pack credit; without one, the express
       * rehearsal is the free one, once. Counted on sessions started rather
       * than finished: abandoning one at the last question and starting again
       * would otherwise be unlimited.
       */
      const allowance = await defenseAllowance(identity.id);
      if (allowance.credits === 0) {
        if (allowance.freeLeft === 0) {
          return json(res, 402, {
            error: "Ya usaste tu ensayo gratis. El Pack Sustentación incluye 5 con el panel de 3 jurados.",
            code: "defenseFreeUsed",
          });
        }
        if (rounds[0]?.id !== "sustentacion-express") {
          rounds = resolveStages(null, ["sustentacion-express"]);
        }
      }
      const difficulty = (["calentamiento", "estandar", "exigente", "hostil"] as const).find(
        (entry) => entry === body["difficulty"],
      ) ?? "estandar";
      const university =
        typeof body["university"] === "string" && body["university"].trim() !== ""
          ? body["university"].trim().slice(0, 120)
          : "la universidad";
      /**
       * The modes, the setting and the group: the passes, not the pack.
       * Asked for without one, they are refused rather than quietly dropped
       * — a student who chose "statistics coach" and got a standard defence
       * would have rehearsed the wrong thing without knowing it.
       */
      const focus = (["completa", "autoria", "trampa", "estadistica", "observaciones", "divulgacion"] as const).find(
        (entry) => entry === body["focus"],
      ) ?? "completa";
      const setting = (["presencial", "virtual"] as const).find((entry) => entry === body["setting"]) ?? null;
      const members = Array.isArray(body["members"])
        ? (body["members"] as unknown[])
            .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")
            .map((entry) => entry.trim().slice(0, 40))
            .slice(0, 3)
        : [];
      if ((focus !== "completa" || setting) && !allowance.modes) {
        return json(res, 402, { error: "Los modos de ensayo son parte del Pase Intensivo.", code: "modesLocked" });
      }
      if (members.length > 1 && !allowance.group) {
        return json(res, 402, { error: "El ensayo grupal es parte del plan Tesis grupal.", code: "groupLocked" });
      }
      const material =
        typeof body["material"] === "string" ? body["material"].trim().slice(0, 20_000) : "";
      if ((focus === "estadistica" || focus === "observaciones") && material.length < 40) {
        return json(res, 400, {
          error:
            focus === "estadistica"
              ? "Pega la salida de SPSS, Excel o R que quieres explicar."
              : "Pega las observaciones del jurado revisor.",
        });
      }
      // Which defence, by degree. Defaults to what the diagnosis read on the
      // cover, so an older client still gets a master's jury for a master's thesis.
      const scenario =
        DEFENSE_SCENARIOS.find((entry) => entry === body["scenario"]) ??
        scenarioForDegree(stored.analysis.degree);
      defense = {
        scenario,
        // Accessibility, so free on every plan.
        fluencyNeutral: body["fluencyNeutral"] === true,
        focus,
        setting,
        members: members.length > 1 ? members : [],
        material: material === "" ? null : material,
        dossier: renderDossier(stored, pages) + (await realQuestionsBlock(university)),
        difficulty,
        university,
        field: stored.analysis.field,
        // The school's own rubric, when it pays for this rehearsal.
        rubric: allowance.rubric,
        // The format they defend in: chosen on the thesis screen, or guessed
        // from the thesis's language when an older client sends none.
        country: findFormat(body["country"], stored.analysis.language).country,
        // The real people, on a paid rehearsal; the prompt leaves them out
        // of the express one and the coach.
        ...(allowance.paid && stored.jury && stored.jury.length > 0 ? { jury: stored.jury } : {}),
      };
    }
    // The conversations after the offer are the paid plan. Checked on the
    // rounds actually resolved, not on what the picker showed: the picker is
    // a courtesy and this is the paywall.
    if (isAfterTheOffer(rounds) && !can.workScenes) {
      return json(res, 402, {
        error: "Practising the job itself — stand-ups, client calls, reviews — is on the paid plan.",
        code: "paidOnly",
      });
    }
    // Whoever actually runs these rounds. A recruiter does not take a system
    // design interview, and honouring the request would rehearse a meeting
    // that does not happen.
    const persona = castFor(titlesFor(rounds), context.companyName, requested);
    const session = new InterviewSession(context, {
      stages: rounds.map((round) => round.id),
      language: language.id,
      level: level.id,
      pressure,
      personaId: persona.id,
      candidateBrief: candidateBrief === "" ? null : candidateBrief,
      jobPosting,
      knownQuestions,
      defense,
      // The full panel runs as long as the degree's real defence does: a
      // doctoral one past the cap a single interview round is held to.
      ...(defense && rounds[0]?.id === "sustentacion-pe" && soloJurorFor(defense.focus ?? "completa") === null
        ? { minTurns: SCENARIOS[defense.scenario ?? "titulo"].turns.min, maxTurns: SCENARIOS[defense.scenario ?? "titulo"].turns.max }
        : {}),
      // Three jurors in one voice is beyond the flash model the interviews
      // run on: it lost track of who had spoken. A defence is fewer, longer
      // turns, so a slower first word costs less than a confused panel.
      ...(defense ? { model: DEFENSE_MODEL, fallbackModels: DEFENSE_FALLBACKS } : {}),
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
        stage: rounds.map((round) => round.label).join(" + "),
        mode,
        personaId: persona.id,
        level: level.id,
        // Null unless it resolved to one of theirs, which is what ties the
        // rehearsal count on the applications screen to real sessions.
        applicationId: application ? applicationId : null,
      }),
    );

    /**
     * Told on the interview that spends the last free one.
     *
     * After the durable row, so this cannot announce an allowance spent by a
     * session that failed to write. Signed-up accounts only — a guest has no
     * address, and the interface already shows them the counter.
     */
    if (spendsLastFree && identity.kind === "user") {
      const account = await ACCOUNTS.findById(identity.id);
      if (account?.email) {
        await deliver(
          lastFreeInterviewEmail(account.email, {
            limit: freeLimit,
            resetsAt: monthResetsAt,
          }),
        );
      }
    }

    const persist = async (): Promise<void> => {
      await STORE.set(sessionId, {
        // Carried so the evaluator can weigh each round against its own bar.
        stages: rounds.map((round) => round.id),
        language: language.id,
        level: level.id,
        pressure,
        snapshot: session.snapshot(),
        context,
        ownerId: identity.id,
        createdAt: Date.now(),
        mode,
      });
      await recordQuietly(recordTranscript(sessionId, session.transcript));
    };

    // The interviewer as the candidate will meet them: same person, with the
    // job title their area gives them. The prompt introduces them by this
    // title, so the call screen has to say the same thing.
    const introduced = { ...persona, title: interviewerTitle(persona.title, context.targetRole) };

    if (wantsStream(req)) {
      openStream(res);
      // The context goes back, not just the id. On the free plan the employer
      // the client asked for was replaced above, and a header still reading
      // "Stripe" would tell a free candidate they rehearsed against Stripe.
      sendEvent(res, "session", {
        sessionId,
        persona: introduced,
        context: shown(context),
        maxTurns: session.maxTurnCount,
        language: language.id,
        level: level.id,
      });
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
    json(res, 201, {
      sessionId,
      turn,
      persona: introduced,
      context: shown(context),
      maxTurns: session.maxTurnCount,
      language: language.id,
      level: level.id,
    });
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
      return json(res, 404, { error: "That interview is no longer open. Start a new one.", code: "sessionGone" });
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

    // An answer after the last turn — usually a "thank you" picked up by a
    // microphone still open. It used to throw inside the open stream and
    // reach the candidate as "the interview service failed mid-turn", at the
    // end of an interview that had in fact finished. Now it is answered with
    // the state it is in: complete, nothing more to say, open the report.
    if (session.isComplete) {
      const turn = { text: "", isComplete: true, turnNumber: session.turnsTaken, stopReason: null };
      if (wantsStream(req)) {
        openStream(res);
        sendEvent(res, "turn", { turn });
        res.end();
        return;
      }
      return json(res, 200, { turn });
    }

    // The last turn starts the report at once, without waiting to be asked:
    // whoever closes the tab at "thank you for your time" still finds it in
    // their history. In the reader's language, which the client sends along.
    const reportLanguage = REPORT_LANGUAGES[String(body["readerLanguage"] ?? "")];
    const reportIfDone = (turn: { isComplete: boolean }) => {
      if (!turn.isComplete) return;
      void evaluateOnce(
        identity.id,
        sessionId,
        { ...stored, snapshot: session.snapshot() },
        can.advancedFeedback,
        reportLanguage,
      ).catch((error: unknown) => console.error("[mockio] background report:", error));
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
      reportIfDone(turn);
      return;
    }

    const turn = await session.submitAnswer(answer);
    await persist();
    json(res, 200, { turn });
    reportIfDone(turn);
    return;
  }

  const coachMatch = path.match(/^\/api\/sessions\/([\w-]+)\/coach$/);
  if (req.method === "POST" && coachMatch) {
    if (await limited(res, `coach:${identity.id}`, RULES.coach)) return;
    const stored = await STORE.get(coachMatch[1]!);
    if (!stored || stored.ownerId !== identity.id) {
      return json(res, 404, { error: "That interview is no longer open. Start a new one.", code: "sessionGone" });
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
      return json(res, 404, { error: "That interview is no longer open. Start a new one.", code: "sessionGone" });
    }
    const sessionId = evalMatch[1]!;
    // The reader's interface language, so the report is written in it. Only
    // the product's own locales are accepted; anything else reads in English.
    const evalBody = await readJson(req).catch(() => ({}) as Record<string, unknown>);
    const reportLanguage = REPORT_LANGUAGES[String(evalBody["readerLanguage"] ?? "")];
    json(res, 200, await evaluateOnce(identity.id, sessionId, stored, can.advancedFeedback, reportLanguage));
    return;
  }

  if (req.method === "GET" && path === "/api/history") {
    const all = await PROGRESS.listSessions(identity.id);
    /**
     * Whether they have outgrown the level they are practising at.
     *
     * Computed here rather than in the client because the rule is a product
     * decision — three consecutive clears, most recent attempts only — and a
     * copy of it in the browser is a second place for it to drift. The whole
     * history is read, not the page the plan allows: a free candidate's
     * progress is still their progress, and hiding it behind the history
     * limit would gate the one thing that tells them they are improving.
     */
    const prefs = await USERS.getPreferences(identity.id).catch(() => null);
    const current = findLevel(prefs?.defaultLevel ?? null);
    const nudge = readyToLevelUp(
      current.id,
      all.map((entry) => ({ level: entry.level ?? "", score: entry.score })),
    );
    json(res, 200, {
      levelUp: nudge ? { from: current.label, to: nudge.id, label: nudge.label } : null,
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
    if (!record) return json(res, 404, { error: "We could not find that interview.", code: "sessionMissing" });
    // Gated identically to /evaluation. Without this a free caller reads the
    // paid half straight back out of their own history a moment later.
    json(res, 200, { session: shapeFeedback(record, can.advancedFeedback) });
    return;
  }

  /**
   * The jobs somebody is actually going after.
   *
   * One list, five states, and a posting per row. Everything here is scoped by
   * `identity.id` in the store rather than filtered after reading, so a
   * mistyped id reads as missing instead of as somebody else's job search.
   *
   * Deliberately not a CRUD surface for anything the candidate did not type:
   * the rehearsal count and the best score are derived on read and have no
   * route to write them, because a number a client can set is a number that
   * will eventually disagree with the sessions it was supposed to summarise.
   */
  if (path === "/api/applications" && (req.method === "GET" || req.method === "POST")) {
    if (!can.trackApplications) {
      return json(res, 402, { error: "Tracking applications is on the paid plan.", code: "paidOnly" });
    }

    if (req.method === "GET") {
      const applications = await readQuietly(PROGRESS.listApplications(identity.id), []);
      return json(res, 200, { applications });
    }

    if (await limited(res, `applications:${identity.id}`, RULES.contribute)) return;
    const body = await readJson(req);
    const company = typeof body["company"] === "string" ? body["company"].trim() : "";
    const role = typeof body["role"] === "string" ? body["role"].trim() : "";
    if (company === "" || role === "") {
      // The two fields the row cannot mean anything without. A posting is
      // optional — plenty of jobs arrive from a friend with no advertisement.
      return json(res, 400, { error: "A company and a role are required." });
    }
    const postingRaw = typeof body["posting"] === "string" ? body["posting"].trim() : "";
    const status = isApplicationStatus(body["status"]) ? body["status"] : "interested";

    const id = randomUUID();
    await PROGRESS.createApplication({
      id,
      ownerId: identity.id,
      company: company.slice(0, 120),
      role: role.slice(0, 120),
      // Cut to the prompt's cap on the way in rather than on the way out: a
      // megabyte of pasted HTML has no business being stored to be trimmed
      // every time an interview reads it.
      posting: postingRaw === "" ? null : postingRaw.slice(0, MAX_POSTING_CHARS),
      status,
    });
    const created = await PROGRESS.getApplication(identity.id, id);
    return json(res, 201, { application: created });
  }

  const applicationMatch = path.match(/^\/api\/applications\/([\w-]+)$/);
  if (applicationMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const applicationId = applicationMatch[1]!;

    if (req.method === "DELETE") {
      // Ungated, like revoking a share: somebody whose plan lapsed must be
      // able to delete what they wrote. The rehearsals survive it.
      await PROGRESS.deleteApplication(identity.id, applicationId);
      return json(res, 200, { deleted: true });
    }

    if (!can.trackApplications) {
      return json(res, 402, { error: "Tracking applications is on the paid plan.", code: "paidOnly" });
    }
    const body = await readJson(req);
    const patch: {
      company?: string;
      role?: string;
      posting?: string | null;
      status?: ApplicationStatus;
    } = {};
    if (typeof body["company"] === "string" && body["company"].trim() !== "") {
      patch.company = body["company"].trim().slice(0, 120);
    }
    if (typeof body["role"] === "string" && body["role"].trim() !== "") {
      patch.role = body["role"].trim().slice(0, 120);
    }
    if (typeof body["posting"] === "string" && body["posting"].trim() !== "") {
      patch.posting = body["posting"].trim().slice(0, MAX_POSTING_CHARS);
    }
    if (body["status"] !== undefined) {
      // Checked rather than passed through. The column has a CHECK constraint,
      // so an unknown status would fail as a 500 at the database instead of as
      // the 400 it is.
      if (!isApplicationStatus(body["status"])) {
        return json(res, 400, { error: "That is not a status." });
      }
      patch.status = body["status"];
    }
    const updated = await PROGRESS.updateApplication(identity.id, applicationId, patch);
    if (!updated) return json(res, 404, { error: "We could not find that job." });
    return json(res, 200, { application: updated });
  }

  /**
   * Sharing one report, and stopping.
   *
   * POST returns the link rather than only the token: the client would
   * otherwise have to know how to build it, and the one place that knows the
   * site's own address is the server — which is the same reason `back_url`
   * for the checkout is built here.
   *
   * Gated on the plan at the moment of the request, not at the moment the
   * interview ran. Someone whose subscription lapsed cannot mint new links;
   * the ones they already sent keep working, because revoking them silently
   * on a lapse would break a link a mentor has in their inbox for a reason
   * that is between us and the candidate.
   */
  /**
   * "Try this answer again": one answer, graded on its own.
   *
   * The question and the suggested version come from the stored report, not
   * from the request, so the client cannot ask to be graded against a
   * question the interview never asked.
   */
  const retryMatch = path.match(/^\/api\/history\/([\w-]+)\/retry$/);
  if (req.method === "POST" && retryMatch) {
    if (await limited(res, `retry:${identity.id}`, RULES.coach)) return;
    const body = await readJson(req);
    const index = Number(body["index"]);
    const answer = typeof body["answer"] === "string" ? body["answer"].trim().slice(0, 2000) : "";
    if (!Number.isInteger(index) || index < 0 || answer.length < 3) {
      return json(res, 400, { error: "Say or write your new answer first.", code: "emptyAnswer" });
    }
    const detail = await PROGRESS.getSession(identity.id, retryMatch[1]!);
    const target = detail?.evaluation?.answer_feedback?.[index];
    if (!target) return json(res, 404, { error: "We could not find that answer.", code: "sessionMissing" });
    const result = await gradeRetry({
      question: target.question,
      suggested: target.better,
      answer,
      reportLanguage: REPORT_LANGUAGES[String(body["readerLanguage"] ?? "")],
      ...(PROVIDER ? { provider: PROVIDER } : {}),
    });
    json(res, 200, { result });
    return;
  }

  const shareMatch = path.match(/^\/api\/history\/([\w-]+)\/share$/);
  if (shareMatch && (req.method === "POST" || req.method === "DELETE")) {
    const sessionId = shareMatch[1]!;
    if (req.method === "DELETE") {
      // Deliberately not gated: revoking is always allowed. A lapsed
      // subscriber who wants a link taken down must be able to take it down.
      await PROGRESS.unshareSession(identity.id, sessionId);
      return json(res, 200, { shared: null });
    }
    if (!can.shareReport) {
      return json(res, 402, { error: "Sharing a report is on the paid plan.", code: "paidOnly" });
    }
    if (await limited(res, `share:${identity.id}`, RULES.contribute)) return;
    const token = await PROGRESS.shareSession(identity.id, sessionId);
    // Null means not theirs, or not there. Same answer for both: confirming
    // that an id exists is already telling a stranger something.
    if (!token) return json(res, 404, { error: "We could not find that interview.", code: "sessionMissing" });
    const xp = await recordShare(identity.id);
    json(res, 200, { shared: { token, url: `${siteUrl()}/r/${token}` }, xp });
    return;
  }

  /**
   * The progress card was shared or saved. Nothing is stored about the card
   * itself — it is drawn in the browser — this only counts toward the week's
   * sharing mission, the same as a link does.
   */
  if (req.method === "POST" && path === "/api/progress/shared") {
    if (await limited(res, `share:${identity.id}`, RULES.contribute)) return;
    json(res, 200, { xp: await recordShare(identity.id) });
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
    const today = new Date().toISOString().slice(0, 10);
    const sessions = await readQuietly(PROGRESS.listSessions(identity.id), []);
    json(res, 200, {
      xp: profile.xp,
      ...levelForXp(profile.xp),
      // The day's ring and the week's missions, on the same UTC day the
      // daily cap and the mission awards use, so the screen and the ledger
      // never disagree about which day it is.
      xpToday: await readQuietly(PROGRESS.xpOnDay(identity.id, today), 0),
      dailyGoal: DAILY_GOAL_XP,
      missions: weeklyMissions(
        sessions.filter((entry) => entry.completedAt !== null),
        today,
        await readQuietly(PROGRESS.hasXpSince(identity.id, missionKind("week-share"), missionWeekStart(today)), false),
      ),
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
    json(res, 200, {
      sectors: SECTORS,
      companies: COMPANIES,
      personas: PERSONAS,
      roles: ROLES,
      // The areas roles are grouped by, with the job title each interviewer
      // carries in that area. The picker groups by these and the call screen
      // introduces the interviewer by the same title the prompt uses.
      areas: AREAS,
      // Which rounds each role can sit. Sent as a map rather than a flat list
      // because offering an engineer's system design round to a designer is
      // the thing this replaces.
      stagesByRole: stageCatalogue(),
      languages: LANGUAGES,
      levels: levelCatalogue(),
      // The most rounds one session will run. The picker caps at this.
      maxCombinedStages: MAX_COMBINED,
      // The placeholder a free session is recorded against. The client needs
      // it to avoid printing "a well-regarded technology company" back at
      // someone as though it were where they interviewed.
      genericCompany: GENERIC_COMPANY,
    });
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
  securityHeaders(res);
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
      console.error("[mockio] mid-stream:", error);
      return;
    }
    // Typed failures carry a useful message; anything else could contain
    // provider internals, so it is logged here and generalized for the client.
    if (error instanceof InterviewRefusalError) {
      return json(res, 422, { error: "The interviewer stopped there. Start a new interview when you are ready." });
    }
    if (error instanceof EvaluationParseError) {
      return json(res, 502, { error: "We could not write your report. Your interview is saved — try again in a moment." });
    }
    // Both carry a message written for the person who uploaded the file.
    if (error instanceof ExtractionError || error instanceof BriefError) {
      return json(res, 422, { error: error.message });
    }
    if (error instanceof ThesisAnalysisError) {
      return json(res, 502, { error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/Missing or empty field|too large|empty|already/i.test(message)) {
      return json(res, 400, { error: message });
    }
    console.error("[mockio]", error);
    json(res, 500, { error: "Something broke on our side. Try again — nothing you did caused this.",
      code: "internal" });
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
// A rejected promise nobody awaited, or an exception outside any request,
// would otherwise vanish or end the process without a word. Both are logged
// with the prefix the rest of the service uses, so a log search finds them. An
// uncaught exception exits: the process state can no longer be trusted, and
// the platform restarts the service.
process.on("unhandledRejection", (reason) => {
  console.error("[mockio] unhandled rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[mockio] uncaught exception, exiting:", error);
  process.exit(1);
});

const redis = await getRedis();
const db = await getDb();
const store = createSessionStore(redis);
// Held locally as well as handed to `configure`, so the promo seeding below
// can use it without TypeScript having to prove the module slot was filled.
const plans = createEntitlementStore(db);

configure({
  sessions: store,
  users: createUserStore(redis),
  accounts: createAccountStore(redis),
  mailer: createEmailSender(),
  limiter: createRateLimiter(redis),
  progress: createProgressStore(db),
  plans,
  profiles: createProfileStore(db),
  theses: createThesisStore(db),
  packs: createDefensePackStore(db),
  realQuestions: createDefenseQuestionStore(db),
  advisors: createAdvisorStore(db),
  institutions: createInstitutionStore(db),
  lti: createLtiStore(db),
  leads: createB2bLeadStore(db),
  presence: createPresenceStore(db),
  contributions: createContributionStore(db),
  subscriptions: createSubscriptionStore(db),
  lifecycle: createLifecycleStore(db),
});

// The catalogue is code (see sectors.ts) and the table is a copy of it, so
// this runs on every boot rather than as a migration someone has to remember.
if (db) await seedCatalogue(db);

/**
 * The promotion codes this deployment offers.
 *
 * Created at boot from the environment, which is how a code first exists:
 * add it to REALSESSIONS_PROMO_CODES and restart. An existing code is left
 * alone — its days, seats and end are edited from the admin panel, and its
 * count is never reset — so a deploy in the middle of a promotion changes
 * nothing about it.
 *
 * A failure here is logged and the server starts anyway. A promotion that
 * could not be defined is a promotion nobody can redeem, which is a bad day;
 * a product that will not boot is a worse one.
 */
for (const promo of promoCodesFromEnv()) {
  await plans.definePromo(promo).catch((error: unknown) => {
    console.error(`[mockio] could not define promo ${promo.code}:`, error);
  });
}

// Present in the container image, absent in development.
SITE = await createStaticSite("web/dist");

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

/**
 * The one misconfiguration that fails silently and expensively.
 *
 * `REALSESSIONS_SITE_URL` builds every confirmation link, every password
 * reset, and Mercado Pago's return URL. Unset, it falls back to localhost —
 * so a production deploy keeps working in every visible way while sending
 * people links that only resolve on the machine that sent them. Nothing
 * errors, nobody can confirm an address, and the first sign is a support
 * message days later.
 *
 * Checked at boot rather than at send time so it is loud once, on deploy,
 * instead of quiet on every email.
 */
function warnAboutSiteUrl(): void {
  if (process.env.NODE_ENV !== "production") return;
  const site = process.env.REALSESSIONS_SITE_URL;
  if (!site) {
    console.warn(
      "[mockio] REALSESSIONS_SITE_URL is unset in production. " +
        "Confirmation and password-reset links will point at localhost and " +
        "will not work for anyone.",
    );
    return;
  }
  try {
    const { protocol, hostname } = new URL(site);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.warn(
        `[mockio] REALSESSIONS_SITE_URL is ${site} in production. ` +
          "Emailed links will not resolve for anyone but this machine.",
      );
    } else if (protocol !== "https:") {
      // The identity cookie is Secure in production, so a plain-http origin
      // cannot hold a session at all.
      console.warn(
        `[mockio] REALSESSIONS_SITE_URL is ${site}. The session cookie is ` +
          "Secure in production, so sign-in will not persist over http.",
      );
    }
  } catch {
    console.warn(
      `[mockio] REALSESSIONS_SITE_URL is not a valid URL: ${site}`,
    );
  }
}

/**
 * Says which parts of the payment configuration arrived, at boot.
 *
 * Every one of these failures presents identically: the API answers
 * `configured: false`, the upgrade button does not render, and nothing
 * anywhere says why. Finding out which of four variables was wrong took a
 * long back-and-forth of guessing, so the process now reports it once, on
 * start, where the operator is already looking after changing them.
 *
 * Names the amount and the currency because they are printed on the pricing
 * page anyway. Never prints the access token or the webhook secret — only
 * whether each is present, which is the part that is actually in question.
 */
function reportBillingConfig(): void {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const rawAmount = process.env.MERCADOPAGO_AMOUNT;
  const currency = process.env.MERCADOPAGO_CURRENCY?.trim();
  const amount = readAmount(rawAmount);
  const plan = planConfig();

  if (!token && !rawAmount && !currency) {
    console.log("[mockio] Mercado Pago: not configured. Payments are off.");
    return;
  }

  const parts = [
    `mode ${billingMode() ?? "UNSET (checkout refused)"}`,
    `token ${token ? "set" : "MISSING"}`,
    `webhook secret ${secret ? "set" : "MISSING"}`,
    // The raw value is echoed only when it failed to parse, so the operator
    // can see what the process actually received — trailing spaces and
    // smart quotes are invisible in a dashboard field.
    amount === null
      ? `amount UNREADABLE (received ${JSON.stringify(rawAmount ?? null)})`
      : `amount ${amount}`,
    currency ? `currency ${currency}` : "currency MISSING",
  ];
  console.log(`[mockio] Mercado Pago: ${parts.join(", ")}.`);

  if (plan === null) {
    console.warn(
      "[mockio] Mercado Pago has no usable plan, so the upgrade button will " +
        "not appear. Both MERCADOPAGO_AMOUNT and MERCADOPAGO_CURRENCY must be set.",
    );
    return;
  }
  const blocked = checkoutBlockReason();
  if (blocked) console.warn(`[mockio] ${blocked}`);
}

/**
 * The scheduler tick.
 *
 * Hourly, which is far more often than any job's cadence — the jobs themselves
 * decide whether they are due, and a tick that finds nothing costs one query.
 * Being frequent is what makes the schedule survive restarts: a deploy in the
 * middle of a day does not push the daily run to tomorrow.
 *
 * `unref` so an idle timer never holds the process open during shutdown.
 */
const LIFECYCLE_TICK_MS = 60 * 60 * 1000;
let lifecycleTimer: NodeJS.Timeout | null = null;

server.listen(PORT, () => {
  warnAboutSiteUrl();
  reportBillingConfig();
  if (!lifecycleEmailEnabled()) {
    console.log(
      "[mockio] Lifecycle email is off. Reminders and weekly summaries are " +
        "not sent; set REALSESSIONS_LIFECYCLE_EMAIL=1 to enable them. " +
        "Receipts and security notices are unaffected.",
    );
  }
  lifecycleTimer = setInterval(() => {
    void runLifecycleJobs();
  }, LIFECYCLE_TICK_MS);
  lifecycleTimer.unref();
  // Once at boot as well, so a deployment that was down over a scheduled run
  // catches up instead of skipping it.
  void runLifecycleJobs();
  console.log(
    `Mockio API on http://localhost:${PORT} ` +
      `(sessions: ${store.kind}, progress: ${PROGRESS.kind}, ` +
      `rate limits: ${LIMITER.kind}, email: ${MAILER.kind}, ` +
      `voice: ${deepgramConfigured() ? "deepgram" : "browser"}, ` +
      `web: ${SITE ? "served" : "not bundled"})`,
  );
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (lifecycleTimer) clearInterval(lifecycleTimer);
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
