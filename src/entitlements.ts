/**
 * Who can do what.
 *
 * Two plans. Free is a real product — a general interview for a role, with a
 * score and the headline feedback — because a trial that cannot show what the
 * thing does converts nobody. Premium is the version that knows *you*: a
 * specific company and sector, your CV in the interviewer's hands, live
 * coaching, and the history that makes progress visible.
 *
 * The split is drawn along "does this need to know who you are". That is why
 * the CV, the company picker and the trend chart are all on the same side of
 * it, and why the free tier keeps the honest score rather than a crippled one.
 *
 * Every gate is enforced on the server. The UI hides what you cannot use, but
 * hiding a button is a courtesy, not a control — a client can always send the
 * request anyway.
 */
import { createHash } from "node:crypto";
import process from "node:process";
import type { DbPool } from "./db/index.js";

export type Plan = "free" | "premium";

/** Months of premium an early-access sign-up is worth. */
export const EARLY_ACCESS_MONTHS = 6;

export interface Capabilities {
  plan: Plan;
  /** Choose a specific company and sector rather than a generic interview. */
  targetCompany: boolean;
  /** Pick the interviewer archetype instead of taking the default. */
  choosePersona: boolean;
  /** Upload a CV or portfolio for the interviewer to draw on. */
  candidateProfile: boolean;
  /** Live coaching notes beside the transcript. */
  liveCoaching: boolean;
  /** The measured metrics panel and the actionable next steps. */
  advancedFeedback: boolean;
  /** Sessions kept in history and plotted. Free keeps the most recent few. */
  historyLimit: number;
}

const FREE: Capabilities = {
  plan: "free",
  targetCompany: false,
  choosePersona: false,
  candidateProfile: false,
  liveCoaching: false,
  advancedFeedback: false,
  // Not zero. One session with nothing to compare it against is the reason to
  // upgrade; zero is just a broken screen.
  historyLimit: 3,
};

const PREMIUM: Capabilities = {
  plan: "premium",
  targetCompany: true,
  choosePersona: true,
  candidateProfile: true,
  liveCoaching: true,
  advancedFeedback: true,
  historyLimit: 50,
};

export function capabilitiesFor(plan: Plan): Capabilities {
  return plan === "premium" ? PREMIUM : FREE;
}

/**
 * What a free session runs against: a role, not an employer.
 *
 * All three are fixed constants rather than defaults the client can override.
 * Gating the company name alone left `industry` and `companyCulture` readable
 * from the request — for a company outside the catalogue they legitimately are
 * — so a free caller could send `industry: "Fintech"` and get exactly the
 * sector-grounded interview the picker is meant to sell.
 */
export const GENERIC_COMPANY = "a well-regarded technology company";
export const GENERIC_CULTURE = "High standards, clear communication, ownership";
export const GENERIC_INDUSTRY = "Technology";

export interface EntitlementStore {
  planFor(ownerId: string): Promise<Plan>;
  grant(
    ownerId: string,
    plan: Plan,
    source: string,
    expiresAt: Date | null,
  ): Promise<void>;
  /** Records a landing-page sign-up. Returns false if already registered. */
  recordEarlyAccess(
    email: string,
    role: string,
    company: string,
    grantedUntil: Date,
  ): Promise<boolean>;
  /**
   * Redeems an unclaimed early-access row for an account. Called on sign-up,
   * which is the first moment an email and an identity are known together.
   */
  redeemEarlyAccess(email: string, ownerId: string): Promise<boolean>;
  /**
   * Ends every unexpired grant from one source.
   *
   * Used when a subscription lapses. It expires the grants rather than
   * deleting them, so the log still shows that access was held and when it
   * stopped — deleting the row would make a refund dispute unanswerable.
   */
  revoke(ownerId: string, source: string): Promise<void>;
  transfer(fromOwnerId: string, toOwnerId: string): Promise<void>;
  /** Erases every grant. Used when an account is deleted. */
  eraseOwner(ownerId: string): Promise<void>;
}

class PostgresEntitlementStore implements EntitlementStore {
  constructor(private readonly pool: DbPool) {}

