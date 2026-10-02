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
  /**
   * Run the interview in Spanish or Portuguese rather than English.
   *
   * Deliberately not the interface language, which is a different setting and
   * not something to charge for. This is what the interviewer speaks — free
   * rehearses the English interview the product is named for.
   */
  interviewLanguage: boolean;
  /**
   * Interviews a week, or null for no limit.
   *
   * The free plan had no cap at all — only a rate limit of twelve starts an
   * hour, which is 288 a day and about $14 of vendor spend per account. That
   * is not a paywall, it is an unbounded liability with a paywall next to it.
   *
   * It was three a month before this, chosen so the progress chart had enough
   * points to mean something. The window moved to a week because the product
   * is a habit: somebody preparing for interviews practises this week, not
   * once a quarter, and an allowance that renews monthly tells them to come
   * back in three weeks — which is the same as telling them not to.
   *
   * What it costs is real and worth stating. Five a week is about
   * twenty-two a month against the old three, so a free account now costs
   * roughly seven times what it did in vendor spend. That is the price of the
   * habit, and the subscription is what has to cover it.
   */
  weeklySessions: number | null;
  /**
   * Publish one finished report at a link anybody can open.
   *
   * Paid because of who it is for. A candidate sends this to a mentor, a
   * recruiter, or the friend who is also job-hunting, and what comes back is
   * the paid half of the report — the metrics and the next steps. Free
   * sharing would hand that away to a reader who never signed up, which is
   * the one thing the paywall exists to prevent.
   */
  shareReport: boolean;
  /**
   * Keep a list of real jobs, each holding its posting and its rehearsals.
   *
   * Paid for the same reason `targetCompany` is: this is the half of the
   * product that is about one specific interview on Thursday rather than
   * about practising English in general. The free plan rehearses; the paid
   * plan prepares.
   */
  trackApplications: boolean;
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
  interviewLanguage: false,
  weeklySessions: 5,
  shareReport: false,
  trackApplications: false,
};

