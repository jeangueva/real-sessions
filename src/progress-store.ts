/**
 * Everything a candidate expects to still be there tomorrow.
 *
 * This is the single source of truth for finished interviews. The session
 * store (Redis) holds a conversation while it is happening and forgets it an
 * hour later; this holds the record of it having happened — transcript,
 * timings, derived metrics, XP, badges.
 *
 * Postgres when configured, memory otherwise, decided in db/index.ts on the
 * same terms as Redis: degrade loudly in development, refuse to boot in
 * production. The memory implementation is not a toy — it has to satisfy the
 * same tests as the real one, because it is what local development runs on.
 */
import { randomBytes } from "node:crypto";
import type { DbPool } from "./db/index.js";
import type { Evaluation } from "./schema.js";
import type { SessionMetrics } from "./metrics.js";
import { SECTORS, COMPANIES } from "./sectors.js";

/**
 * "real" withholds live coaching, the way an actual interview does. Only real
 * sessions are an honest progress signal, so the mode is stored per session
 * rather than as a user preference that could change between them.
 */
export type SessionMode = "practice" | "real";

export interface NewSession {
  id: string;
  ownerId: string;
  /** The application this rehearses for, when it rehearses for one. */
  applicationId?: string | null;
  company: string;
  sectorId: string | null;
  role: string;
  stage: string;
  mode: SessionMode;
  personaId: string;
  /** The English level it ran at. Null on rows written before levels existed. */
  level: string | null;
}

/**
 * The states a job search actually passes through.
 *
 * Five, closed, and in order. 'rejected' is last rather than absent because a
 * search is mostly rejections and a tracker that cannot record one is a
 * tracker people stop opening — and because the rehearsals attached to it are
 * still worth keeping.
 */
export const APPLICATION_STATUSES = [
  "interested",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return (
    typeof value === "string" &&
    (APPLICATION_STATUSES as readonly string[]).includes(value)
  );
}

