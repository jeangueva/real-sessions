/**
 * Questions people report having actually been asked.
 *
 * The interviewer's questions are generated, which makes them plausible rather
 * than real. This is how the gap closes: candidates who have sat the interview
 * report what they were asked, anonymously, per company.
 *
 * Nothing submitted here reaches an interview prompt. Every report lands as
 * `pending` and stays there until a human confirms it — the intended reviewers
 * are working recruiters and hiring managers who can say "yes, we ask that".
 * Feeding unverified crowd input straight into the prompt would let anyone
 * shape what the product asks, and would launder a rumour into an authoritative
 * question. The review side is not built yet; the pipeline is, and it is closed
 * at the right end.
 */
import type { DbPool } from "./db/index.js";
import { contributorHash } from "./entitlements.js";

export interface QuestionReport {
  companyId: string;
  stage: string | null;
  role: string | null;
  question: string;
}

export interface StoredQuestion extends QuestionReport {
  id: number;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
}

/** Long enough for a real interview question, short enough to not be an essay. */
export const MAX_QUESTION_CHARS = 400;
export const MIN_QUESTION_CHARS = 12;
/** Per contributor, per company. Beyond this it is a dump, not a memory. */
export const MAX_REPORTS_PER_COMPANY = 20;

export interface ContributionStore {
  /** Returns false when it duplicates one this contributor already sent. */
  submit(ownerId: string, report: QuestionReport): Promise<boolean>;
  /**
   * Verified questions for a company, optionally narrowed to a role.
   *
   * A role filter returns that role's questions *plus* the ones reported
   * without a role. Those are the general ones — "tell me about a hard
   * tradeoff" — and excluding them would mean a rarely-reported role gets
   * nothing at all rather than the questions that apply to everyone.
   */
  verified(companyId: string, roleId?: string | null): Promise<StoredQuestion[]>;
  /** How many reports a company has, by status. Drives the public counter. */
  countsFor(companyId: string): Promise<{ pending: number; verified: number }>;
  /** The review queue, oldest first so nothing waits indefinitely. */
  pending(limit: number): Promise<StoredQuestion[]>;
  /**
   * Records a decision. Returns false when the report is gone or already
   * decided, so two reviewers working the queue at once cannot both claim it.
   */
  decide(input: {
    id: number;
    status: "verified" | "rejected";
    reviewer: string;
  }): Promise<boolean>;
  /** Queue depth, for the reviewer's own screen. */
  queueDepth(): Promise<number>;
}

class PostgresContributionStore implements ContributionStore {
  constructor(private readonly pool: DbPool) {}

  async submit(ownerId: string, report: QuestionReport): Promise<boolean> {
    const hash = contributorHash(ownerId);
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM question_reports
        WHERE company_id = $1 AND contributor_hash = $2`,
      [report.companyId, hash],
    );
    if (((rows[0]?.n as number | undefined) ?? 0) >= MAX_REPORTS_PER_COMPANY) {
      return false;
    }
    const { rowCount } = await this.pool.query(
      `INSERT INTO question_reports (company_id, stage, role, question, contributor_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [report.companyId, report.stage, report.role, report.question, hash],
    );
    return (rowCount ?? 0) > 0;
  }

  async verified(companyId: string, roleId?: string | null): Promise<StoredQuestion[]> {
    const { rows } = await this.pool.query(
      `SELECT id, company_id, stage, role, question, status, created_at
         FROM question_reports
        WHERE company_id = $1 AND status = 'verified'
          AND ($2::text IS NULL OR role = $2 OR role IS NULL)
        -- Role-specific first: with a cap on how many reach the prompt, the
        -- ones written for this role should not be crowded out by general ones.
        ORDER BY (role IS NULL), created_at DESC
        LIMIT 50`,
      [companyId, roleId ?? null],
    );
    return rows.map(toStored);
  }