const PREMIUM: Capabilities = {
  plan: "premium",
  targetCompany: true,
  choosePersona: true,
  candidateProfile: true,
  liveCoaching: true,
  advancedFeedback: true,
  historyLimit: 50,
  // Uncapped on purpose. Even a candidate running six a week costs about five
  // dollars across their whole subscription, so metering them would buy
  // nothing and would punish exactly the people getting the most out of it.
  weeklySessions: null,
  interviewLanguage: true,
  shareReport: true,
  trackApplications: true,
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

export interface PromoDefinition {
  code: string;
  /** How long the grant lasts, counted from the moment it is redeemed. */
  grantDays: number;
  /** How many people may use it. */
  cap: number;
  expiresAt: Date | null;
}

export type PromoResult =
  | { ok: true; until: Date }
  /**
   * Why it did not work, in the candidate's terms.
   *
   * "taken" and "full" are deliberately different answers: a person who used
   * a code already is told so, and one who arrived at a sold-out promotion is
   * told that rather than being left to think they typed it wrong. Neither
   * tells an attacker anything they did not already know by guessing the code
   * correctly, which is the only way to reach either message.
   */
  | { ok: false; reason: "unknown" | "expired" | "full" | "taken" };

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
   * Redeems an unclaimed early-access row for an account, resolving to when the
   * grant it created ends, or null when there was nothing to redeem. Called
   * when the address is confirmed, the first moment it is proven to be theirs.
   */
  redeemEarlyAccess(email: string, ownerId: string): Promise<Date | null>;
  /**
   * Defines a promotion code, leaving any count it already has alone.
   *
   * Called at boot from the environment, so restarting the service does not
   * hand back the seats already taken — which is the one thing that would
   * make a cap meaningless.
   */
  definePromo(code: PromoDefinition): Promise<void>;
  /**
   * Takes one seat of a promotion for this person.
   *
   * Resolves the end of the grant it created, or a reason it could not. The
   * reason is a value rather than an exception because every one of them is
   * something the candidate is told, and none of them is exceptional.
   */
  redeemPromo(code: string, ownerId: string): Promise<PromoResult>;
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
    if (!grant) return null;
    const until = new Date(grant.granted_until as Date);
    await this.grant(ownerId, "premium", "early-access", until);
    return until;
  }

  async definePromo(code: PromoDefinition): Promise<void> {
    // The count is left exactly as it was. Restarting the service must not
    // return a hundred seats that a hundred people are already holding.
    await this.pool.query(
      `INSERT INTO promo_codes (code, grant_days, cap, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
          SET grant_days = EXCLUDED.grant_days,
              cap = EXCLUDED.cap,
              expires_at = EXCLUDED.expires_at`,
      [code.code, code.grantDays, code.cap, code.expiresAt],
    );
  }

  async redeemPromo(code: string, ownerId: string): Promise<PromoResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      /**
       * The claim, and the only line in this feature that matters.
       *
       * One conditional UPDATE: the seat is taken by the statement that
       * increments the count, so a hundred people pressing at the same second
       * produce exactly a hundred winners. Reading the count and then writing
       * it is the shape that hands the hundredth seat to three people.
       */
      const { rows } = await client.query(
        `UPDATE promo_codes
            SET redeemed = redeemed + 1
          WHERE code = $1
            AND redeemed < cap
            AND (expires_at IS NULL OR expires_at > now())
        RETURNING grant_days`,
        [code],
      );
      const claimed = rows[0];
      if (!claimed) {
        await client.query("ROLLBACK");
        /**
         * Asked on the same connection, not from the pool.
         *
         * Reaching for a second connection while still holding this one is
         * how a promotion deadlocks itself: every loser waits for a free
         * connection, and the connections are all held by losers. Forty
         * people pressing at once found it immediately — which is the load
         * this feature exists for.
         */
        const { rows: found } = await client.query(
          `SELECT redeemed >= cap AS full,
                  (expires_at IS NOT NULL AND expires_at <= now()) AS expired
             FROM promo_codes WHERE code = $1`,
          [code],
        );
        const known = found[0];
        if (!known) return { ok: false, reason: "unknown" };
        if (known.expired) return { ok: false, reason: "expired" };
        return { ok: false, reason: "full" };
      }

      /**
       * And the seat is theirs, once.
       *
       * The composite key does the work: a second attempt by the same person
       * conflicts, which rolls the whole transaction back and returns the
       * seat that the UPDATE above had just taken.
       */
      const taken = await client.query(
        `INSERT INTO promo_redemptions (code, owner_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING RETURNING owner_id`,
        [code, ownerId],
      );
      if (taken.rowCount === 0) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "taken" };
      }

      const until = new Date(Date.now() + Number(claimed.grant_days) * 24 * 60 * 60 * 1000);
      await client.query(
        `INSERT INTO entitlements (owner_id, plan, source, expires_at)
         VALUES ($1, 'premium', $2, $3)`,
        [ownerId, `promo:${code}`, until],
      );
      await client.query("COMMIT");
      return { ok: true, until };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
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
  private readonly promos = new Map<string, PromoDefinition & { redeemed: number }>();
  private readonly redemptions = new Map<string, Set<string>>();

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

  async definePromo(code: PromoDefinition): Promise<void> {
    const held = this.promos.get(code.code);
    // Same rule as the real store: redefining a code never returns its seats.
    this.promos.set(code.code, { ...code, redeemed: held?.redeemed ?? 0 });
  }

  async redeemPromo(code: string, ownerId: string): Promise<PromoResult> {
    const promo = this.promos.get(code);
    if (!promo) return { ok: false, reason: "unknown" };
    if (promo.expiresAt && promo.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" };
    }
    const already = this.redemptions.get(code) ?? new Set<string>();
    if (already.has(ownerId)) return { ok: false, reason: "taken" };
    if (promo.redeemed >= promo.cap) return { ok: false, reason: "full" };

    promo.redeemed += 1;
    already.add(ownerId);
    this.redemptions.set(code, already);
    const until = new Date(Date.now() + promo.grantDays * 24 * 60 * 60 * 1000);
    await this.grant(ownerId, "premium", `promo:${code}`, until);
    return { ok: true, until };
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
    if (!held || held.redeemed || held.grantedUntil.getTime() <= Date.now()) return null;
    held.redeemed = true;
    await this.grant(ownerId, "premium", "early-access", held.grantedUntil);
    return held.grantedUntil;
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

let warnedAboutClose: string | null = null;

/**
 * When the early-access offer stops taking new addresses, or null when it has
 * no end.
 *
 * The landing page counts down to this moment, and a countdown is only honest
 * if the server enforces the same moment: past it, `/api/early-access` refuses
 * to record anyone. Read on every call rather than once at boot, so moving the
 * date is a configuration change and tests can set it.
 *
 * An unreadable value counts as no date rather than as closed. A typo that
 * silently shut the offer on launch day would be worse than one that leaves it
 * open, and the warning in the log says which happened.
 */
export function earlyAccessClosesAt(env: NodeJS.ProcessEnv = process.env): Date | null {
  const raw = env.REALSESSIONS_EARLY_ACCESS_CLOSES_AT?.trim();
  if (!raw) return null;
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) {
    if (warnedAboutClose !== raw) {
      warnedAboutClose = raw;
      console.warn(
        `[mockio] REALSESSIONS_EARLY_ACCESS_CLOSES_AT is not a date (${JSON.stringify(raw)}); early access stays open.`,
      );
    }
    return null;
  }
  return at;
}

/** Whether early access still takes new addresses at `now`. */
export function earlyAccessOpen(
  now = new Date(),
  closesAt: Date | null = earlyAccessClosesAt(),
): boolean {
  return closesAt === null || now.getTime() < closesAt.getTime();
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

/**
 * The promotion codes this deployment offers, read from the environment.
 *
 * `REALSESSIONS_PROMO_CODES="EARLY100:30:100"` — code, days granted, seats.
 * A fourth field sets an end date: `LAUNCH:14:50:2026-12-31`.
 *
 * In the environment rather than a database row somebody inserts by hand,
 * for the reason the reviewer and forever lists are: creating a code is a
 * decision about money, and a decision about money should not be something
 * anything with a database connection can make for itself. The counter still
 * lives in the table, because it has to survive a restart.
 *
 * A malformed entry is skipped and logged rather than crashing the boot. A
 * typo in a promotion is not worth taking the product down for, and the
 * absence of the code is a loud enough symptom.
 */
export function promoCodesFromEnv(raw = process.env.REALSESSIONS_PROMO_CODES): PromoDefinition[] {
  const out: PromoDefinition[] = [];
  for (const entry of (raw ?? "").split(",")) {
    const text = entry.trim();
    if (text === "") continue;
    const [code, days, cap, until] = text.split(":").map((part) => part.trim());
    const grantDays = Number(days);
    const seats = Number(cap);
    if (
      !code ||
      !Number.isInteger(grantDays) ||
      grantDays <= 0 ||
      !Number.isInteger(seats) ||
      seats <= 0
    ) {
      console.error(`[mockio] ignoring malformed promo code: ${text}`);
      continue;
    }
    const expiresAt = until ? new Date(until) : null;
    out.push({
      code: code.toUpperCase(),
      grantDays,
      cap: seats,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    });
  }
  return out;
}

/** Normalises what somebody typed into what the table stores. */
export function normalisePromoCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}
