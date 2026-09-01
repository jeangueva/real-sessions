/**
 * Email + password accounts.
 *
 * Chosen because it is the only method fully testable here: magic links need
 * an email provider and OAuth needs registered credentials, neither of which
 * this deployment has. The store interface is deliberately narrow so either
 * can be added beside it later rather than replacing it.
 *
 * Password handling uses scrypt from Node's crypto — memory-hard, no
 * dependency, and the parameters are stored with each hash so they can be
 * raised later without invalidating existing passwords.
 */
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { RedisClientType } from "redis";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** OWASP-recommended floor for scrypt at time of writing. */
const SCRYPT = { N: 2 ** 15, r: 8, p: 1 } as const;
/**
 * scrypt needs roughly `128 * N * r` bytes — 32MB at these parameters, which
 * is exactly Node's default ceiling, and the check is strictly greater-than.
 * Without raising it every hash fails with "memory limit exceeded", so every
 * sign-up would break at the OWASP-recommended cost.
 */
const MAX_MEM = 128 * SCRYPT.N * SCRYPT.r * 2;
const KEY_LENGTH = 32;

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /**
   * When the password last changed. Sessions issued before this are refused,
   * so resetting a password signs out whoever else was holding a cookie —
   * which is the entire point of resetting it after a compromise.
   */
  passwordChangedAt?: string;
  /** Set once the address has been proven reachable by its owner. */
  emailVerifiedAt?: string;
}

export interface AccountStore {
  readonly kind: "redis" | "memory";
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  /** Returns null when the email is already taken. */
  create(email: string, passwordHash: string): Promise<Account | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  markEmailVerified(id: string): Promise<void>;
  /**
   * Stores a one-shot token *hashed*. A store dump then yields nothing usable —
   * plaintext tokens are as good as passwords to an attacker.
   */
  putToken(
    purpose: TokenPurpose,
    tokenHash: string,
    accountId: string,
    ttlSeconds: number,
  ): Promise<void>;
  /** Reads and deletes in one step, so a link cannot be used twice. */
  consumeToken(purpose: TokenPurpose, tokenHash: string): Promise<string | null>;
}

export type TokenPurpose = "reset" | "verify";

/**
 * Serialized as `scrypt$N$r$p$salt$hash`. The parameters travel with the hash
 * so raising them later still verifies passwords stored under the old cost.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    ...SCRYPT,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltRaw, hashRaw] = parts as [
    string, string, string, string, string, string,
  ];
  const options = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Object.values(options).every(Number.isFinite)) return false;
  // Sized from the stored parameters, so a hash written at a lower cost still
  // verifies after the cost is raised.
  const maxmem = Math.max(128 * options.N * options.r * 2, MAX_MEM);

  const expected = Buffer.from(hashRaw, "base64url");
  let derived: Buffer;
  try {
    derived = await scryptAsync(
      password,
      Buffer.from(saltRaw, "base64url"),
      expected.length,
      { ...options, maxmem },
    );
  } catch {
    return false;
  }

  // Length is checked first: timingSafeEqual throws on a mismatch, and the
  // throw itself would be an observable signal.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/** Lowercased and trimmed, so `A@b.com ` and `a@b.com` are one account. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  // Deliberately permissive: the only authority on whether an address works is
  // sending to it. This rejects the obviously malformed, nothing more.
  if (email.length < 3 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export interface PasswordProblem {
  ok: false;
  reason: string;
}

export function checkPassword(value: unknown): { ok: true } | PasswordProblem {
  if (typeof value !== "string") {
    return { ok: false, reason: "Password is required." };
  }
  // Length beats composition rules: a 12-character passphrase resists guessing
  // better than an 8-character one with a symbol bolted on.
  if (value.length < 12) {
    return { ok: false, reason: "Use at least 12 characters." };
  }
  if (value.length > 200) {
    return { ok: false, reason: "That password is too long." };
  }
  return { ok: true };
}

const accountKey = (id: string) => `rs:account:${id}`;
const emailKey = (email: string) => `rs:account-email:${email}`;
const tokenKey = (purpose: TokenPurpose, tokenHash: string) =>
  `rs:${purpose}:${tokenHash}`;

/** Reset links live 30 minutes: long enough to find the mail, short enough. */
export const RESET_TTL_SECONDS = 30 * 60;
/**
 * Verification links live a day. Longer than a reset because the risk is
 * lower — a stale verification link proves an address, it does not grant a
 * password change — and people open sign-up mail late.
 */