  async countsFor(companyId: string) {
    const { rows } = await this.pool.query(
      `SELECT
         count(*) FILTER (WHERE status = 'pending')::int  AS pending,
         count(*) FILTER (WHERE status = 'verified')::int AS verified
       FROM question_reports WHERE company_id = $1`,
      [companyId],
    );
    return {
      pending: (rows[0]?.pending as number | undefined) ?? 0,
      verified: (rows[0]?.verified as number | undefined) ?? 0,
    };
  }

  async pending(limit: number): Promise<StoredQuestion[]> {
    const { rows } = await this.pool.query(
      `SELECT id, company_id, stage, role, question, status, created_at
         FROM question_reports
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT $1`,
      [limit],
    );
    return rows.map(toStored);
  }

  async decide(input: { id: number; status: "verified" | "rejected"; reviewer: string }) {
    // The status guard in the WHERE clause is the concurrency control: two
    // reviewers working the same queue cannot both decide one report, and the
    // second sees `false` rather than silently overwriting the first.
    const { rowCount } = await this.pool.query(
      `UPDATE question_reports
          SET status = $2, verified_by = $3, verified_at = now()
        WHERE id = $1 AND status = 'pending'`,
      [input.id, input.status, input.reviewer],
    );
    return (rowCount ?? 0) > 0;
  }

  async queueDepth(): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM question_reports WHERE status = 'pending'`,
    );
    return (rows[0]?.n as number | undefined) ?? 0;
  }
}

function toStored(row: Record<string, unknown>): StoredQuestion {
  return {
    id: row.id as number,
    companyId: row.company_id as string,
    stage: (row.stage as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    question: row.question as string,
    status: row.status as StoredQuestion["status"],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

class MemoryContributionStore implements ContributionStore {
  private readonly reports: (StoredQuestion & { hash: string })[] = [];
  private nextId = 1;

  async submit(ownerId: string, report: QuestionReport): Promise<boolean> {
    const hash = contributorHash(ownerId);
    const mine = this.reports.filter(
      (row) => row.companyId === report.companyId && row.hash === hash,
    );
    if (mine.length >= MAX_REPORTS_PER_COMPANY) return false;
    if (mine.some((row) => row.question === report.question)) return false;
    this.reports.push({
      ...report,
      hash,
      id: this.nextId++,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return true;
  }

  async verified(companyId: string, roleId?: string | null): Promise<StoredQuestion[]> {
    return this.reports
      .filter(
        (row) =>
          row.companyId === companyId &&
          row.status === "verified" &&
          (!roleId || row.role === roleId || row.role === null),
      )
      // Role-specific before general, matching the Postgres ordering.
      .sort((a, b) => Number(a.role === null) - Number(b.role === null))
      .map(({ hash: _hash, ...row }) => row);
  }

  async countsFor(companyId: string) {
    const mine = this.reports.filter((row) => row.companyId === companyId);
    return {
      pending: mine.filter((row) => row.status === "pending").length,
      verified: mine.filter((row) => row.status === "verified").length,
    };
  }

  async pending(limit: number): Promise<StoredQuestion[]> {
    return this.reports
      .filter((row) => row.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit)
      .map(({ hash: _hash, ...row }) => row);
  }

  async decide(input: { id: number; status: "verified" | "rejected"; reviewer: string }) {
    const row = this.reports.find((entry) => entry.id === input.id);
    if (!row || row.status !== "pending") return false;
    row.status = input.status;
    return true;
  }

  async queueDepth(): Promise<number> {
    return this.reports.filter((row) => row.status === "pending").length;
  }
}

export function createContributionStore(pool: DbPool | null): ContributionStore {
  return pool ? new PostgresContributionStore(pool) : new MemoryContributionStore();
}

/** Validates and trims a submitted question. Returns null when unusable. */
export function readQuestion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < MIN_QUESTION_CHARS || trimmed.length > MAX_QUESTION_CHARS) {
    return null;
  }
  return trimmed;
}
