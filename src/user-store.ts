/**
 * Per-identity records that outlive a single interview: completed sessions and
 * preferences.
 *
 * Separate from the session store on purpose. A session is a conversation in
 * flight with a one-hour TTL; these are the things a candidate expects to find
 * when they come back tomorrow.
 */
import type { RedisClientType } from "redis";
import type { Evaluation } from "./schema.js";

export interface CompletedSession {
  id: string;
  company: string;
  role: string;
  stage: string;
  /** ISO timestamp of when the evaluation finished. */
  completedAt: string;
  score: number;
  evaluation: Evaluation;
}

/** What the list view needs, without shipping every evaluation body. */
export type SessionSummary = Omit<CompletedSession, "evaluation">;

export interface Preferences {
  defaultRole: string;
  defaultCompany: string;
  interviewLength: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultRole: "Senior Product Designer",
  defaultCompany: "Stripe",
  interviewLength: 7,
};

export interface UserStore {
  readonly kind: "redis" | "memory";
  recordSession(ownerId: string, session: CompletedSession): Promise<void>;
  listSessions(ownerId: string): Promise<SessionSummary[]>;
  getSession(ownerId: string, id: string): Promise<CompletedSession | null>;
  getPreferences(ownerId: string): Promise<Preferences>;
  setPreferences(ownerId: string, next: Preferences): Promise<void>;
  /**
   * Moves a guest's records onto an account. Called on sign-up and on sign-in
   * from a browser that has practised anonymously — otherwise creating an
   * account discards the very history that motivated it.
   */
  transfer(fromOwnerId: string, toOwnerId: string): Promise<number>;
}

/** Ninety days: long enough to show progress, short enough to not hoard. */
const RETENTION_SECONDS = 90 * 24 * 60 * 60;
/** Cap per identity, so one caller cannot grow a list without bound. */
const MAX_SESSIONS = 50;

const historyKey = (owner: string) => `rs:history:${owner}`;
const prefsKey = (owner: string) => `rs:prefs:${owner}`;

/** Trims an evaluation off a record for the list view. */
function toSummary(session: CompletedSession): SessionSummary {
  const { evaluation: _evaluation, ...summary } = session;
  return summary;
}

class RedisUserStore implements UserStore {
  readonly kind = "redis" as const;
  constructor(private readonly client: RedisClientType) {}

  async recordSession(ownerId: string, session: CompletedSession): Promise<void> {
    const key = historyKey(ownerId);
    // Newest first, then trim — LPUSH + LTRIM is the standard capped list.
    await this.client.lPush(key, JSON.stringify(session));
    await this.client.lTrim(key, 0, MAX_SESSIONS - 1);
    await this.client.expire(key, RETENTION_SECONDS);
  }

  private async readAll(ownerId: string): Promise<CompletedSession[]> {
    const raw = await this.client.lRange(historyKey(ownerId), 0, MAX_SESSIONS - 1);
    const sessions: CompletedSession[] = [];
    for (const entry of raw) {
      try {
        sessions.push(JSON.parse(entry) as CompletedSession);
      } catch {
        // One corrupt record must not blank the whole history page.
      }
    }
    return sessions;
  }

  async listSessions(ownerId: string): Promise<SessionSummary[]> {
    return (await this.readAll(ownerId)).map(toSummary);
  }

  async getSession(ownerId: string, id: string): Promise<CompletedSession | null> {
    return (await this.readAll(ownerId)).find((s) => s.id === id) ?? null;
  }

  async getPreferences(ownerId: string): Promise<Preferences> {
    const raw = await this.client.get(prefsKey(ownerId));
    if (!raw) return { ...DEFAULT_PREFERENCES };
    try {
      // Merge over defaults so a record written before a new field exists
      // does not surface as undefined in the UI.
      return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  async setPreferences(ownerId: string, next: Preferences): Promise<void> {
    await this.client.set(prefsKey(ownerId), JSON.stringify(next), {
      expiration: { type: "EX", value: RETENTION_SECONDS },
    });
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    const incoming = await this.readAll(fromOwnerId);
    if (incoming.length === 0) return 0;

    const existing = await this.readAll(toOwnerId);
    // Merge newest-first across both, then rewrite the account's list.
    const merged = [...incoming, ...existing]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, MAX_SESSIONS);

    const key = historyKey(toOwnerId);
    await this.client.del(key);
    if (merged.length > 0) {
      // rPush preserves the newest-first order of `merged`.
      await this.client.rPush(key, merged.map((s) => JSON.stringify(s)));
      await this.client.expire(key, RETENTION_SECONDS);
    }
    await this.client.del(historyKey(fromOwnerId));
    return incoming.length;
  }
}

class MemoryUserStore implements UserStore {
  readonly kind = "memory" as const;
  private readonly history = new Map<string, CompletedSession[]>();
  private readonly prefs = new Map<string, Preferences>();

  async recordSession(ownerId: string, session: CompletedSession): Promise<void> {
    const list = this.history.get(ownerId) ?? [];
    list.unshift(session);
    this.history.set(ownerId, list.slice(0, MAX_SESSIONS));
  }

  async listSessions(ownerId: string): Promise<SessionSummary[]> {
    return (this.history.get(ownerId) ?? []).map(toSummary);
  }

  async getSession(ownerId: string, id: string): Promise<CompletedSession | null> {
    return (this.history.get(ownerId) ?? []).find((s) => s.id === id) ?? null;
  }

  async getPreferences(ownerId: string): Promise<Preferences> {
    return { ...DEFAULT_PREFERENCES, ...(this.prefs.get(ownerId) ?? {}) };
  }

  async setPreferences(ownerId: string, next: Preferences): Promise<void> {
    this.prefs.set(ownerId, next);
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    const incoming = this.history.get(fromOwnerId) ?? [];
    if (incoming.length === 0) return 0;
    const merged = [...incoming, ...(this.history.get(toOwnerId) ?? [])]
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, MAX_SESSIONS);
    this.history.set(toOwnerId, merged);
    this.history.delete(fromOwnerId);
    return incoming.length;
  }
}

export function createUserStore(client: RedisClientType | null): UserStore {
  return client ? new RedisUserStore(client) : new MemoryUserStore();
}

/** Validates and clamps a preferences payload from the client. */
export function readPreferences(body: Record<string, unknown>): Preferences {
  const role = typeof body["defaultRole"] === "string" ? body["defaultRole"].trim() : "";
  const company =
    typeof body["defaultCompany"] === "string" ? body["defaultCompany"].trim() : "";
  const rawLength = Number(body["interviewLength"]);

  return {
    // Length bounds mirror the prompt's structure section; anything outside it
    // produces an interview the prompt was not written for.
    interviewLength: Number.isFinite(rawLength)
      ? Math.min(7, Math.max(5, Math.round(rawLength)))
      : DEFAULT_PREFERENCES.interviewLength,
    defaultRole: role.slice(0, 120) || DEFAULT_PREFERENCES.defaultRole,
    defaultCompany: company.slice(0, 80) || DEFAULT_PREFERENCES.defaultCompany,
  };
}