export interface NewApplication {
  id: string;
  ownerId: string;
  company: string;
  role: string;
  posting: string | null;
  status: ApplicationStatus;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  posting: string | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * An application with what the practice says about it.
 *
 * The two derived numbers are the whole reason this screen is worth opening:
 * how many times you rehearsed for this job, and the best you did. Computed
 * on read rather than stored, for the reason the XP total is — a counter kept
 * beside the rows goes wrong the first time the rules change and cannot be
 * recomputed.
 */
export interface ApplicationSummary extends Application {
  sessions: number;
  bestScore: number | null;
}

export interface RecordedTurn {
  idx: number;
  speaker: "interviewer" | "candidate";
  text: string;
  /**
   * Milliseconds from the start of the session. Null for a typed answer —
   * a typed turn has no speech timing, and inventing one would corrupt every
   * metric derived from it.
   */
  tStartMs: number | null;
  tEndMs: number | null;
}

export interface SessionSummary {
  id: string;
  company: string;
  sectorId: string | null;
  role: string;
  stage: string;
  mode: SessionMode;
  personaId: string | null;
  /** The English level it ran at, or null for a session predating levels. */
  level: string | null;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  metrics: SessionMetrics | null;
  /**
   * The evaluator's two sub-scores, 0–10, lifted out of the evaluation JSON.
   *
   * They ride along with the summary rather than requiring the full evaluation
   * because the progress chart needs exactly these two numbers. Without them
   * the vocabulary axis fell back to a proxy built from word variety, and the
   * structure axis had nothing to plot at all.
   */
  vocabularyScore: number | null;
  structureScore: number | null;
  /**
   * The token the report is readable by, or null when it is not shared.
   *
   * On the summary rather than only the detail because the history screen has
   * to show which interviews are already out in the world — a share button
   * that cannot tell you it is already on is how somebody sends a second link
   * and believes the first one is gone.
   */
  shareToken: string | null;
}

export interface SessionDetail extends SessionSummary {
  evaluation: Evaluation | null;
  turns: RecordedTurn[];
}

export interface XpEvent {
  kind: string;
  amount: number;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
}

export interface Profile {
  xp: number;
  badges: EarnedBadge[];
}

export interface LeaderboardRow {
  ownerId: string;
  xp: number;
}

export interface ProgressStore {
  readonly kind: "postgres" | "memory";
  createSession(session: NewSession): Promise<void>;
  /** Idempotent on (sessionId, idx) so a retried turn does not duplicate. */
  recordTurns(sessionId: string, turns: RecordedTurn[]): Promise<void>;
  completeSession(input: {
    sessionId: string;
    score: number;
    evaluation: Evaluation;
    metrics: SessionMetrics;
  }): Promise<void>;
  listSessions(ownerId: string): Promise<SessionSummary[]>;
  getSession(ownerId: string, id: string): Promise<SessionDetail | null>;
  /**
   * Starts sharing one report, returning the token to put in the link.
   *
   * Idempotent: a session already shared returns the token it already has.
   * Minting a fresh one on every click would silently revoke a link the owner
   * had already sent to somebody, which looks like the feature being broken by
   * the person using it correctly.
   *
   * Null when the session does not exist or belongs to somebody else — the
   * same answer for both, because telling a stranger that an id is real is
   * already telling them something.
   */
  shareSession(ownerId: string, id: string): Promise<string | null>;
  /** Stops sharing. A no-op when there is nothing to stop. */
  unshareSession(ownerId: string, id: string): Promise<void>;
  /**
   * The report behind a share token, with no owner check.
   *
   * That absence is the whole point: holding the token IS the authorisation,
   * which is why it is 16 random bytes and not an id. The caller decides what
   * of this reaches a stranger's screen — this returns the session, not a
   * public view of it.
   */
  /**
   * The report a share link resolves to, with who owns it.
   *
   * The owner rides along because what a link may show depends on the
   * owner's plan, and the token is the only key a stranger arrives with. It
   * never leaves the server: `publicReport` builds the response by whitelist.
   */
  sessionByShareToken(token: string): Promise<(SessionDetail & { ownerId: string }) | null>;
  createApplication(application: NewApplication): Promise<void>;
  /** Newest first, each with its rehearsal count and best score. */
  listApplications(ownerId: string): Promise<ApplicationSummary[]>;
  /** One application, scoped to its owner. Null reads as "not yours". */
  getApplication(ownerId: string, id: string): Promise<Application | null>;
  /**
   * Changes what the candidate can change. Returns the updated row, or null
   * when it is not theirs — so a caller never has to re-read to find out.
   */
  updateApplication(
    ownerId: string,
    id: string,
    patch: {
      company?: string;
      role?: string;
      posting?: string | null;
      status?: ApplicationStatus;
    },
  ): Promise<Application | null>;
  /** Removes it. The sessions that rehearsed for it survive, ownerless. */
  deleteApplication(ownerId: string, id: string): Promise<void>;
  addXp(ownerId: string, sessionId: string | null, events: XpEvent[]): Promise<void>;
  /** XP already granted on the given UTC day, for the daily cap. */
  xpOnDay(ownerId: string, dayIso: string): Promise<number>;
  /**
   * Interviews started at or after `sinceIso`. Drives the free plan's monthly
   * cap.
   *
   * Counts starts, not completions, on purpose: an abandoned interview still
   * cost a prompt, a voice stream and an evaluator call, and counting only
   * finished ones would let someone quit at turn six forever and never spend
   * an allowance.
   */
  sessionsSince(ownerId: string, sinceIso: string): Promise<number>;
  /** Inserts only badges not already held; returns the ones newly earned. */
  awardBadges(ownerId: string, badgeIds: string[], sessionId: string | null): Promise<string[]>;
  profile(ownerId: string): Promise<Profile>;
  leaderboard(limit: number): Promise<LeaderboardRow[]>;
  /** Moves a guest's whole record onto an account. */
  transfer(fromOwnerId: string, toOwnerId: string): Promise<number>;
  /**
   * Erases everything belonging to one identity.
   *
   * Contributions are deliberately not touched. They carry a one-way hash
   * rather than an owner id, so they are already unlinkable — and deleting
   * them would remove community knowledge that other candidates rely on, which
   * is not what someone deleting their own account is asking for.
   */
  eraseOwner(ownerId: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * A share token: 16 random bytes, base64url.
 *
 * Sixteen because the token is the only thing standing between a stranger and
 * somebody's interview — 128 bits is not guessable, and the next power down
 * starts to be. base64url because it goes in a path segment and must survive
 * being copied out of a chat window, which `+` and `/` do not.
 *
 * Random, not derived. A token computed from the session id — a hash, a
 * cipher, an encoding — is the id wearing a hat: anybody who works out the
 * construction can mint a link for every interview in the table.
 */
function mintShareToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Cap per identity on the list view, matching what the history screen shows. */
const MAX_SESSIONS = 50;

/* ---------------------------------------------------------------------------
 * Postgres
 * ------------------------------------------------------------------------ */

class PostgresProgressStore implements ProgressStore {
  readonly kind = "postgres" as const;
  constructor(private readonly pool: DbPool) {}

  async createSession(session: NewSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO sessions (id, owner_id, company, sector_id, role, stage, mode, persona_id, level, application_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING`,
      [
        session.id,
        session.ownerId,
        session.company,
        session.sectorId,
        session.role,
        session.stage,
        session.mode,
        session.personaId,
        session.level,
        session.applicationId ?? null,
      ],
    );
  }

  async recordTurns(sessionId: string, turns: RecordedTurn[]): Promise<void> {
    if (turns.length === 0) return;
    // One statement rather than a loop: a partially written turn list would
    // skew every metric derived from it.
    const values: unknown[] = [];
    const rows = turns.map((turn, i) => {
      const base = i * 6;
      values.push(
        sessionId, turn.idx, turn.speaker, turn.text, turn.tStartMs, turn.tEndMs,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
    });
    await this.pool.query(
      `INSERT INTO turns (session_id, idx, speaker, text, t_start_ms, t_end_ms)
       VALUES ${rows.join(", ")}
       ON CONFLICT (session_id, idx) DO UPDATE
         SET text = EXCLUDED.text,
             -- COALESCE, not assignment. The server rewrites the whole
             -- transcript on every write and only the write that closes an
             -- exchange carries timings; a plain assignment let every later
             -- rewrite erase them, which silently turned every spoken session
             -- into a typed one.
             t_start_ms = COALESCE(EXCLUDED.t_start_ms, turns.t_start_ms),
             t_end_ms = COALESCE(EXCLUDED.t_end_ms, turns.t_end_ms)`,
      values,
    );
  }

  async completeSession(input: {
    sessionId: string;
    score: number;
    evaluation: Evaluation;
    metrics: SessionMetrics;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      // The session row and its metrics have to land together — a score with
      // no metrics renders a progress chart with a hole in it.
      await client.query("BEGIN");
      await client.query(
        `UPDATE sessions
            SET completed_at = now(), score = $2, evaluation = $3
          WHERE id = $1`,
        [input.sessionId, Math.round(input.score), JSON.stringify(input.evaluation)],
      );
      const m = input.metrics;
      await client.query(
        `INSERT INTO metrics (session_id, words, filler_per_100, vocabulary_range,
                              word_share, speaking_ms, wpm, avg_response_ms,
                              long_pauses, time_to_first_ms, from_speech)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (session_id) DO UPDATE SET
           words = EXCLUDED.words,
           filler_per_100 = EXCLUDED.filler_per_100,
           vocabulary_range = EXCLUDED.vocabulary_range,
           word_share = EXCLUDED.word_share,
           speaking_ms = EXCLUDED.speaking_ms,
           wpm = EXCLUDED.wpm,
           avg_response_ms = EXCLUDED.avg_response_ms,
           long_pauses = EXCLUDED.long_pauses,
           time_to_first_ms = EXCLUDED.time_to_first_ms,
           from_speech = EXCLUDED.from_speech`,
        [
          input.sessionId, m.words, m.fillerPer100, m.vocabularyRange,
          m.wordShare, m.speakingMs, m.wpm, m.avgResponseMs,
          m.longPauses, m.timeToFirstMs, m.fromSpeech,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async listSessions(ownerId: string): Promise<SessionSummary[]> {
    const { rows } = await this.pool.query(
      `SELECT s.*, m.*,
              (s.evaluation->'vocabulary_feedback'->>'score_out_of_10')::real AS vocabulary_score,
              (s.evaluation->'structure_feedback'->>'score_out_of_10')::real  AS structure_score
         FROM sessions s
         LEFT JOIN metrics m ON m.session_id = s.id
        WHERE s.owner_id = $1
        ORDER BY s.started_at DESC
        LIMIT $2`,
      [ownerId, MAX_SESSIONS],
    );
    return rows.map(toSummary);
  }

  async getSession(ownerId: string, id: string): Promise<SessionDetail | null> {
    const { rows } = await this.pool.query(
      `SELECT s.*, m.*,
              (s.evaluation->'vocabulary_feedback'->>'score_out_of_10')::real AS vocabulary_score,
              (s.evaluation->'structure_feedback'->>'score_out_of_10')::real  AS structure_score
         FROM sessions s
         LEFT JOIN metrics m ON m.session_id = s.id
        WHERE s.owner_id = $1 AND s.id = $2`,
      [ownerId, id],
    );
    const row = rows[0];
    if (!row) return null;
    return this.withTurns(row);
  }

  async shareSession(ownerId: string, id: string): Promise<string | null> {
    // One statement, not a read then a write: two instances clicking share at
    // the same moment would otherwise both see null and the second would
    // overwrite the first one's token, invalidating a link already sent.
    // COALESCE makes the existing token win against the candidate one.
    const { rows } = await this.pool.query(
      `UPDATE sessions
          SET share_token = COALESCE(share_token, $3)
        WHERE owner_id = $1 AND id = $2
        RETURNING share_token`,
      [ownerId, id, mintShareToken()],
    );
    return (rows[0]?.share_token as string | null) ?? null;
  }

  async unshareSession(ownerId: string, id: string): Promise<void> {
    await this.pool.query(
      `UPDATE sessions SET share_token = NULL WHERE owner_id = $1 AND id = $2`,
      [ownerId, id],
    );
  }

  async sessionByShareToken(
    token: string,
  ): Promise<(SessionDetail & { ownerId: string }) | null> {
    const { rows } = await this.pool.query(
      `SELECT s.*, m.*,
              (s.evaluation->'vocabulary_feedback'->>'score_out_of_10')::real AS vocabulary_score,
              (s.evaluation->'structure_feedback'->>'score_out_of_10')::real  AS structure_score
         FROM sessions s
         LEFT JOIN metrics m ON m.session_id = s.id
        WHERE s.share_token = $1`,
      [token],
    );
    const row = rows[0];
    if (!row) return null;
    return { ...(await this.withTurns(row)), ownerId: String(row.owner_id) };
  }

  async createApplication(application: NewApplication): Promise<void> {
    await this.pool.query(
      `INSERT INTO applications (id, owner_id, company, role, posting, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        application.id,
        application.ownerId,
        application.company,
        application.role,
        application.posting,
        application.status,
      ],
    );
  }

  async listApplications(ownerId: string): Promise<ApplicationSummary[]> {
    // The counts come from one join rather than a query per row: a candidate
    // with twenty applications would otherwise cost twenty-one round trips to
    // draw one screen.
    const { rows } = await this.pool.query(
      `SELECT a.*,
              COUNT(s.id)::int AS sessions,
              MAX(s.score)     AS best_score
         FROM applications a
         LEFT JOIN sessions s ON s.application_id = a.id
        WHERE a.owner_id = $1
        GROUP BY a.id
        ORDER BY a.created_at DESC`,
      [ownerId],
    );
    return rows.map(toApplicationSummary);
  }

  async getApplication(ownerId: string, id: string): Promise<Application | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM applications WHERE owner_id = $1 AND id = $2`,
      [ownerId, id],
    );
    return rows[0] ? toApplication(rows[0]) : null;
  }

  async updateApplication(
    ownerId: string,
    id: string,
    patch: {
      company?: string;
      role?: string;
      posting?: string | null;
      status?: ApplicationStatus;
    },
  ): Promise<Application | null> {
    // COALESCE against the parameter rather than a built SET list: the status
    // selector sends one field and the edit form sends three, and assembling
    // SQL per shape is how a column ends up updatable by a caller that never
    // meant to touch it.
    //
    // Which costs one thing, stated here because it is not obvious: `posting`
    // cannot be cleared through this path, since null means "leave it". Taking
    // a posting away is not something the UI offers, and when it does it needs
    // its own call rather than a sentinel string.
    const { rows } = await this.pool.query(
      `UPDATE applications
          SET company    = COALESCE($3, company),
              role       = COALESCE($4, role),
              posting    = COALESCE($5, posting),
              status     = COALESCE($6, status),
              updated_at = now()
        WHERE owner_id = $1 AND id = $2
        RETURNING *`,
      [
        ownerId,
        id,
        patch.company ?? null,
        patch.role ?? null,
        patch.posting ?? null,
        patch.status ?? null,
      ],
    );
    return rows[0] ? toApplication(rows[0]) : null;
  }

  async deleteApplication(ownerId: string, id: string): Promise<void> {
    // The sessions keep their rows and lose the link, by the foreign key's
    // ON DELETE SET NULL. That is the point, not a side effect.
    await this.pool.query(
      `DELETE FROM applications WHERE owner_id = $1 AND id = $2`,
      [ownerId, id],
    );
  }

  /** The turns half of a detail read, shared by the owned and shared paths. */
  private async withTurns(row: Record<string, unknown>): Promise<SessionDetail> {
    const turns = await this.pool.query(
      `SELECT idx, speaker, text, t_start_ms, t_end_ms
         FROM turns WHERE session_id = $1 ORDER BY idx`,
      [row.id as string],
    );
    return {
      ...toSummary(row),
      evaluation: (row.evaluation as Evaluation | null) ?? null,
      turns: turns.rows.map((t) => ({
        idx: t.idx as number,
        speaker: t.speaker as "interviewer" | "candidate",
        text: t.text as string,
        tStartMs: t.t_start_ms as number | null,
        tEndMs: t.t_end_ms as number | null,
      })),
    };
  }

  async addXp(ownerId: string, sessionId: string | null, events: XpEvent[]): Promise<void> {
    if (events.length === 0) return;
    const values: unknown[] = [];
    const rows = events.map((event, i) => {
      const base = i * 4;
      values.push(ownerId, event.kind, event.amount, sessionId);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });
    await this.pool.query(
      `INSERT INTO xp_events (owner_id, kind, amount, session_id) VALUES ${rows.join(", ")}`,
      values,
    );
  }

  async awardBadges(
    ownerId: string,
    badgeIds: string[],
    sessionId: string | null,
  ): Promise<string[]> {
    if (badgeIds.length === 0) return [];
    const values: unknown[] = [];
    const rows = badgeIds.map((badgeId, i) => {
      const base = i * 3;
      values.push(ownerId, badgeId, sessionId);
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    });
    // DO NOTHING plus RETURNING is what makes this idempotent: a retried
    // evaluation returns an empty list rather than re-announcing a badge.
    const { rows: inserted } = await this.pool.query(
      `INSERT INTO badges (owner_id, badge_id, session_id) VALUES ${rows.join(", ")}
       ON CONFLICT (owner_id, badge_id) DO NOTHING
       RETURNING badge_id`,
      values,
    );
    return inserted.map((row) => row.badge_id as string);
  }

  async sessionsSince(ownerId: string, sinceIso: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS n
         FROM sessions
        WHERE owner_id = $1
          AND started_at >= $2::timestamptz`,
      [ownerId, sinceIso],
    );
    return (rows[0]?.n as number | undefined) ?? 0;
  }

