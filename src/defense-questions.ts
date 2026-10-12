/**
 * Questions real juries asked, by university — given anonymously by students
 * who have already defended.
 *
 * The data no general chatbot has, and the one that compounds: every student
 * who defends at a university makes the next one's rehearsal at that
 * university closer to the real thing.
 *
 * Nothing reaches a panel until a reviewer has verified it, exactly as with
 * interview questions. It is a stranger's text going into another person's
 * prompt, and a question carrying a name, an insult or an instruction to the
 * model must be stopped by a person first.
 */
import type { DbPool } from "./db/index.js";
import { contributorHash } from "./entitlements.js";

export const MAX_DEFENSE_QUESTIONS_PER_UNIVERSITY = 15;

export interface DefenseQuestion {
  id: number;
  universityKey: string;
  university: string;
  country: string | null;
  field: string | null;
  question: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
}

/**
 * "Universidad Nacional Mayor de San Marcos", "UNMSM " and "universidad
 * nacional mayor de san marcos" are one university to a reader; the key folds
 * case, accents and spacing so they are one to the store as well.
 */
export function universityKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface DefenseQuestionStore {
  /** Returns how many were stored; repeats and anything over the cap are not. */
  submit(
    ownerId: string,
    input: { university: string; country: string | null; field: string | null; questions: string[] },
  ): Promise<number>;
  verified(universityKey: string, limit?: number): Promise<DefenseQuestion[]>;
  countVerified(universityKey: string): Promise<number>;
  pending(limit: number): Promise<DefenseQuestion[]>;
  decide(input: { id: number; status: "verified" | "rejected"; reviewer: string }): Promise<boolean>;
}

class PostgresDefenseQuestionStore implements DefenseQuestionStore {
  constructor(private readonly pool: DbPool) {}

  async submit(ownerId: string, input: { university: string; country: string | null; field: string | null; questions: string[] }) {
    const key = universityKey(input.university);
    if (key === "") return 0;
    const hash = contributorHash(ownerId);
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM defense_questions WHERE university_key = $1 AND contributor_hash = $2`,
      [key, hash],
    );
    let room = MAX_DEFENSE_QUESTIONS_PER_UNIVERSITY - ((rows[0]?.n as number | undefined) ?? 0);
    let stored = 0;
    for (const question of input.questions) {
      if (room <= 0) break;
      const result = await this.pool.query(
        `INSERT INTO defense_questions (university_key, university, country, field, question, contributor_hash)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [key, input.university.trim().slice(0, 160), input.country, input.field, question, hash],
      );
      if ((result.rowCount ?? 0) > 0) {
        stored += 1;
        room -= 1;
      }
    }
    return stored;
  }

  async verified(key: string, limit = 8) {
    const { rows } = await this.pool.query(
      `SELECT * FROM defense_questions WHERE university_key = $1 AND status = 'verified'
        ORDER BY created_at DESC LIMIT $2`,
      [key, limit],
    );
    return rows.map(toQuestion);
  }

  async countVerified(key: string) {
    const { rows } = await this.pool.query(
      `SELECT count(*)::int AS n FROM defense_questions WHERE university_key = $1 AND status = 'verified'`,
      [key],
    );
    return (rows[0]?.n as number | undefined) ?? 0;
  }

  async pending(limit: number) {
    const { rows } = await this.pool.query(
      `SELECT * FROM defense_questions WHERE status = 'pending' ORDER BY created_at LIMIT $1`,
      [limit],
    );
    return rows.map(toQuestion);
  }

  async decide(input: { id: number; status: "verified" | "rejected"; reviewer: string }) {
    const result = await this.pool.query(
      `UPDATE defense_questions SET status = $2, verified_by = $3, verified_at = now()
        WHERE id = $1 AND status = 'pending'`,
      [input.id, input.status, input.reviewer],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function toQuestion(row: Record<string, unknown>): DefenseQuestion {
  return {
    id: Number(row.id),
    universityKey: row.university_key as string,
    university: row.university as string,
    country: (row.country as string | null) ?? null,
    field: (row.field as string | null) ?? null,
    question: row.question as string,
    status: row.status as DefenseQuestion["status"],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

class MemoryDefenseQuestionStore implements DefenseQuestionStore {
  private readonly rows: (DefenseQuestion & { contributor: string })[] = [];
  private seq = 0;

  async submit(ownerId: string, input: { university: string; country: string | null; field: string | null; questions: string[] }) {
    const key = universityKey(input.university);
    if (key === "") return 0;
    const contributor = contributorHash(ownerId);
    let room =
      MAX_DEFENSE_QUESTIONS_PER_UNIVERSITY -
      this.rows.filter((row) => row.universityKey === key && row.contributor === contributor).length;
    let stored = 0;
    for (const question of input.questions) {
      if (room <= 0) break;
      if (this.rows.some((row) => row.universityKey === key && row.question === question)) continue;
      this.seq += 1;
      this.rows.push({
        id: this.seq,
        universityKey: key,
        university: input.university.trim(),
        country: input.country,
        field: input.field,
        question,
        status: "pending",
        createdAt: new Date().toISOString(),
        contributor,
      });
      stored += 1;
      room -= 1;
    }
    return stored;
  }

  async verified(key: string, limit = 8) {
    return this.rows.filter((row) => row.universityKey === key && row.status === "verified").slice(-limit).reverse();
  }

  async countVerified(key: string) {
    return this.rows.filter((row) => row.universityKey === key && row.status === "verified").length;
  }

  async pending(limit: number) {
    return this.rows.filter((row) => row.status === "pending").slice(0, limit);
  }

  async decide(input: { id: number; status: "verified" | "rejected"; reviewer: string }) {
    const row = this.rows.find((entry) => entry.id === input.id && entry.status === "pending");
    if (!row) return false;
    row.status = input.status;
    return true;
  }
}

export function createDefenseQuestionStore(pool: DbPool | null): DefenseQuestionStore {
  return pool ? new PostgresDefenseQuestionStore(pool) : new MemoryDefenseQuestionStore();
}
