/**
 * Storage for scheduled mail: the job ledger, the opt-outs, and who is due.
 *
 * Null-pool safe like every other store here. Without Postgres there is no
 * durable history to summarise and no way to claim a job exactly once, so the
 * no-database implementation claims nothing and finds nobody — the scheduler
 * then has no work, which is the correct behaviour for a deployment that
 * cannot support it rather than an error at boot.
 */
import type { DbPool } from "./db/index.js";
import { INACTIVE_DAYS, type LifecycleKind } from "./lifecycle.js";

/**
 * Candidates are identified by owner, not by address.
 *
 * Sessions live in Postgres and accounts live in Redis, so there is no join
 * that answers "which addresses are lapsed" — the first draft of this file
 * wrote one against an `accounts` table that does not exist. The database
 * answers the part it knows, the caller resolves the address, and the
 * address-keyed checks happen after that.
 */
export interface Candidate {
  ownerId: string;
}

export interface DigestRow extends Candidate {
  sessions: number;
  bestScore: number | null;
  xp: number;
}

export interface LifecycleStore {
  /**
   * Takes the job if it is due, returning false if someone else has it.
   *
   * One statement, so the check and the claim cannot interleave. A second web
   * instance running the same timer loses the race and does nothing, which is
   * what keeps a scaled deployment from mailing everyone twice.
   */
  claim(job: string, everyMs: number): Promise<boolean>;
  optOut(email: string): Promise<void>;
  hasOptedOut(email: string): Promise<boolean>;
  /** Owners whose last interview was over a fortnight ago. */
  lapsedOwners(limit: number): Promise<Candidate[]>;
  /** Owners with something to report from the last seven days. */
  activeOwners(limit: number): Promise<DigestRow[]>;
  /** Whether this address already had this kind of mail inside `days`. */
  sentRecently(email: string, kind: LifecycleKind, days: number): Promise<boolean>;
  markSent(email: string, kind: LifecycleKind): Promise<void>;
}

class PostgresLifecycleStore implements LifecycleStore {
  constructor(private readonly pool: DbPool) {}

  async claim(job: string, everyMs: number): Promise<boolean> {
    const seconds = Math.max(1, Math.round(everyMs / 1000));
    // The insert covers the first ever run; the conflict clause is the claim.
    const { rows } = await this.pool.query(
      `INSERT INTO job_runs (job, last_run_at) VALUES ($1, now())
       ON CONFLICT (job) DO UPDATE SET last_run_at = now()
         WHERE job_runs.last_run_at IS NULL
            OR job_runs.last_run_at < now() - ($2 || ' seconds')::interval
       RETURNING job`,
      [job, String(seconds)],
    );
    return rows.length > 0;
  }

  async optOut(email: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_optouts (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email],
    );
  }

  async hasOptedOut(email: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM email_optouts WHERE email = $1`,
      [email],
    );
    return rows.length > 0;
  }

  /**
   * An owner who has practised at least once and not for a fortnight.
   *
   * The first half matters: an account that never started an interview is not
   * lapsed, it never began, and "we miss you" to someone who has not used the
   * product once reads as a mailing list rather than a reminder.
   */
  async lapsedOwners(limit: number): Promise<Candidate[]> {
    const { rows } = await this.pool.query(
      `SELECT owner_id AS "ownerId"
         FROM sessions
        GROUP BY owner_id
       HAVING MAX(started_at) < now() - ($1 || ' days')::interval
        LIMIT $2`,
      [String(INACTIVE_DAYS), limit],
    );
    return rows as Candidate[];
  }

  async activeOwners(limit: number): Promise<DigestRow[]> {
    const { rows } = await this.pool.query(
      `SELECT s.owner_id AS "ownerId",
              COUNT(*)::int AS sessions,
              MAX(s.score)::int AS "bestScore",
              COALESCE((SELECT SUM(x.amount)::int FROM xp_events x
                         WHERE x.owner_id = s.owner_id
                           AND x.created_at > now() - interval '7 days'), 0) AS xp
         FROM sessions s
        WHERE s.started_at > now() - interval '7 days'
        GROUP BY s.owner_id
        LIMIT $1`,
      [limit],
    );
    return rows as DigestRow[];
  }

  async sentRecently(email: string, kind: LifecycleKind, days: number): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM lifecycle_sends
        WHERE email = $1 AND kind = $2
          AND sent_at > now() - ($3 || ' days')::interval`,
      [email, kind, String(days)],
    );
    return rows.length > 0;
  }

  async markSent(email: string, kind: LifecycleKind): Promise<void> {
    await this.pool.query(
      `INSERT INTO lifecycle_sends (email, kind) VALUES ($1, $2)
       ON CONFLICT (email, kind) DO UPDATE SET sent_at = now()`,
      [email, kind],
    );
  }
}

/** Without a database there is nothing to schedule against. */
class InertLifecycleStore implements LifecycleStore {
  private readonly out = new Set<string>();
  async claim(): Promise<boolean> {
    return false;
  }
  async optOut(email: string): Promise<void> {
    this.out.add(email);
  }
  async hasOptedOut(email: string): Promise<boolean> {
    return this.out.has(email);
  }
  async lapsedOwners(): Promise<Candidate[]> {
    return [];
  }
  async activeOwners(): Promise<DigestRow[]> {
    return [];
  }
  async sentRecently(): Promise<boolean> {
    return true;
  }
  async markSent(): Promise<void> {}
}

export function createLifecycleStore(pool: DbPool | null): LifecycleStore {
  return pool ? new PostgresLifecycleStore(pool) : new InertLifecycleStore();
}
