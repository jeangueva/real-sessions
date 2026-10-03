/**
 * Client for the Mockio API. No credentials live here — the provider key
 * stays on the server, which is the whole reason this boundary exists.
 */
import type { Evaluation } from "./evaluation";
import {
  dictionaryFor,
  EN_MESSAGES,
  readLocale,
  translate,
  type MessageKey,
} from "./i18n";

export interface InterviewContext {
  /**
   * Optional: the server resolves it from the account's own settings. The
   * client used to send a hardcoded "Mariana", which greeted every candidate
   * as somebody else.
   */
  candidateName?: string;
  targetRole: string;
  companyName: string;
  interviewStage: string;
  /**
   * Only for a company outside the server's catalogue. For a known one the
   * server fills both from its own records and ignores anything sent here —
   * two lists of company culture would drift, and the client's would lose.
   */
  companyCulture?: string;
  industry?: string;
}

export interface InterviewerTurn {
  text: string;
  isComplete: boolean;
  turnNumber: number;
  stopReason: string | null;
}

/** Practice shows live coaching; real withholds it, the way an interview does. */
export type SessionMode = "practice" | "real";

/** Milliseconds from the start of the session. Null when the answer was typed. */
export interface SpeechTimings {
  interviewerEndedMs: number | null;
  answerStartedMs: number | null;
  answerEndedMs: number | null;
}

/**
 * Derived arithmetic over the transcript — no model, so no run-to-run drift.
 * The timing half is null for a typed session and must not be plotted then.
 */
export interface SessionMetrics {
  words: number;
  fillerPer100: number | null;
  vocabularyRange: number | null;
  wordShare: number | null;
  speakingMs: number | null;
  wpm: number | null;
  avgResponseMs: number | null;
  longPauses: number | null;
  timeToFirstMs: number | null;
  fromSpeech: boolean;
}

export interface CoachTip {
  kind: "structure" | "specificity" | "vocabulary" | "grammar";
  note: string;
}

export type Plan = "free" | "premium";

export interface Capabilities {
  plan: Plan;
  targetCompany: boolean;
  choosePersona: boolean;
  candidateProfile: boolean;
  liveCoaching: boolean;
  advancedFeedback: boolean;
  historyLimit: number;
  /** Run the interview in Spanish or Portuguese. Not the interface language. */
  interviewLanguage: boolean;
  /** Interviews a calendar month, or null when the plan does not meter them. */
  weeklySessions: number | null;
  /** Publish one finished report at a link anybody can open. */
  shareReport: boolean;
  /** Keep a list of real jobs, each with its posting and its rehearsals. */
  trackApplications: boolean;
}

export interface ProfileLink {
  url: string;
  kind: "github" | "linkedin" | "figma" | "portfolio" | "behance" | "dribbble" | "other";
  label: string | null;
}

export interface CandidateProfile {
  sourceName: string | null;
  brief: string | null;
  links: ProfileLink[];
  updatedAt: string | null;
}

export interface Persona {
  id: string;
  /** The archetype, e.g. "The skeptic". */
  label: string;
  /** Their name — said out loud in the interview's first turn. */
  name: string;
  title: string;
  initials: string;
  summary: string;
  behaviour: string;
  voice: {
    model: string;
    /** Browser-synthesiser settings, used only when Aura is unavailable. */
    fallback: { rate: number; pitch: number; prefer: string[] };
  };
}

/** A language the interview can be conducted in. */
export interface Language {
  id: string;
  label: string;
  bcp47: string;
  /** Present when the experience is degraded — no vendor voice, say. */
  caveat?: string;
}

/** An English level: how the interview is delivered, not how hard it is. */
export interface Level {
  id: string;
  label: string;
  summary: string;
}

export interface Role {
  id: string;
  label: string;
  focus: string;
}

/** A round of the process. Which ones exist depends on the role. */
export interface Stage {
  id: string;
  label: string;
  summary: string;
  minTurns: number;
  maxTurns: number;
  /** The job titles that run this round. Filters the interviewer picker. */
  titles: string[];
  /** A round that cannot be combined with another. */
  solo?: boolean;
}

export interface Sector {
  id: string;
  label: string;
  focus: string;
  metrics: string;
}

