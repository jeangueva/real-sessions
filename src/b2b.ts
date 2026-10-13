/**
 * Universities and institutes asking to talk.
 *
 * The form on /instituciones writes here and mails the team. A lead is a
 * person at a school who gave their work address on purpose; nothing else is
 * collected, and the row is the whole of it.
 */
import type { DbPool } from "./db/index.js";

export const LMS_PLATFORMS = ["moodle", "canvas", "blackboard", "brightspace", "sakai", "otra", "ninguna"] as const;
export type LmsPlatform = (typeof LMS_PLATFORMS)[number];

export interface B2bLead {
  name: string;
  email: string;
  institution: string;
  role: string | null;
  country: string | null;
  students: number | null;
  platform: LmsPlatform | null;
  message: string | null;
}

/** The lead from a request body, or the reason it is not one. */
export function readLead(body: Record<string, unknown>): B2bLead | string {
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const name = text(body["name"], 120);
  const email = text(body["email"], 200).toLowerCase();
  const institution = text(body["institution"], 160);
  if (name.length < 2) return "Escribe tu nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Escribe un correo válido.";
  if (institution.length < 3) return "Escribe el nombre de tu institución.";
  const students = Number(body["students"]);
  const platform = LMS_PLATFORMS.find((entry) => entry === body["platform"]) ?? null;
  const message = typeof body["message"] === "string" ? body["message"].trim().slice(0, 2_000) : "";
  return {
    name,
    email,
    institution,
    role: text(body["role"], 120) || null,
    country: text(body["country"], 60) || null,
    students: Number.isInteger(students) && students > 0 && students < 1_000_000 ? students : null,
    platform,
    message: message || null,
  };
}

export interface B2bLeadStore {
  add(lead: B2bLead): Promise<void>;
}

class PostgresB2bLeadStore implements B2bLeadStore {
  constructor(private readonly pool: DbPool) {}
  async add(lead: B2bLead) {
    await this.pool.query(
      `INSERT INTO b2b_leads (name, email, institution, role, country, students, platform, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [lead.name, lead.email, lead.institution, lead.role, lead.country, lead.students, lead.platform, lead.message],
    );
  }
}

class MemoryB2bLeadStore implements B2bLeadStore {
  readonly leads: B2bLead[] = [];
  async add(lead: B2bLead) {
    this.leads.push(lead);
  }
}

export function createB2bLeadStore(pool: DbPool | null): B2bLeadStore {
  return pool ? new PostgresB2bLeadStore(pool) : new MemoryB2bLeadStore();
}
