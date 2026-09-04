/**
 * Client for the Real Sessions API. No credentials live here — the provider key
 * stays on the server, which is the whole reason this boundary exists.
 */
import type { Evaluation } from "./evaluation";

export interface InterviewContext {
  candidateName: string;
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
  ) {
    super(message);
    this.name = "ApiError";
  }
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
  } & T;

  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `Request failed (${response.status}).`,
      response.status,
    );
  }
  return payload;
}

/**
 * Obtains the identity cookie. Called before the first protected request and
 * again after a 401, which is what an expired token looks like.
 */
export function authenticate(accessCode?: string) {
  return post<{ expiresAt: number }>("/api/auth", { accessCode });
}

/** Runs `action`, obtaining an identity once if the API says we lack one. */
async function withIdentity<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await authenticate();
      return action();
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
          };
          handlers.onSession?.(
            payload.sessionId,
            payload.persona,
            payload.context,
            payload.maxTurns,
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
  options: { mode: SessionMode; personaId: string },
  handlers: {
    onDelta: (text: string) => void;
    onSession: (
      sessionId: string,
      persona: Persona,
      running: RunningContext,
      maxTurns: number,
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
}

export interface Preferences {
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
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(
      payload.error ?? `Request failed (${response.status}).`,
      response.status,
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
  return request<{ ok: true }>("/api/auth/verify", {
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
    request<{ sessions: SessionSummary[]; withheld: number }>("/api/history", {
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
  subscription: Subscription | null;
}

export function fetchBilling() {
  return withIdentity(() =>
    request<BillingState>("/api/billing", { method: "GET" }),
  );
}

/** Returns where to send the payer. Mercado Pago hosts the checkout itself. */
export function startCheckout() {
  return withIdentity(() =>
    request<{ initPoint: string }>("/api/billing/checkout", { method: "POST" }),
  );
}

export function cancelSubscription() {
  return withIdentity(() =>
    request<{ plan: Plan }>("/api/billing/cancel", { method: "POST" }),
  );
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