  async planFor(ownerId: string): Promise<Plan> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM entitlements
        WHERE owner_id = $1 AND plan = 'premium'
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1`,
      [ownerId],
    );
    return rows.length > 0 ? "premium" : "free";
  }

  async grant(ownerId: string, plan: Plan, source: string, expiresAt: Date | null) {
    await this.pool.query(
      `INSERT INTO entitlements (owner_id, plan, source, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [ownerId, plan, source, expiresAt],
    );
  }

  async recordEarlyAccess(email: string, role: string, company: string, grantedUntil: Date) {
    const { rowCount } = await this.pool.query(
      `INSERT INTO early_access (email, role, company, granted_until)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [email, role.slice(0, 120), company.slice(0, 120), grantedUntil],
    );
    return (rowCount ?? 0) > 0;
  }

  async redeemEarlyAccess(email: string, ownerId: string) {
    const { rows } = await this.pool.query(
      `UPDATE early_access SET redeemed_at = now()
        WHERE email = $1 AND redeemed_at IS NULL AND granted_until > now()
        RETURNING granted_until`,
      [email],
    );
    const grant = rows[0];
    if (!grant) return false;
    await this.grant(ownerId, "premium", "early-access", grant.granted_until as Date);
    return true;
  }

  async revoke(ownerId: string, source: string) {
    await this.pool.query(
      `UPDATE entitlements SET expires_at = now()
        WHERE owner_id = $1 AND source = $2
          AND (expires_at IS NULL OR expires_at > now())`,
      [ownerId, source],
    );
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    await this.pool.query(
      `UPDATE entitlements SET owner_id = $2 WHERE owner_id = $1`,
      [fromOwnerId, toOwnerId],
    );
  }

  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM entitlements WHERE owner_id = $1`, [ownerId]);
  }
}

class MemoryEntitlementStore implements EntitlementStore {
  private readonly grants = new Map<
    string,
    { plan: Plan; source: string; expiresAt: Date | null }[]
  >();
  private readonly early = new Map<
    string,
    { grantedUntil: Date; redeemed: boolean }
  >();

  async planFor(ownerId: string): Promise<Plan> {
    const held = this.grants.get(ownerId) ?? [];
    const live = held.some(
      (grant) =>
        grant.plan === "premium" &&
        (grant.expiresAt === null || grant.expiresAt.getTime() > Date.now()),
    );
    return live ? "premium" : "free";
  }

  async grant(ownerId: string, plan: Plan, source: string, expiresAt: Date | null) {
    const held = this.grants.get(ownerId) ?? [];
    held.push({ plan, source, expiresAt });
    this.grants.set(ownerId, held);
  }

  async revoke(ownerId: string, source: string) {
    const now = new Date();
    for (const grant of this.grants.get(ownerId) ?? []) {
      if (grant.source !== source) continue;
      if (grant.expiresAt === null || grant.expiresAt.getTime() > now.getTime()) {
        grant.expiresAt = now;
      }
    }
  }

  async recordEarlyAccess(email: string, _role: string, _company: string, grantedUntil: Date) {
    if (this.early.has(email)) return false;
    this.early.set(email, { grantedUntil, redeemed: false });
    return true;
  }

  async redeemEarlyAccess(email: string, ownerId: string) {
    const held = this.early.get(email);
    if (!held || held.redeemed || held.grantedUntil.getTime() <= Date.now()) return false;
    held.redeemed = true;
    await this.grant(ownerId, "premium", "early-access", held.grantedUntil);
    return true;
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    const incoming = this.grants.get(fromOwnerId);
    if (!incoming) return;
    this.grants.set(toOwnerId, [...(this.grants.get(toOwnerId) ?? []), ...incoming]);
    this.grants.delete(fromOwnerId);
  }

  async eraseOwner(ownerId: string) {
    this.grants.delete(ownerId);
  }
}

export function createEntitlementStore(pool: DbPool | null): EntitlementStore {
  return pool ? new PostgresEntitlementStore(pool) : new MemoryEntitlementStore();
}

/** Six months from now, the early-access grant window. */
export function earlyAccessUntil(from = new Date()): Date {
  const until = new Date(from);
  until.setMonth(until.getMonth() + EARLY_ACCESS_MONTHS);
  return until;
}

/**
 * A one-way identifier for a contribution.
 *
 * Salted with the session secret and never stored alongside the identity, so
 * it supports rate-limiting and de-duplication without making a contribution
 * traceable back to a person. If the promise on the button says anonymous,
 * the column has to be unable to answer "who wrote this".
 */
export function contributorHash(ownerId: string): string {
  const salt = process.env.REALSESSIONS_SESSION_SECRET ?? "realsessions-dev-salt";
  return createHash("sha256").update(`${salt}:contrib:${ownerId}`).digest("hex");
}