  async xpOnDay(ownerId: string, dayIso: string): Promise<number> {
    const { rows } = await this.pool.query(
      // AT TIME ZONE 'UTC' is load-bearing. A bare `created_at::date` resolves
      // in the connection's timezone, while the caller passes a UTC day — so
      // on any server not set to UTC the two disagree and the daily cap reads
      // as zero for part of every day.
      //
      // Both sides being UTC is a decision, not a neutral default: a candidate
      // in UTC-5 sees their cap reset at 7pm local. Fixing that properly needs
      // the client's timezone, which is a change to the API surface.
      `SELECT COALESCE(SUM(amount), 0)::int AS xp
         FROM xp_events
        WHERE owner_id = $1
          AND (created_at AT TIME ZONE 'UTC')::date = $2::date`,
      [ownerId, dayIso],
    );
    return (rows[0]?.xp as number | undefined) ?? 0;
  }

  async profile(ownerId: string): Promise<Profile> {
    const [xp, badges] = await Promise.all([
      this.pool.query(
        `SELECT COALESCE(SUM(amount), 0)::int AS xp FROM xp_events WHERE owner_id = $1`,
        [ownerId],
      ),
      this.pool.query(
        `SELECT badge_id, earned_at FROM badges WHERE owner_id = $1 ORDER BY earned_at`,
        [ownerId],
      ),
    ]);
    return {
      xp: (xp.rows[0]?.xp as number | undefined) ?? 0,
      badges: badges.rows.map((row) => ({
        badgeId: row.badge_id as string,
        earnedAt: iso(row.earned_at),
      })),
    };
  }