export interface CatalogueCompany {
  id: string;
  name: string;
  sectorId: string;
  culture: string;
  description: string;
  tint: string;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
}

export interface EarnedBadge extends Badge {
  badgeId: string;
  earnedAt: string;
}

export type Axis = "fluency" | "vocabulary" | "structure" | "confidence";

export interface AxisPoint {
  sessionId: string;
  completedAt: string | null;
  scores: Record<Axis, number | null>;
}

export interface XpAward {
  events: { kind: string; amount: number }[];
  gained: number;
}

/** Carries the server's message so the UI can show something specific. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /**
     * How long until the same call is allowed again, on a 429.
     *
     * The server sends it in the body and in `Retry-After`, and it was being
     * dropped on the floor — leaving "Too many requests. Try again later." as
     * the whole of what a rate-limited person was told, with no way to know
     * whether later meant a minute or an hour.
     */
    readonly retryAfterSeconds?: number,
    /**
     * The provider's own account of a refusal, sent only in the sandbox.
     *
     * Never present in live, where the reader is a candidate rather than
     * whoever is wiring the integration up.
     */
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * The server's sentence, in the reader's language when we have one.
 *
 * Server errors are written in English and reach seventeen screens unchanged,
 * so a candidate with the interface in Spanish was reading "That access code
 * did not work." in the middle of a Spanish page. Translating every one of
 * them would mean carrying forty sentences in fourteen languages; sending a
 * code and keeping the words on this side costs one key each.
 *
 * Unknown codes — and responses with none — fall back to what the server
 * said, which is exactly the behaviour that existed before. Adding a language
 * to an error is therefore adding one key, never a migration.
 */
function localise(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  const key = `err.${code}` as MessageKey;
  const locale = readLocale();
  const dictionary = dictionaryFor(locale);
  // `translate` falls back to English for a missing key, which would silently
  // replace a precise server sentence with nothing useful — so the key has to
  // actually exist before it is used.
  if (!(key in EN_MESSAGES) || (dictionary && !(key in dictionary))) return fallback;
  return translate(locale, key);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The identity cookie is httpOnly, so it is never read by this code —
      // it only has to be sent.
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network failure, never on a 4xx/5xx.
    throw new ApiError("Could not reach the interview service.", 0);
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  } & T;

  if (!response.ok) {
    throw new ApiError(
      localise(payload.code, payload.error ?? `Request failed (${response.status}).`),
      response.status,
    );
  }
  return payload;
}

/**
 * Thrown when the API says there is nobody signed in.
 *
 * Its own type because the answer is a screen, not a retry: whoever catches
 * this sends the reader to sign in. Until accounts became mandatory a 401 was
 * recoverable — the client asked for an anonymous identity and tried again —
 * and doing that now would loop against a server that has none to give.
 */
export class NotSignedIn extends ApiError {
  constructor(message = "Sign in to continue.") {
    super(message, 401);
    this.name = "NotSignedIn";
  }
}

/** Runs `action`, turning "nobody is signed in" into something callers can act on. */
async function withIdentity<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new NotSignedIn(error.message);
    }
    throw error;
  }
}

/**
 * Reads an SSE body from a POST. `EventSource` is not usable here because it
 * only issues GET requests and cannot send the interview payload.
 */
async function postStream(
  path: string,
  body: unknown,
  handlers: {
    onDelta: (text: string) => void;
    onSession?: (
      sessionId: string,
      persona: Persona,
      running: RunningContext,
      maxTurns: number,
      language: string,
    ) => void;
  },
): Promise<InterviewerTurn> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the interview service.", 0);
  }

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(
      payload.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let turn: InterviewerTurn | null = null;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      // Frames are separated by a blank line; a partial frame stays buffered.
      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const event = readFrame(frame);

        if (event?.name === "delta") {
          handlers.onDelta((event.data as { text: string }).text);
        } else if (event?.name === "session") {
          const payload = event.data as {
            sessionId: string;
            persona: Persona;
            context: RunningContext;
            maxTurns: number;
            language: string;
          };
          handlers.onSession?.(
            payload.sessionId,
            payload.persona,
            payload.context,
            payload.maxTurns,
            payload.language,
          );
        } else if (event?.name === "turn") {
          turn = (event.data as { turn: InterviewerTurn }).turn;
        } else if (event?.name === "error") {
          throw new ApiError((event.data as { error: string }).error, 500);
        }
        split = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!turn) {
    // The stream ended without a final turn — a dropped connection, not a
    // refusal. The caller should treat it as retryable.
    throw new ApiError("The interviewer's turn ended unexpectedly.", 0);
  }
  return turn;
}

