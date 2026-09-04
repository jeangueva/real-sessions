/**
 * Where interviews live between requests.
 *
 * A session is a conversation in progress, not a cache entry: losing one
 * throws away a candidate's interview mid-way. Redis is the default so that a
 * restart or a second instance does not do that. Memory remains for local work
 * where running Redis is friction, and it says so at startup rather than
 * pretending to be durable.
 */
import type { RedisClientType } from "redis";
import type { SessionSnapshot } from "./interviewer.js";
import type { SessionMode } from "./progress-store.js";
import type { InterviewContext } from "./types.js";

export interface StoredSession {
  snapshot: SessionSnapshot;
  context: InterviewContext;
  /** Owner. A session id alone must not grant access to someone else's interview. */
  ownerId: string;
  createdAt: number;
  /**
   * Practice or real. Held here rather than looked up per request because the
   * coach endpoint checks it on every turn, and because a session must run to
   * the end under the mode it started in — moving it mid-interview would make
   * the resulting progress record a lie.
   *
   * Optional: sessions written before this field existed are still in flight
   * when a deploy lands, and they read as practice.
   */
  mode?: SessionMode;
  /**
   * The rounds this interview covers, in order, by id.
   *
   * Held here because a combined session records its stage as a joined label
   * ("Behavioral + Values"), which no lookup resolves — the evaluator would
   * grade the whole thing as behavioural. Optional for the same reason `mode`
   * is: sessions written before this field existed are still in flight when a
   * deploy lands, and they read as whatever their single stage says.
   */
  stages?: string[];
}

export interface SessionStore {
  readonly kind: "redis" | "memory";
  get(id: string): Promise<StoredSession | null>;
  set(id: string, session: StoredSession): Promise<void>;
  delete(id: string): Promise<void>;
  close(): Promise<void>;
}

/** Abandoned interviews vastly outnumber finished ones. */
export const SESSION_TTL_SECONDS = 60 * 60;

const KEY_PREFIX = "rs:session:";

class RedisSessionStore implements SessionStore {
  readonly kind = "redis" as const;
  constructor(private readonly client: RedisClientType) {}

  async get(id: string): Promise<StoredSession | null> {
    const raw = await this.client.get(KEY_PREFIX + id);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      // A corrupt value is worse than a missing one — drop it rather than
      // failing every subsequent request for this session.
      await this.delete(id);
      return null;
    }
  }

  async set(id: string, session: StoredSession): Promise<void> {
    // Each write refreshes the TTL, so an active interview is never expired
    // out from under a candidate who is still answering.
    await this.client.set(KEY_PREFIX + id, JSON.stringify(session), {
      expiration: { type: "EX", value: SESSION_TTL_SECONDS },
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.del(KEY_PREFIX + id);
  }

  async close(): Promise<void> {
    // The connection is shared and closed centrally by closeRedis().
  }
}

class MemorySessionStore implements SessionStore {
  readonly kind = "memory" as const;
  private readonly sessions = new Map<string, StoredSession>();
  private readonly timer: NodeJS.Timeout;

  constructor() {
    // Redis expires keys for us; in memory we have to sweep.
    this.timer = setInterval(() => {
      const cutoff = Date.now() - SESSION_TTL_SECONDS * 1000;
      for (const [id, stored] of this.sessions) {
        if (stored.createdAt < cutoff) this.sessions.delete(id);
      }
    }, 10 * 60 * 1000);
    this.timer.unref();
  }

  async get(id: string): Promise<StoredSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async set(id: string, session: StoredSession): Promise<void> {
    this.sessions.set(id, session);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    this.sessions.clear();
  }
}

/**
 * Redis when it is available, memory otherwise. The decision of whether a
 * missing Redis is fatal lives in `getRedis()`, so both the store and the rate
 * limiter make it the same way.
 */
export function createSessionStore(client: RedisClientType | null): SessionStore {
  return client ? new RedisSessionStore(client) : new MemorySessionStore();
}
