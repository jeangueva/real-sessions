/**
 * Client for the TechShadow API. No credentials live here — the provider key
 * stays on the server, which is the whole reason this boundary exists.
 */
import type { Evaluation } from "./evaluation";

export interface InterviewContext {
  candidateName: string;
  targetRole: string;
  companyName: string;
  companyCulture: string;
  industry: string;
  interviewStage: string;
}

export interface InterviewerTurn {
  text: string;
  isComplete: boolean;
  turnNumber: number;
  stopReason: string | null;
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
    onSession?: (sessionId: string) => void;
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
          handlers.onSession?.((event.data as { sessionId: string }).sessionId);
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

/** Streaming start. Resolves with the finished turn once the stream closes. */
export function startSessionStream(
  context: InterviewContext,
  handlers: {
    onDelta: (text: string) => void;
    onSession: (sessionId: string) => void;
  },
) {
  return withIdentity(() => postStream("/api/sessions", context, handlers));
}

/** Streaming answer. */
export function sendAnswerStream(
  sessionId: string,
  answer: string,
  onDelta: (text: string) => void,
) {
  return withIdentity(() =>
    postStream(`/api/sessions/${sessionId}/answers`, { answer }, { onDelta }),
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
    post<{ evaluation: Evaluation }>(`/api/sessions/${sessionId}/evaluation`, {}),
  );
}

export interface SessionSummary {
  id: string;
  company: string;
  role: string;
  stage: string;
  completedAt: string;
  score: number;
}

export interface Preferences {
  defaultRole: string;
  defaultCompany: string;
  interviewLength: number;
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
    request<{ sessions: SessionSummary[] }>("/api/history", { method: "GET" }),
  );
}

export function fetchHistoryEntry(id: string) {
  return withIdentity(() =>
    request<{ session: SessionSummary & { evaluation: Evaluation } }>(
      `/api/history/${id}`,
      { method: "GET" },
    ),
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

/** Culture blurbs the Phase 1 prompt needs but the picker does not collect. */
export const COMPANY_CULTURE: Record<string, string> = {
  Stripe: "Craft, user obsession, high trust, written communication",
  Amazon: "Customer obsession, data-driven, ownership, bias for action",
  Airbnb: "Belonging, design-led craft, host and guest empathy",
  "Mercado Libre": "Scale, pragmatism, regional depth, entrepreneurship",
};

export const COMPANY_INDUSTRY: Record<string, string> = {
  Stripe: "Fintech",
  Amazon: "E-commerce",
  Airbnb: "Travel and hospitality",
  "Mercado Libre": "E-commerce and fintech",
};