function readFrame(frame: string): { name: string; data: unknown } | null {
  let name = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { name, data: JSON.parse(dataLines.join("\n")) };
  } catch {
    return null;
  }
}

/**
 * What the interview is actually running against.
 *
 * Not the same thing as what was requested: the free plan replaces the chosen
 * employer with a generic one, and the screen has to say which it got.
 */
export interface RunningContext {
  companyName: string;
  targetRole: string;
  interviewStage: string;
  industry: string;
  /** True when the employer was replaced — a role interview, not a company one. */
  generic: boolean;
}

/** Streaming start. Resolves with the finished turn once the stream closes. */
export function startSessionStream(
  context: InterviewContext,
  options: {
    mode: SessionMode;
    personaId: string;
    /** The rounds this session covers, in order. */
    stages?: string[];
    /** What the interviewer speaks. English unless the plan allows a choice. */
    language?: string;
    /** Interruptions, pushback and moved goalposts. Free on every plan. */
    pressure?: boolean;
    /**
     * The advertisement they are answering, pasted in.
     *
     * Sent per interview rather than stored: a posting belongs to one
     * application, and keeping it would quietly apply it to every later
     * interview.
     */
    jobPosting?: string;
  /**
   * The application this rehearses for.
   *
   * When present, the server reads the posting from the stored row and
   * ignores `jobPosting` — the advertisement is pasted once, against the job.
   */
  applicationId?: string;
  },
  handlers: {
    onDelta: (text: string) => void;
    onSession: (
      sessionId: string,
      persona: Persona,
      running: RunningContext,
      maxTurns: number,
      language: string,
    ) => void;
  },
) {
  return withIdentity(() =>
    postStream("/api/sessions", { ...context, ...options }, handlers),
  );
}

/** Streaming answer. */
export function sendAnswerStream(
  sessionId: string,
  answer: string,
  timings: SpeechTimings,
  onDelta: (text: string) => void,
) {
  return withIdentity(() =>
    postStream(
      `/api/sessions/${sessionId}/answers`,
      { answer, timings },
      { onDelta },
    ),
  );
}

export function startSession(context: InterviewContext) {
  return withIdentity(() =>
    post<{ sessionId: string; turn: InterviewerTurn }>("/api/sessions", context),
  );
}

export function sendAnswer(sessionId: string, answer: string) {
  return withIdentity(() =>
    post<{ turn: InterviewerTurn }>(`/api/sessions/${sessionId}/answers`, {
      answer,
    }),
  );
}

export function requestEvaluation(sessionId: string) {
  return withIdentity(() =>
    post<{
      evaluation: Evaluation;
      metrics: SessionMetrics | null;
      xp: XpAward;
      badges: Badge[];
      /** Names what the plan withheld, so the UI can offer it rather than hide it. */
      withheld: { metrics: boolean; nextSteps: boolean };
    }>(`/api/sessions/${sessionId}/evaluation`, {}),
  );
}

/**
 * Coaching notes for the exchange just finished.
 *
 * Never awaited by the send path. This is the second loop: it runs behind the
 * conversation and a failure here must not touch it, which is why the caller
 * fires it and ignores rejection.
 */
export function requestCoaching(sessionId: string) {
  return withIdentity(() =>
    post<{ tips: CoachTip[] }>(`/api/sessions/${sessionId}/coach`, {}),
  );
}

export interface SessionSummary {
  /** The English level it ran at. Null for sessions predating levels. */
  level?: string | null;
  id: string;
  company: string;
  sectorId: string | null;
  role: string;
  stage: string;
  mode: SessionMode;
  /**
   * Which interviewer ran it. Carried so a past session can be repeated
   * exactly — same company, same role, same person across the table — which
   * is the only way two scores are comparable.
   */
  personaId: string | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  /** The evaluator's two sub-scores, 0–10. Null until the session is scored. */
  vocabularyScore: number | null;
  structureScore: number | null;
  metrics: SessionMetrics | null;
  /**
   * The token this report is readable by, or null when it is not shared.
   *
   * Optional on this type rather than required: the history list and the
   * report screen both read it, and a server older than this field would make
   * every row fail to parse rather than simply not offer sharing.
   */
  shareToken?: string | null;
}

