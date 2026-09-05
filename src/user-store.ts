/**
 * Per-identity preferences.
 *
 * This used to hold finished interviews as well. It no longer does: sessions,
 * their transcripts, metrics and scores live in the progress store, which is
 * the only place they are written. Two stores answering "what interviews have
 * I done" would diverge, and the one with a ninety-day TTL would be the one
 * quietly losing rows.
 *
 * What is left is genuinely a cache-shaped thing — the defaults a returning
 * candidate expects their setup screen to remember. Losing it costs two clicks,
 * which is why Redis with a TTL is still the right home for it.
 */
import type { RedisClientType } from "redis";

export interface Preferences {
  /**
   * What the interviewer calls you.
   *
   * Empty means "we do not know yet" — the server guesses from the account's
   * email address and the interviewer is told to skip the name rather than
   * invent one. It was a hardcoded "Mariana" until someone signed up and got
   * greeted as a stranger.
   */
  candidateName: string;
  defaultRole: string;
  defaultCompany: string;
  interviewLength: number;
  /** Preselected sector on the setup screen. Empty means "show everything". */
  defaultSector: string;
  /** Whether new sessions start with live coaching on. */
  defaultMode: "practice" | "real";
}

export const DEFAULT_PREFERENCES: Preferences = {
  candidateName: "",
  defaultRole: "Senior Product Designer",
  defaultCompany: "Stripe",
  interviewLength: 7,
  defaultSector: "",
  defaultMode: "practice",
};

export interface UserStore {
  readonly kind: "redis" | "memory";
  getPreferences(ownerId: string): Promise<Preferences>;
  setPreferences(ownerId: string, next: Preferences): Promise<void>;
  /**
   * Carries a guest's settings onto an account on sign-up, so creating one
   * does not reset the setup screen they just configured.
   */
  transfer(fromOwnerId: string, toOwnerId: string): Promise<number>;
  eraseOwner(ownerId: string): Promise<void>;
}

/** Ninety days: long enough to be useful, short enough to not hoard. */
const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const prefsKey = (owner: string) => `rs:prefs:${owner}`;

/** Merges over defaults so a record written before a new field exists is safe. */
function withDefaults(raw: string | null): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

class RedisUserStore implements UserStore {
  readonly kind = "redis" as const;
  constructor(private readonly client: RedisClientType) {}

  async getPreferences(ownerId: string): Promise<Preferences> {
    return withDefaults(await this.client.get(prefsKey(ownerId)));
  }

  async setPreferences(ownerId: string, next: Preferences): Promise<void> {
    await this.client.set(prefsKey(ownerId), JSON.stringify(next), {
      expiration: { type: "EX", value: RETENTION_SECONDS },
    });
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    const incoming = await this.client.get(prefsKey(fromOwnerId));
    if (!incoming) return 0;
    // Settings the account already has win: they are the more deliberate
    // choice, made while signed in.
    const existing = await this.client.get(prefsKey(toOwnerId));
    if (!existing) await this.setPreferences(toOwnerId, withDefaults(incoming));
    await this.client.del(prefsKey(fromOwnerId));
    return 1;
  }

  async eraseOwner(ownerId: string): Promise<void> {
    await this.client.del(prefsKey(ownerId));
  }
}

class MemoryUserStore implements UserStore {
  readonly kind = "memory" as const;
  private readonly prefs = new Map<string, Preferences>();

  async getPreferences(ownerId: string): Promise<Preferences> {
    return { ...DEFAULT_PREFERENCES, ...(this.prefs.get(ownerId) ?? {}) };
  }

  async setPreferences(ownerId: string, next: Preferences): Promise<void> {
    this.prefs.set(ownerId, next);
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    const incoming = this.prefs.get(fromOwnerId);
    if (!incoming) return 0;
    if (!this.prefs.has(toOwnerId)) this.prefs.set(toOwnerId, incoming);
    this.prefs.delete(fromOwnerId);
    return 1;
  }

  async eraseOwner(ownerId: string): Promise<void> {
    this.prefs.delete(ownerId);
  }
}

export function createUserStore(client: RedisClientType | null): UserStore {
  return client ? new RedisUserStore(client) : new MemoryUserStore();
}

/** Validates and clamps a preferences payload from the client. */
/**
 * A first name guessed from an email address.
 *
 * "jean.perez@work.com" is Jean. Initials and digits are rejected, because no
 * greeting should ever use them.
 *
 * What this cannot do is tell "jperez" from "ana" — they are the same shape,
 * and it will happily greet someone as Jperez. That is why the name field in
 * settings exists and always wins over this: the guess is a decent opening
 * default, not a substitute for asking.
 */
export function nameFromEmail(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  // Letters only, and long enough to be a name rather than an initial.
  if (!/^[a-zA-ZÀ-ÿ]{3,}$/.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function readPreferences(body: Record<string, unknown>): Preferences {
  const text = (key: string, max: number): string =>
    typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";

  const rawLength = Number(body["interviewLength"]);

  return {
    // Length bounds mirror the prompt's structure section; anything outside it
    // produces an interview the prompt was not written for.
    interviewLength: Number.isFinite(rawLength)
      ? Math.min(7, Math.max(5, Math.round(rawLength)))
      : DEFAULT_PREFERENCES.interviewLength,
    // Empty is meaningful: it means nobody has said, and the server falls
    // back to the account rather than to a name we made up.
    candidateName: text("candidateName", 60),
    defaultRole: text("defaultRole", 120) || DEFAULT_PREFERENCES.defaultRole,
    defaultCompany: text("defaultCompany", 80) || DEFAULT_PREFERENCES.defaultCompany,
    // Empty is meaningful here — it is "no sector filter" — so it is not
    // replaced by the default the way a blank role would be.
    defaultSector: text("defaultSector", 40),
    defaultMode: body["defaultMode"] === "real" ? "real" : "practice",
  };
}
