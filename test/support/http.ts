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
import {
  createProgressStore,
  type ProgressStore,
} from "../../src/progress-store.js";
import {
  createEntitlementStore,
  type EntitlementStore,
} from "../../src/entitlements.js";
import { createProfileStore } from "../../src/profile.js";
import {
  createContributionStore,
  type ContributionStore,
} from "../../src/contributions.js";
import { createSubscriptionStore } from "../../src/billing/store.js";
import { createAccountStore } from "../../src/accounts.js";
import { MemoryRateLimiter } from "../../src/rate-limit.js";
import type { EmailMessage, EmailSender } from "../../src/email.js";
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

export interface StubMailer extends EmailSender {
  readonly sent: EmailMessage[];
  /**
   * The token from the most recent link sent to an address.
   *
   * Reset and confirmation both work by mailing a single-use token, so a test
   * that cannot read the mail cannot exercise either flow — and those are the
   * account-recovery paths, which is where the security actually lives.
   */
  tokenFor(email: string): string | null;
}

/** Records what would have been sent, so the email routes are assertable. */
export function createStubMailer(): StubMailer {
  const sent: EmailMessage[] = [];
  return {
    kind: "stub",
    sent,
    async send(message) {
      sent.push(message);
    },
    tokenFor(email) {
      const message = [...sent].reverse().find((entry) => entry.to === email);
      return message?.text.match(/token=([A-Za-z0-9._-]+)/)?.[1] ?? null;
    },
  };
}

export interface Harness {
  url: string;
  provider: StubProvider;
  /**
   * Makes every progress read and write throw, standing in for a database
   * that has gone away mid-request.
   */
  breakProgress(): void;
  /**
   * The contribution store, for arranging state the API gates behind a
   * reviewer account — a different concern from the route under test.
   */
  contributions: ContributionStore;
  /** The entitlement store, for putting a test identity on the paid plan. */
  plans: EntitlementStore;
  /** Puts the current identity on premium. Requires an identity already. */
  makePremium(): Promise<void>;
  mailer: StubMailer;
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
  /**
   * The current cookie header, to replay later.
   *
   * Used to prove that a password reset actually invalidates a session held by
   * someone else — the thing a reset exists to do.
   */
  stealCookie(): string;
  stop(): Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const provider = createStubProvider();
  const mailer = createStubMailer();
  const contributions = createContributionStore(null);
  const plans = createEntitlementStore(null);

  // Wrapped so a test can pull the database out from under a request.
  const realProgress = createProgressStore(null);
  let progressBroken = false;
  const progress = new Proxy(realProgress, {
    get(target, key) {
      const value = Reflect.get(target, key);
      if (typeof value !== "function" || key === "kind") return value;
      return (...args: unknown[]) =>
        progressBroken
          ? Promise.reject(new Error("database is gone"))
          : (value as (...a: unknown[]) => unknown).apply(target, args);
    },
  }) as ProgressStore;

  configure({
    sessions: createSessionStore(null),
    users: createUserStore(null),
    progress,
    plans,
    profiles: createProfileStore(null),
    contributions,
    subscriptions: createSubscriptionStore(null),
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
    // A caller who supplied their own Cookie wins — that is how a test replays
    // an old session to prove it was invalidated. Overwriting it here made the
    // request carry the current identity instead, and the assertion passed for
    // the wrong reason.
    if (jar.size > 0 && !headers.has("Cookie")) {
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
    contributions,
    plans,
    call,
    async json(path, init) {
      const response = await call(path, init);
      return (await response.json()) as never;
    },
    async authenticate() {
      await call("/api/auth", post({}));
    },
    async makePremium() {
      // The identity id is not exposed to the client, so this reads it back
      // out of the cookie the server just set.
      const cookie = jar.get("rs_id") ?? "";
      const id = cookie.split(".")[1];
      if (id) await plans.grant(id, "premium", "test", null);
    },
    forget() {
      jar.clear();
    },
    breakProgress() {
      progressBroken = true;
    },
    stealCookie() {
      return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
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