export interface Preferences {
  /** The English level new sessions start at. Delivery, not difficulty. */
  defaultLevel: string;
  /** What the interviewer calls you. Empty means the server guesses. */
  candidateName: string;
  defaultRole: string;
  defaultCompany: string;
  interviewLength: number;
  defaultSector: string;
  defaultMode: SessionMode;
}

async function request<T>(
  path: string,
  init: RequestInit & { method: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError("Could not reach the interview service.", 0);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    retryAfterSeconds?: number;
    detail?: string;
  } & T;
  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `Request failed (${response.status}).`,
      response.status,
      typeof payload.retryAfterSeconds === "number"
        ? payload.retryAfterSeconds
        : undefined,
      typeof payload.detail === "string" ? payload.detail : undefined,
    );
  }
  return payload;
}

export interface Session {
  kind: "guest" | "user" | null;
  email: string | null;
  emailVerified?: boolean;
}

export function fetchSession() {
  return request<Session>("/api/auth/me", { method: "GET" });
}

export function signUp(email: string, password: string) {
  return request<{ email: string }>("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function signIn(email: string, password: string) {
  return request<{ email: string }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function confirmEmail(token: string) {
  return request<{ ok: true; earlyAccess?: boolean }>("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

export function resendVerification() {
  return request<{ ok: true }>("/api/auth/verify/resend", { method: "POST" });
}

export function requestPasswordReset(email: string) {
  return request<{ ok: true; message: string }>("/api/auth/forgot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ ok: true }>("/api/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
}

export function signOut() {
  return request<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function fetchHistory() {
  return withIdentity(() =>
    request<{
      sessions: SessionSummary[];
      withheld: number;
      /** Set when recent scores say the current level is no longer the limit. */
      levelUp: { from: string; to: string; label: string } | null;
    }>("/api/history", {
      method: "GET",
    }),
  );
}

export function fetchHistoryEntry(id: string) {
  return withIdentity(() =>
    request<{
      session: SessionSummary & {
        evaluation: Evaluation | null;
        withheld: { metrics: boolean; nextSteps: boolean };
        turns: {
          idx: number;
          speaker: "interviewer" | "candidate";
          text: string;
          tStartMs: number | null;
          tEndMs: number | null;
        }[];
      };
    }>(`/api/history/${id}`, { method: "GET" }),
  );
}

/**
 * Whether the server can do live transcription.
 *
 * Public rather than identity-scoped: it is asked before the microphone opens,
 * and the answer is the same for everyone.
 */
/**
 * Erases the account and everything attached to it.
 *
 * The address is typed back as confirmation — the server checks it, so this is
 * not a courtesy the client could skip.
 */
export function deleteAccount(email: string) {
  return withIdentity(() =>
    request<{ ok: true; kept: string }>("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  );
}

export function fetchVoiceConfig() {
  return request<{ live: boolean; speech: boolean }>("/api/voice/config", {
    method: "GET",
  });
}

export interface Subscription {
  externalId: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  periodEnd: string | null;
  updatedAt: string;
}

export interface BillingState {
  /** False when this deployment has no payment provider wired up. */
  configured: boolean;
  plan: { amount: number; currency: string } | null;
  /** "test" while pointed at Mercado Pago's sandbox, "live" when it charges. */
  mode?: "test" | "live" | null;
  /**
   * Mercado Pago's browser key, for the on-site card form.
   *
   * Null when this deployment has not been given one, and the client falls
   * back to the redirect checkout rather than showing a form that cannot
   * tokenise anything.
   */
  publicKey: string | null;
  subscription: Subscription | null;
}

export function subscribeWithCard(cardTokenId: string, cycle: BillingCycle = "monthly") {
  return withIdentity(() =>
    request<{ status: string }>("/api/billing/subscribe", {
      method: "POST",
      body: JSON.stringify({ cardTokenId, cycle }),
    }),
  );
}

/**
 * Asks the server to check an unsettled subscription against the provider.
 *
 * Called when the plan panel loads, which is where someone lands after the
 * hosted checkout sends them back. Without it a payer whose webhook was late
 * or lost reads "you are on the free plan" with the money already gone.
 */
export function reconcileBilling() {
  return withIdentity(() =>
    request<{ plan: Plan }>("/api/billing/reconcile", { method: "POST" }),
  );
}

export function fetchBilling() {
  return withIdentity(() =>
    request<BillingState>("/api/billing", { method: "GET" }),
  );
}

/** Returns where to send the payer. Mercado Pago hosts the checkout itself. */
export function startCheckout(cycle: BillingCycle = "monthly") {
  return withIdentity(() =>
    request<{ initPoint: string }>("/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ cycle }),
    }),
  );
}

/**
 * Redeems a promotion code.
 *
 * The error carries a `reason` as well as a message, so the panel can say
 * "already claimed" differently from "not a code" without parsing prose.
 */
export function redeemPromo(code: string) {
  return withIdentity(() =>
    request<{ plan: Plan; until: string }>("/api/billing/promo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }),
  );
}

export function cancelSubscription() {
  return withIdentity(() =>
    request<{ plan: Plan }>("/api/billing/cancel", { method: "POST" }),
  );
}

/**
 * Starts sharing one report, and returns the link to hand out.
 *
 * The URL comes from the server rather than being assembled here: the one
 * place that knows this deployment's own address is the server, and a client
 * building it from `window.location` would produce a localhost link in
 * development and paste it into somebody's chat window.
 */
export function shareSession(historyId: string) {
  return withIdentity(() =>
    request<{ shared: { token: string; url: string } }>(
      `/api/history/${historyId}/share`,
      { method: "POST" },
    ),
  );
}

/** Takes the link down. Allowed on any plan — see the route. */
export function unshareSession(historyId: string) {
  return withIdentity(() =>
    request<{ shared: null }>(`/api/history/${historyId}/share`, {
      method: "DELETE",
    }),
  );
}

/**
 * One real job, with what the practice says about it.
 *
 * `sessions` and `bestScore` are derived by the server on read and have no
 * route that writes them, so there is nothing here to keep in sync.
 */
export interface Application {
  id: string;
  company: string;
  role: string;
  posting: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSummary extends Application {
  sessions: number;
  bestScore: number | null;
}

/** The five states, in the order a search passes through them. */
export const APPLICATION_STATUSES = [
  "interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function fetchApplications() {
  return withIdentity(() =>
    request<{ applications: ApplicationSummary[] }>("/api/applications", {
      method: "GET",
    }),
  );
}

export function createApplication(input: {
  company: string;
  role: string;
  posting?: string;
}) {
  return withIdentity(() =>
    request<{ application: Application }>("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export function updateApplication(
  id: string,
  patch: { status?: ApplicationStatus; company?: string; role?: string; posting?: string },
) {
  return withIdentity(() =>
    request<{ application: Application }>(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export function deleteApplication(id: string) {
  return withIdentity(() =>
    request<{ deleted: boolean }>(`/api/applications/${id}`, { method: "DELETE" }),
  );
}

/**
 * What the sign-in screen needs before anybody has an identity.
 *
 * `google` is null on a deployment where sign-in with Google is not
 * configured, which is how the button knows not to draw itself rather than
 * appearing and failing when pressed.
 */
export function fetchAuthConfig() {
  return request<{ google: string | null }>("/api/auth/config", { method: "GET" });
}

/** Exchanges the token Google signed for our own session cookie. */
export function signInWithGoogle(credential: string) {
  return request<{ email: string }>("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
}

export function fetchPlan() {
  return withIdentity(() =>
    request<{ plan: Plan; capabilities: Capabilities; reviewer: boolean }>(
      "/api/plan",
      { method: "GET" },
    ),
  );
}

export interface PendingQuestion {
  id: number;
  companyId: string;
  stage: string | null;
  role: string | null;
  question: string;
  createdAt: string;
}

export function fetchReviewQueue() {
  return withIdentity(() =>
    request<{
      queue: PendingQuestion[];
      depth: number;
      companies: { id: string; name: string }[];
      roles: { id: string; label: string }[];
    }>("/api/review", { method: "GET" }),
  );
}

export function decideQuestion(id: number, status: "verified" | "rejected") {
  return withIdentity(() =>
    request<{ decided: boolean }>(`/api/review/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
}

/** Public: no identity needed, this runs from the landing page. */
/**
 * Whether early access still takes addresses, and until when.
 *
 * `closesAt` is null when the offer has no end configured. The landing page
 * only counts down when there is a real date to count to.
 */
/**
 * The price the checkout will actually charge, or null when payments are off.
 *
 * Public, because the landing page asks before anyone has an identity.
 */
export type BillingCycle = "monthly" | "yearly";

export interface CyclePlan {
  amount: number;
  currency: string;
  cycle: BillingCycle;
}

export interface PlanOffer {
  monthly: CyclePlan;
  /** Null until a yearly amount is configured on the deployment. */
  yearly: CyclePlan | null;
  /** Worked out from the two real amounts by the server, never written down. */
  savingPercent: number | null;
}

export function fetchPricing() {
  return request<{
    plan: { amount: number; currency: string } | null;
    offer: PlanOffer | null;
  }>("/api/pricing", { method: "GET" });
}

export function fetchEarlyAccessState() {
  return request<{ open: boolean; closesAt: string | null; months: number }>(
    "/api/early-access",
    { method: "GET" },
  );
}

export function joinEarlyAccess(email: string, role: string, company: string) {
  return request<{ ok: true; months: number; message: string }>(
    "/api/early-access",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, company }),
    },
  );
}

export function fetchCandidateProfile() {
  return withIdentity(() =>
    request<{ profile: CandidateProfile }>("/api/context", { method: "GET" }),
  );
}

/**
 * Uploads a CV or portfolio.
 *
 * `FormData` sets its own multipart content-type with the boundary, so this
 * deliberately sends no Content-Type header — adding one strips the boundary
 * and the server sees an unparsable body.
 */
export function uploadProfileDocument(file: File) {
  const form = new FormData();
  form.append("file", file);
  return withIdentity(() =>
    request<{ profile: CandidateProfile }>("/api/context/document", {
      method: "POST",
      body: form,
    }),
  );
}

export function saveProfileLinks(links: string[]) {
  return withIdentity(() =>
    request<{ profile: CandidateProfile; rejected: string[] }>("/api/context/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links }),
    }),
  );
}

export function clearProfile() {
  return withIdentity(() =>
    request<{ profile: CandidateProfile }>("/api/context", { method: "DELETE" }),
  );
}

export function contributeQuestion(input: {
  companyId: string;
  question: string;
  stage?: string;
  role?: string;
}) {
  return withIdentity(() =>
    request<{ ok: true; stored: boolean; message: string }>("/api/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export function fetchProgress() {
  return withIdentity(() =>
    request<{ sessions: SessionSummary[]; axes: AxisPoint[]; axisNames: Axis[] }>(
      "/api/progress",
      { method: "GET" },
    ),
  );
}

export function fetchProfile() {
  return withIdentity(() =>
    request<{
      xp: number;
      level: number;
      xpIntoLevel: number;
      xpForNextLevel: number;
      badges: EarnedBadge[];
      catalogue: Badge[];
    }>("/api/profile", { method: "GET" }),
  );
}

export function fetchLeaderboard() {
  return withIdentity(() =>
    request<{
      rows: { position: number; xp: number; you: boolean }[];
      you: number | null;
    }>("/api/leaderboard", { method: "GET" }),
  );
}

export function fetchCatalogue() {
  return withIdentity(() =>
    request<{
      sectors: Sector[];
      companies: CatalogueCompany[];
      personas: Persona[];
      /** The stand-in company a free session is recorded against. */
      genericCompany: string;
      /** The rounds each role can sit, keyed by role id. */
      stagesByRole: { roleId: string; stages: Stage[] }[];
      /** The most rounds one session will run. */
      maxCombinedStages: number;
      languages: Language[];
      levels: Level[];
      roles: Role[];
    }>("/api/catalogue", { method: "GET" }),
  );
}

export function fetchPreferences() {
  return withIdentity(() =>
    request<{ preferences: Preferences }>("/api/preferences", { method: "GET" }),
  );
}

export function savePreferences(preferences: Preferences) {
  return withIdentity(() =>
    request<{ preferences: Preferences }>("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    }),
  );
}