export const VERIFY_TTL_SECONDS = 24 * 60 * 60;

export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token) };
}

/**
 * Plain SHA-256, not scrypt. The token is 256 bits of randomness, so there is
 * no dictionary to slow down — only a fast one-way mapping is needed.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

class RedisAccountStore implements AccountStore {
  readonly kind = "redis" as const;
  constructor(private readonly client: RedisClientType) {}

  async findByEmail(email: string): Promise<Account | null> {
    const id = await this.client.get(emailKey(email));
    return id ? this.findById(id) : null;
  }

  async findById(id: string): Promise<Account | null> {
    const raw = await this.client.get(accountKey(id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Account;
    } catch {
      return null;
    }
  }

  async create(email: string, passwordHash: string): Promise<Account | null> {
    const account: Account = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // NX makes the email claim atomic: two simultaneous signups for the same
    // address cannot both succeed and leave one account unreachable.
    const claimed = await this.client.set(emailKey(email), account.id, { NX: true });
    if (claimed !== "OK") return null;

    await this.client.set(accountKey(account.id), JSON.stringify(account));
    return account;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const account = await this.findById(id);
    if (!account) return;
    await this.client.set(
      accountKey(id),
      JSON.stringify({
        ...account,
        passwordHash,
        passwordChangedAt: new Date().toISOString(),
      }),
    );
  }

  async markEmailVerified(id: string): Promise<void> {
    const account = await this.findById(id);
    if (!account || account.emailVerifiedAt) return;
    await this.client.set(
      accountKey(id),
      JSON.stringify({ ...account, emailVerifiedAt: new Date().toISOString() }),
    );
  }

  async putToken(
    purpose: TokenPurpose,
    tokenHash: string,
    accountId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(tokenKey(purpose, tokenHash), accountId, {
      expiration: { type: "EX", value: ttlSeconds },
    });
  }

  async consumeToken(
    purpose: TokenPurpose,
    tokenHash: string,
  ): Promise<string | null> {
    // GETDEL is atomic: two requests racing on the same link cannot both win.
    const accountId = await this.client.getDel(tokenKey(purpose, tokenHash));
    return accountId ?? null;
  }
}

class MemoryAccountStore implements AccountStore {
  readonly kind = "memory" as const;
  private readonly byId = new Map<string, Account>();
  private readonly byEmail = new Map<string, string>();

  async findByEmail(email: string): Promise<Account | null> {
    const id = this.byEmail.get(email);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async findById(id: string): Promise<Account | null> {
    return this.byId.get(id) ?? null;
  }

  async create(email: string, passwordHash: string): Promise<Account | null> {
    if (this.byEmail.has(email)) return null;
    const account: Account = {
      id: randomUUID(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.byEmail.set(email, account.id);
    this.byId.set(account.id, account);
    return account;
  }

  private readonly tokens = new Map<string, { accountId: string; expiresAt: number }>();

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const account = this.byId.get(id);
    if (!account) return;
    this.byId.set(id, {
      ...account,
      passwordHash,
      passwordChangedAt: new Date().toISOString(),
    });
  }

  async markEmailVerified(id: string): Promise<void> {
    const account = this.byId.get(id);
    if (!account || account.emailVerifiedAt) return;
    this.byId.set(id, { ...account, emailVerifiedAt: new Date().toISOString() });
  }

  async putToken(
    purpose: TokenPurpose,
    tokenHash: string,
    accountId: string,
    ttlSeconds: number,
  ): Promise<void> {
    this.tokens.set(`${purpose}:${tokenHash}`, {
      accountId,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async consumeToken(
    purpose: TokenPurpose,
    tokenHash: string,
  ): Promise<string | null> {
    const key = `${purpose}:${tokenHash}`;
    const entry = this.tokens.get(key);
    this.tokens.delete(key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.accountId;
  }
}

export function createAccountStore(client: RedisClientType | null): AccountStore {
  return client ? new RedisAccountStore(client) : new MemoryAccountStore();
}
