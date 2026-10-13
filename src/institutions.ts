/**
 * Schools and faculties that buy rehearsals for a cohort.
 *
 * Sold by quote, set up by hand in the admin: a code, how many students, how
 * many full defences each, until when, and the school's own rubric. A student
 * joins with the code — which shares their progress with the school, said
 * plainly before they join — and rehearses on the school's account.
 */
import type { DbPool } from "./db/index.js";
import { newAdvisorCode } from "./advisors.js";

export interface Institution {
  code: string;
  name: string;
  ownerId: string | null;
  seats: number;
  creditsPerStudent: number;
  rubric: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface InstitutionMember {
  studentId: string;
  code: string;
  joinedAt: string;
}

export interface InstitutionStore {
  byCode(code: string): Promise<Institution | null>;
  ownedBy(ownerId: string): Promise<Institution | null>;
  create(input: Omit<Institution, "code" | "createdAt">): Promise<Institution>;
  join(studentId: string, code: string): Promise<InstitutionMember>;
  leave(studentId: string): Promise<void>;
  membership(studentId: string): Promise<InstitutionMember | null>;
  members(code: string): Promise<InstitutionMember[]>;
  eraseOwner(ownerId: string): Promise<void>;
}

function toInstitution(row: Record<string, unknown>): Institution {
  return {
    code: row.code as string,
    name: row.name as string,
    ownerId: (row.owner_id as string | null) ?? null,
    seats: Number(row.seats),
    creditsPerStudent: Number(row.credits_per_student),
    rubric: (row.rubric as string | null) ?? null,
    expiresAt: new Date(row.expires_at as string).toISOString(),
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

class PostgresInstitutionStore implements InstitutionStore {
  constructor(private readonly pool: DbPool) {}
  async byCode(code: string) {
    const { rows } = await this.pool.query(`SELECT * FROM institutions WHERE code = $1`, [code]);
    return rows[0] ? toInstitution(rows[0]) : null;
  }
  async ownedBy(ownerId: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM institutions WHERE owner_id = $1 ORDER BY expires_at DESC LIMIT 1`,
      [ownerId],
    );
    return rows[0] ? toInstitution(rows[0]) : null;
  }
  async create(input: Omit<Institution, "code" | "createdAt">) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { rows } = await this.pool.query(
        `INSERT INTO institutions (code, name, owner_id, seats, credits_per_student, rubric, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING RETURNING *`,
        [newAdvisorCode(), input.name, input.ownerId, input.seats, input.creditsPerStudent, input.rubric, input.expiresAt],
      );
      if (rows[0]) return toInstitution(rows[0]);
    }
    throw new Error("Could not create an institution code.");
  }
  async join(studentId: string, code: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO institution_members (student_id, code) VALUES ($1, $2)
       ON CONFLICT (student_id) DO UPDATE SET code = EXCLUDED.code, joined_at = now() RETURNING *`,
      [studentId, code],
    );
    return { studentId, code, joinedAt: new Date(rows[0].joined_at).toISOString() };
  }
  async leave(studentId: string) {
    await this.pool.query(`DELETE FROM institution_members WHERE student_id = $1`, [studentId]);
  }
  async membership(studentId: string) {
    const { rows } = await this.pool.query(`SELECT * FROM institution_members WHERE student_id = $1`, [studentId]);
    return rows[0]
      ? { studentId, code: rows[0].code as string, joinedAt: new Date(rows[0].joined_at).toISOString() }
      : null;
  }
  async members(code: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM institution_members WHERE code = $1 ORDER BY joined_at LIMIT 2000`,
      [code],
    );
    return rows.map((row) => ({
      studentId: row.student_id as string,
      code,
      joinedAt: new Date(row.joined_at).toISOString(),
    }));
  }
  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM institution_members WHERE student_id = $1`, [ownerId]);
  }
}

class MemoryInstitutionStore implements InstitutionStore {
  private readonly rows = new Map<string, Institution>();
  private readonly joined = new Map<string, InstitutionMember>();
  async byCode(code: string) {
    return this.rows.get(code) ?? null;
  }
  async ownedBy(ownerId: string) {
    return [...this.rows.values()].find((row) => row.ownerId === ownerId) ?? null;
  }
  async create(input: Omit<Institution, "code" | "createdAt">) {
    const row = { ...input, code: newAdvisorCode(), createdAt: new Date().toISOString() };
    this.rows.set(row.code, row);
    return row;
  }
  async join(studentId: string, code: string) {
    const member = { studentId, code, joinedAt: new Date().toISOString() };
    this.joined.set(studentId, member);
    return member;
  }
  async leave(studentId: string) {
    this.joined.delete(studentId);
  }
  async membership(studentId: string) {
    return this.joined.get(studentId) ?? null;
  }
  async members(code: string) {
    return [...this.joined.values()].filter((member) => member.code === code);
  }
  async eraseOwner(ownerId: string) {
    this.joined.delete(ownerId);
  }
}

export function createInstitutionStore(pool: DbPool | null): InstitutionStore {
  return pool ? new PostgresInstitutionStore(pool) : new MemoryInstitutionStore();
}

/** Whether a student's place in a cohort is live: in date and within the seats. */
export function seatHeld(institution: Institution, members: readonly InstitutionMember[], studentId: string, now = new Date()): boolean {
  if (Date.parse(institution.expiresAt) <= now.getTime()) return false;
  const index = members.findIndex((member) => member.studentId === studentId);
  return index >= 0 && index < institution.seats;
}
