/**
 * A real server, on a real port, for the route tests.
 *
 * The alternative — calling `route()` with hand-built request and response
 * doubles — would exercise the handler bodies while skipping everything that
 * has actually broken here: cookie round-trips, status codes, SSE framing, the
 * multipart reader, and the order in which the authentication gate runs
 * against the routes placed in front of it. So this boots the module and
 * speaks HTTP to it.
 *
 * Every collaborator is in-memory and every model call is stubbed, so the suite
 * needs no Redis, no Postgres, no API key and no network.
 */
import type { AddressInfo } from "node:net";
import { configure, server } from "../../src/server.js";
import { createSessionStore } from "../../src/session-store.js";
import { createUserStore } from "../../src/user-store.js";
import { createProgressStore } from "../../src/progress-store.js";
import { createEntitlementStore } from "../../src/entitlements.js";
import { createProfileStore } from "../../src/profile.js";
import { createContributionStore } from "../../src/contributions.js";
import { createAccountStore } from "../../src/accounts.js";
import { MemoryRateLimiter } from "../../src/rate-limit.js";
import type { EmailSender } from "../../src/email.js";
import type { ModelProvider } from "../../src/providers/index.js";
import { SAMPLE_EVALUATION } from "../fixtures.js";

const USAGE = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};
const LATENCY = { totalMs: 1, ttftMs: 1 };

export interface StubProvider extends ModelProvider {
  /** Every system prompt the stub was handed, so tests can assert on them. */
  readonly prompts: string[];
  /** Queues a reply for the next call. */
  reply(text: string): void;
}

/**
 * Stands in for a model.
 *
 * Replies are queued rather than computed: an interview is a sequence of turns
 * and a test needs to decide which one ends it, because `[INTERVIEW_COMPLETE]`
 * is what unlocks the evaluation route.
 */
export function createStubProvider(): StubProvider {
  const queued: string[] = [];
  const prompts: string[] = [];

  return {
    name: "stub",
    prompts,
    reply(text) {
      queued.push(text);
    },
    async chat(request) {
      prompts.push(request.system);
      const text = queued.shift() ?? "Tell me about a hard tradeoff you made.";
      // Streaming callers get the whole reply as one chunk. Splitting it finer
      // would exercise the SSE framing harder but makes every assertion depend
      // on where the chunks fall.
      request.onDelta?.(text);
      return { text, stopReason: "stop", refused: false, usage: USAGE, latency: LATENCY };
    },
    async json(request) {
      prompts.push(request.system);
      const next = queued.shift();
      const value = next ? JSON.parse(next) : SAMPLE_EVALUATION;
      return {
        value: value as never,
        raw: JSON.stringify(value),
        refused: false,
        usage: USAGE,
        latency: LATENCY,
      };
    },
  };
}

/** Records what would have been sent, so the email routes are assertable. */
export function createStubMailer(): EmailSender & { sent: { to: string }[] } {
  const sent: { to: string }[] = [];
  return {
    kind: "stub",
    sent,
    async send(message) {
      sent.push({ to: message.to });
    },
  };
}

export interface Harness {
  url: string;
  provider: StubProvider;
  mailer: ReturnType<typeof createStubMailer>;
  /** fetch with the cookie jar attached, so an identity persists across calls. */
  call(path: string, init?: RequestInit): Promise<Response>;
  json<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T>;
  /** Takes a guest identity, as the web client does on its first request. */
  authenticate(): Promise<void>;
  /**
   * Drops the cookie, so the next `authenticate` is a different person.
   *
   * The server is a module singleton and cannot be listened on twice, so this
   * is how a test checks that one identity cannot read another's records.
   */
  forget(): void;
  stop(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const provider = createStubProvider();
  const mailer = createStubMailer();

  configure({
    sessions: createSessionStore(null),
    users: createUserStore(null),
    progress: createProgressStore(null),
    plans: createEntitlementStore(null),
    profiles: createProfileStore(null),
    contributions: createContributionStore(null),
    accounts: createAccountStore(null),
    mailer,
    limiter: new MemoryRateLimiter(),
    provider,
  });

  // Port 0 lets the OS choose, so the suite does not collide with a developer's
  // own server already holding 8787.
  await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;

  /**
   * One cookie jar per harness.
   *
   * The identity cookie is httpOnly and the entire authorisation model hangs
   * off it, so a test that could not carry it between calls could only reach
   * the handful of unauthenticated routes.
   */
  const jar = new Map<string, string>();

  const call = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (jar.size > 0) {
      headers.set(
        "Cookie",
        [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    }
    const response = await fetch(`${url}${path}`, { ...init, headers });
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(";")[0]!;
      const index = pair.indexOf("=");
      jar.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  };

  return {
    url,
    provider,
    mailer,
    call,
    async json(path, init) {
      const response = await call(path, init);
      return (await response.json()) as never;
    },
    async authenticate() {
      await call("/api/auth", post({}));
    },
    forget() {
      jar.clear();
    },
    async stop() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/** Posts JSON, which is what nearly every route here takes. */
export function post(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

/**
 * Runs an interview to completion and returns its id.
 *
 * The evaluation, history and progress routes all require a finished session,
 * so almost every test past the first needs this.
 */
export async function completeInterview(harness: Harness): Promise<string> {
  const started = await harness.json<{ sessionId: string }>(
    "/api/sessions",
    post({
      candidateName: "Mariana",
      targetRole: "Growth PM",
      companyName: "Nubank",
      interviewStage: "Behavioral",
    }),
  );

  harness.provider.reply("Thanks for your time. [INTERVIEW_COMPLETE]");
  await harness.call(
    `/api/sessions/${started.sessionId}/answers`,
    post({ answer: "I owned activation and cut approval time to under an hour." }),
  );
  await harness.call(`/api/sessions/${started.sessionId}/evaluation`, post({}));
  return started.sessionId;
}