  async leaderboard(limit: number): Promise<LeaderboardRow[]> {
    const { rows } = await this.pool.query(
      `SELECT owner_id, SUM(amount)::int AS xp
         FROM xp_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY owner_id
        ORDER BY xp DESC
        LIMIT $1`,
      [limit],
    );
    return rows.map((row) => ({ ownerId: row.owner_id as string, xp: row.xp as number }));
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const moved = await client.query(
        `UPDATE sessions SET owner_id = $2 WHERE owner_id = $1`,
        [fromOwnerId, toOwnerId],
      );
      await client.query(`UPDATE xp_events SET owner_id = $2 WHERE owner_id = $1`, [
        fromOwnerId,
        toOwnerId,
      ]);
      // A badge the account already holds cannot be moved onto it, so those
      // rows are dropped rather than colliding with the primary key.
      await client.query(
        `DELETE FROM badges b
          WHERE b.owner_id = $1
            AND EXISTS (SELECT 1 FROM badges o WHERE o.owner_id = $2 AND o.badge_id = b.badge_id)`,
        [fromOwnerId, toOwnerId],
      );
      await client.query(`UPDATE badges SET owner_id = $2 WHERE owner_id = $1`, [
        fromOwnerId,
        toOwnerId,
      ]);
      await client.query("COMMIT");
      return moved.rowCount ?? 0;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async eraseOwner(ownerId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Sessions cascade to turns and metrics; the other two reference
      // sessions with ON DELETE SET NULL, so they are removed explicitly.
      await client.query(`DELETE FROM xp_events WHERE owner_id = $1`, [ownerId]);
      await client.query(`DELETE FROM badges WHERE owner_id = $1`, [ownerId]);
      await client.query(`DELETE FROM sessions WHERE owner_id = $1`, [ownerId]);
      // After the sessions, not before: the foreign key would otherwise null
      // out links on rows that are about to be deleted anyway, which is work
      // for nothing. Applications hold a pasted posting, so they are squarely
      // within what someone deleting their account is asking to be rid of.
      await client.query(`DELETE FROM applications WHERE owner_id = $1`, [ownerId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    // The pool is shared and closed centrally by closeDb().
  }
}

/** Maps a joined sessions+metrics row onto the shape the API returns. */
function toSummary(row: Record<string, unknown>): SessionSummary {
  const hasMetrics = row.words !== null && row.words !== undefined;
  return {
    id: row.id as string,
    company: row.company as string,
    sectorId: (row.sector_id as string | null) ?? null,
    role: row.role as string,
    stage: row.stage as string,
    mode: row.mode as SessionMode,
    personaId: (row.persona_id as string | null) ?? null,
    level: (row.level as string | null) ?? null,
    startedAt: iso(row.started_at),
    completedAt: row.completed_at ? iso(row.completed_at) : null,
    score: (row.score as number | null) ?? null,
    vocabularyScore: (row.vocabulary_score as number | null) ?? null,
    structureScore: (row.structure_score as number | null) ?? null,
    shareToken: (row.share_token as string | null) ?? null,
    metrics: hasMetrics
      ? {
          words: row.words as number,
          fillerPer100: row.filler_per_100 as number | null,
          vocabularyRange: row.vocabulary_range as number | null,
          wordShare: row.word_share as number | null,
          speakingMs: row.speaking_ms as number | null,
          wpm: row.wpm as number | null,
          avgResponseMs: row.avg_response_ms as number | null,
          longPauses: row.long_pauses as number | null,
          timeToFirstMs: row.time_to_first_ms as number | null,
          fromSpeech: row.from_speech as boolean,
        }
      : null,
  };
}

function toApplication(row: Record<string, unknown>): Application {
  return {
    id: row.id as string,
    company: row.company as string,
    role: row.role as string,
    posting: (row.posting as string | null) ?? null,
    status: row.status as ApplicationStatus,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function toApplicationSummary(row: Record<string, unknown>): ApplicationSummary {
  return {
    ...toApplication(row),
    sessions: (row.sessions as number | null) ?? 0,
    // MAX over no rows is null, and over unscored rows is also null. Both mean
    // "nothing to show yet", which is not the same as zero and must not round
    // to it on the screen.
    bestScore: (row.best_score as number | null) ?? null,
  };
}

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/* ---------------------------------------------------------------------------
 * Memory
 * ------------------------------------------------------------------------ */

interface MemorySession extends NewSession {
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  evaluation: Evaluation | null;
  metrics: SessionMetrics | null;
  shareToken: string | null;
  turns: Map<number, RecordedTurn>;
}

interface MemoryApplication extends NewApplication {
  createdAt: string;
  updatedAt: string;
}

/**
 * Drops the owner id on the way out.
 *
 * The Postgres projection cannot leak it because it names its fields; the
 * memory one holds the whole row, and returning it would make the two
 * implementations answer differently — which is exactly the class of bug the
 * shared test suite exists to catch.
 */
function stripOwner(application: MemoryApplication): Application {
  return {
    id: application.id,
    company: application.company,
    role: application.role,
    posting: application.posting,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

class MemoryProgressStore implements ProgressStore {
  readonly kind = "memory" as const;
  private readonly sessions = new Map<string, MemorySession>();
  private readonly applications = new Map<string, MemoryApplication>();
  private readonly xp: { ownerId: string; amount: number; at: number }[] = [];
  private readonly badges = new Map<string, Map<string, string>>();

  async createSession(session: NewSession): Promise<void> {
    if (this.sessions.has(session.id)) return;
    this.sessions.set(session.id, {
      ...session,
      startedAt: new Date().toISOString(),
      completedAt: null,
      score: null,
      evaluation: null,
      metrics: null,
      shareToken: null,
      turns: new Map(),
    });
  }

  async recordTurns(sessionId: string, turns: RecordedTurn[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    for (const turn of turns) {
      // Mirrors the COALESCE in the Postgres upsert: a rewrite without
      // timings must not erase the ones already recorded.
      const held = session.turns.get(turn.idx);
      session.turns.set(turn.idx, {
        ...turn,
        tStartMs: turn.tStartMs ?? held?.tStartMs ?? null,
        tEndMs: turn.tEndMs ?? held?.tEndMs ?? null,
      });
    }
  }

  async completeSession(input: {
    sessionId: string;
    score: number;
    evaluation: Evaluation;
    metrics: SessionMetrics;
  }): Promise<void> {
    const session = this.sessions.get(input.sessionId);
    if (!session) return;
    session.completedAt = new Date().toISOString();
    session.score = Math.round(input.score);
    session.evaluation = input.evaluation;
    session.metrics = input.metrics;
  }

  private owned(ownerId: string): MemorySession[] {
    return [...this.sessions.values()]
      .filter((session) => session.ownerId === ownerId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, MAX_SESSIONS);
  }

  async listSessions(ownerId: string): Promise<SessionSummary[]> {
    return this.owned(ownerId).map(summarize);
  }

  async getSession(ownerId: string, id: string): Promise<SessionDetail | null> {
    const session = this.sessions.get(id);
    if (!session || session.ownerId !== ownerId) return null;
    return {
      ...summarize(session),
      evaluation: session.evaluation,
      turns: [...session.turns.values()].sort((a, b) => a.idx - b.idx),
    };
  }

  async shareSession(ownerId: string, id: string): Promise<string | null> {
    const session = this.sessions.get(id);
    if (!session || session.ownerId !== ownerId) return null;
    session.shareToken ??= mintShareToken();
    return session.shareToken;
  }

  async unshareSession(ownerId: string, id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session || session.ownerId !== ownerId) return;
    session.shareToken = null;
  }

  async sessionByShareToken(
    token: string,
  ): Promise<(SessionDetail & { ownerId: string }) | null> {
    const session = [...this.sessions.values()].find(
      (candidate) => candidate.shareToken === token,
    );
    if (!session) return null;
    return {
      ownerId: session.ownerId,
      ...summarize(session),
      evaluation: session.evaluation,
      turns: [...session.turns.values()].sort((a, b) => a.idx - b.idx),
    };
  }

  async createApplication(application: NewApplication): Promise<void> {
    if (this.applications.has(application.id)) return;
    const now = new Date().toISOString();
    this.applications.set(application.id, {
      ...application,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listApplications(ownerId: string): Promise<ApplicationSummary[]> {
    return [...this.applications.values()]
      .filter((application) => application.ownerId === ownerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((application) => {
        const rehearsals = [...this.sessions.values()].filter(
          (session) => session.applicationId === application.id,
        );
        const scores = rehearsals
          .map((session) => session.score)
          .filter((score): score is number => score !== null);
        return {
          ...stripOwner(application),
          sessions: rehearsals.length,
          bestScore: scores.length > 0 ? Math.max(...scores) : null,
        };
      });
  }

  async getApplication(ownerId: string, id: string): Promise<Application | null> {
    const application = this.applications.get(id);
    if (!application || application.ownerId !== ownerId) return null;
    return stripOwner(application);
  }

  async updateApplication(
    ownerId: string,
    id: string,
    patch: {
      company?: string;
      role?: string;
      posting?: string | null;
      status?: ApplicationStatus;
    },
  ): Promise<Application | null> {
    const application = this.applications.get(id);
    if (!application || application.ownerId !== ownerId) return null;
    // `??` and not `||`, so an empty company does not silently keep the old
    // one — and matching the COALESCE in the Postgres path, where a null
    // parameter means "leave it".
    application.company = patch.company ?? application.company;
    application.role = patch.role ?? application.role;
    application.posting = patch.posting ?? application.posting;
    application.status = patch.status ?? application.status;
    application.updatedAt = new Date().toISOString();
    return stripOwner(application);
  }

  async deleteApplication(ownerId: string, id: string): Promise<void> {
    const application = this.applications.get(id);
    if (!application || application.ownerId !== ownerId) return;
    this.applications.delete(id);
    // Standing in for ON DELETE SET NULL. Without this the memory store would
    // keep counting rehearsals against an application that no longer exists,
    // and the two implementations would disagree about what deleting means.
    for (const session of this.sessions.values()) {
      if (session.applicationId === id) session.applicationId = null;
    }
  }

  async addXp(ownerId: string, _sessionId: string | null, events: XpEvent[]): Promise<void> {
    for (const event of events) {
      this.xp.push({ ownerId, amount: event.amount, at: Date.now() });
    }
  }

  async awardBadges(ownerId: string, badgeIds: string[]): Promise<string[]> {
    const held = this.badges.get(ownerId) ?? new Map<string, string>();
    this.badges.set(ownerId, held);
    const earned: string[] = [];
    for (const badgeId of badgeIds) {
      if (held.has(badgeId)) continue;
      held.set(badgeId, new Date().toISOString());
      earned.push(badgeId);
    }
    return earned;
  }

  async sessionsSince(ownerId: string, sinceIso: string): Promise<number> {
    const since = Date.parse(sinceIso);
    let n = 0;
    for (const row of this.sessions.values()) {
      if (row.ownerId === ownerId && Date.parse(row.startedAt) >= since) n += 1;
    }
    return n;
  }

  async xpOnDay(ownerId: string, dayIso: string): Promise<number> {
    return this.xp
      .filter(
        (event) =>
          event.ownerId === ownerId &&
          new Date(event.at).toISOString().slice(0, 10) === dayIso,
      )
      .reduce((total, event) => total + event.amount, 0);
  }

  async profile(ownerId: string): Promise<Profile> {
    const xp = this.xp
      .filter((event) => event.ownerId === ownerId)
      .reduce((total, event) => total + event.amount, 0);
    const held = this.badges.get(ownerId) ?? new Map<string, string>();
    return {
      xp,
      badges: [...held.entries()]
        .map(([badgeId, earnedAt]) => ({ badgeId, earnedAt }))
        .sort((a, b) => a.earnedAt.localeCompare(b.earnedAt)),
    };
  }

  async leaderboard(limit: number): Promise<LeaderboardRow[]> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const totals = new Map<string, number>();
    for (const event of this.xp) {
      if (event.at <= cutoff) continue;
      totals.set(event.ownerId, (totals.get(event.ownerId) ?? 0) + event.amount);
    }
    return [...totals.entries()]
      .map(([ownerId, xp]) => ({ ownerId, xp }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  }

  async transfer(fromOwnerId: string, toOwnerId: string): Promise<number> {
    if (fromOwnerId === toOwnerId) return 0;
    let moved = 0;
    for (const session of this.sessions.values()) {
      if (session.ownerId !== fromOwnerId) continue;
      session.ownerId = toOwnerId;
      moved += 1;
    }
    for (const event of this.xp) {
      if (event.ownerId === fromOwnerId) event.ownerId = toOwnerId;
    }
    const incoming = this.badges.get(fromOwnerId);
    if (incoming) {
      const held = this.badges.get(toOwnerId) ?? new Map<string, string>();
      for (const [badgeId, earnedAt] of incoming) {
        if (!held.has(badgeId)) held.set(badgeId, earnedAt);
      }
      this.badges.set(toOwnerId, held);
      this.badges.delete(fromOwnerId);
    }
    return moved;
  }

  async eraseOwner(ownerId: string): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.ownerId === ownerId) this.sessions.delete(id);
    }
    for (const [id, application] of this.applications) {
      if (application.ownerId === ownerId) this.applications.delete(id);
    }
    for (let i = this.xp.length - 1; i >= 0; i -= 1) {
      if (this.xp[i]!.ownerId === ownerId) this.xp.splice(i, 1);
    }
    this.badges.delete(ownerId);
  }

  async close(): Promise<void> {
    this.sessions.clear();
    this.xp.length = 0;
    this.badges.clear();
  }
}

function summarize(session: MemorySession): SessionSummary {
  return {
    id: session.id,
    company: session.company,
    sectorId: session.sectorId,
    role: session.role,
    stage: session.stage,
    mode: session.mode,
    personaId: session.personaId,
    level: session.level,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    score: session.score,
    vocabularyScore:
      session.evaluation?.vocabulary_feedback.score_out_of_10 ?? null,
    structureScore: session.evaluation?.structure_feedback.score_out_of_10 ?? null,
    shareToken: session.shareToken,
    metrics: session.metrics,
  };
}

export function createProgressStore(pool: DbPool | null): ProgressStore {
  return pool ? new PostgresProgressStore(pool) : new MemoryProgressStore();
}

/**
 * Writes the sector and company catalogue into Postgres.
 *
 * `sectors.ts` stays the source of truth; these rows exist so a session can
 * reference a sector and so progress can be grouped by one. Re-run on every
 * boot, which is how a catalogue edit reaches an existing database.
 */
export async function seedCatalogue(pool: DbPool): Promise<void> {
  for (const sector of SECTORS) {
    await pool.query(
      `INSERT INTO sectors (id, label, focus, metrics) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET label = EXCLUDED.label, focus = EXCLUDED.focus, metrics = EXCLUDED.metrics`,
      [sector.id, sector.label, sector.focus, sector.metrics],
    );
  }
  for (const company of COMPANIES) {
    await pool.query(
      `INSERT INTO companies (id, name, sector_id, culture, description, tint)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name, sector_id = EXCLUDED.sector_id,
             culture = EXCLUDED.culture, description = EXCLUDED.description,
             tint = EXCLUDED.tint`,
      [
        company.id,
        company.name,
        company.sectorId,
        company.culture,
        company.description,
        company.tint,
      ],
    );
  }
}
