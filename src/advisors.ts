/**
 * Thesis advisors: the channel the students already trust.
 *
 * An advisor gets a code and a link. A student who arrives through the link,
 * or types the code, is linked to them — and two different things follow
 * from that, kept apart on purpose:
 *
 *   The commission. Every pack, pass or group plan a linked student buys
 *   earns the advisor 30%, recorded at the payment. That needs no consent
 *   from the student: nothing about them is shown to anyone.
 *
 *   The progress. What the advisor sees — thesis title, rehearsals, the last
 *   record, readiness — only for students who chose to share it. Arriving by
 *   a link is not agreeing to be watched.
 *
 * One advisor per student. The first link wins, so the advisor who brought
 * them keeps the commission, and changing advisor is the student's own act.
 */
import { randomBytes } from "node:crypto";
import type { DbPool } from "./db/index.js";

export const COMMISSION_RATE = 0.3;

/**
 * How commissions are paid out.
 *
 * A commission waits HOLD_DAYS before it can be paid — the same seven days a
 * buyer has to ask for a refund, so nobody is paid for a sale that comes back.
 * Payouts go out in the first PAYOUT_DAY days of each month, for whatever is
 * available, once it reaches MIN_PAYOUT; below that it rolls over, because a
 * transfer for a few soles costs more attention than it is worth.
 */
export const HOLD_DAYS = 7;
export const MIN_PAYOUT = Number(process.env.AFFILIATE_MIN_PAYOUT ?? 50);
export const PAYOUT_DAY = 10;

export interface PayoutSummary {
  /** Inside the refund window. */
  held: number;
  /** Past it and unpaid: what the next payout covers. */
  available: number;
  paid: number;
  count: number;
  /** YYYY-MM-DD: the last day of the next payout window. */
  nextPayout: string;
  /** Whether `available` reaches the minimum. */
  payable: boolean;
  minimum: number;
  holdDays: number;
}

export function payoutSummary(commissions: readonly Commission[], now = new Date()): PayoutSummary {
  const cutoff = now.getTime() - HOLD_DAYS * 86_400_000;
  const round = (value: number) => Math.round(value * 100) / 100;
  let held = 0;
  let available = 0;
  let paid = 0;
  for (const entry of commissions) {
    if (entry.paidAt) paid += entry.amount;
    else if (Date.parse(entry.createdAt) > cutoff) held += entry.amount;
    else available += entry.amount;
  }
  // This month's window while it is open, otherwise next month's.
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + (now.getUTCDate() <= PAYOUT_DAY ? 0 : 1);
  const next = new Date(Date.UTC(year, month, PAYOUT_DAY)).toISOString().slice(0, 10);
  return {
    held: round(held),
    available: round(available),
    paid: round(paid),
    count: commissions.length,
    nextPayout: next,
    payable: available >= MIN_PAYOUT,
    minimum: MIN_PAYOUT,
    holdDays: HOLD_DAYS,
  };
}

export interface Advisor {
  ownerId: string;
  code: string;
  name: string;
  createdAt: string;
  /** How they want to be paid; null until they say. */
  payout?: Payout | null;
}

/** Where an affiliate's commissions go. Paid by hand from the admin. */
export interface Payout {
  method: "yape" | "plin" | "transferencia" | "paypal";
  /** The phone, account number or PayPal email. */
  account: string;
  holder: string;
}

export function readPayout(body: Record<string, unknown>): Payout | null {
  const method = (["yape", "plin", "transferencia", "paypal"] as const).find((entry) => entry === body["method"]);
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const account = text(body["account"], 120);
  const holder = text(body["holder"], 120);
  if (!method || account.length < 4 || holder.length < 3) return null;
  return { method, account, holder };
}

export interface AdvisorLink {
  studentId: string;
  code: string;
  share: boolean;
  linkedAt: string;
}

export interface Commission {
  paymentId: string;
  studentId: string;
  amount: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
}

/** Six characters, no 0/O or 1/I: read aloud in a classroom and typed on a phone. */
export function newAdvisorCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

export function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

export interface AdvisorStore {
  get(ownerId: string): Promise<Advisor | null>;
  byCode(code: string): Promise<Advisor | null>;
  create(ownerId: string, name: string): Promise<Advisor>;
  /** First link wins unless `replace`: the student changing advisor on purpose. */
  link(studentId: string, code: string, share: boolean, replace?: boolean): Promise<AdvisorLink | null>;
  linkOf(studentId: string): Promise<AdvisorLink | null>;
  setShare(studentId: string, share: boolean): Promise<void>;
  unlink(studentId: string): Promise<void>;
  students(code: string): Promise<AdvisorLink[]>;
  /** Idempotent on the payment. */
  recordCommission(code: string, commission: Omit<Commission, "createdAt" | "paidAt">): Promise<boolean>;
  commissions(code: string): Promise<Commission[]>;
  eraseOwner(ownerId: string): Promise<void>;
  setPayout(ownerId: string, payout: Payout): Promise<void>;
}

class PostgresAdvisorStore implements AdvisorStore {
  constructor(private readonly pool: DbPool) {}

  private toAdvisor(row: Record<string, unknown>): Advisor {
    return {
      ownerId: row.owner_id as string,
      code: row.code as string,
      name: row.name as string,
      createdAt: new Date(row.created_at as string).toISOString(),
      payout: (row.payout as Payout | null) ?? null,
    };
  }

  private toLink(row: Record<string, unknown>): AdvisorLink {
    return {
      studentId: row.student_id as string,
      code: row.advisor_code as string,
      share: Boolean(row.share),
      linkedAt: new Date(row.linked_at as string).toISOString(),
    };
  }

  async get(ownerId: string) {
    const { rows } = await this.pool.query(`SELECT * FROM advisors WHERE owner_id = $1`, [ownerId]);
    return rows[0] ? this.toAdvisor(rows[0]) : null;
  }

  async byCode(code: string) {
    const { rows } = await this.pool.query(`SELECT * FROM advisors WHERE code = $1`, [code]);
    return rows[0] ? this.toAdvisor(rows[0]) : null;
  }

  async create(ownerId: string, name: string) {
    const existing = await this.get(ownerId);
    if (existing) return existing;
    // A collision in 32^6 is rare; trying a few times makes it a non-event.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await this.pool.query(
        `INSERT INTO advisors (owner_id, code, name) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING RETURNING *`,
        [ownerId, newAdvisorCode(), name],
      );
      if (result.rows[0]) return this.toAdvisor(result.rows[0]);
    }
    throw new Error("Could not create an advisor code.");
  }

  async link(studentId: string, code: string, share: boolean, replace = false) {
    const result = await this.pool.query(
      replace
        ? `INSERT INTO advisor_links (student_id, advisor_code, share) VALUES ($1, $2, $3)
           ON CONFLICT (student_id) DO UPDATE SET advisor_code = EXCLUDED.advisor_code, share = EXCLUDED.share, linked_at = now()
           RETURNING *`
        : `INSERT INTO advisor_links (student_id, advisor_code, share) VALUES ($1, $2, $3)
           ON CONFLICT (student_id) DO NOTHING RETURNING *`,
      [studentId, code, share],
    );
    return result.rows[0] ? this.toLink(result.rows[0]) : this.linkOf(studentId);
  }

  async linkOf(studentId: string) {
    const { rows } = await this.pool.query(`SELECT * FROM advisor_links WHERE student_id = $1`, [studentId]);
    return rows[0] ? this.toLink(rows[0]) : null;
  }

  async setShare(studentId: string, share: boolean) {
    await this.pool.query(`UPDATE advisor_links SET share = $2 WHERE student_id = $1`, [studentId, share]);
  }

  async unlink(studentId: string) {
    await this.pool.query(`DELETE FROM advisor_links WHERE student_id = $1`, [studentId]);
  }

  async students(code: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM advisor_links WHERE advisor_code = $1 ORDER BY linked_at DESC LIMIT 500`,
      [code],
    );
    return rows.map((row) => this.toLink(row));
  }

  async recordCommission(code: string, commission: Omit<Commission, "createdAt" | "paidAt">) {
    const result = await this.pool.query(
      `INSERT INTO advisor_commissions (payment_id, advisor_code, student_id, amount, currency)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (payment_id) DO NOTHING`,
      [commission.paymentId, code, commission.studentId, commission.amount, commission.currency],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async commissions(code: string) {
    const { rows } = await this.pool.query(
      `SELECT * FROM advisor_commissions WHERE advisor_code = $1 ORDER BY created_at DESC LIMIT 500`,
      [code],
    );
    return rows.map((row) => ({
      paymentId: row.payment_id as string,
      studentId: row.student_id as string,
      amount: Number(row.amount),
      currency: row.currency as string,
      createdAt: new Date(row.created_at as string).toISOString(),
      paidAt: row.paid_at ? new Date(row.paid_at as string).toISOString() : null,
    }));
  }

  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM advisor_links WHERE student_id = $1`, [ownerId]);
    // An advisor's own record goes; commissions already earned stay on the
    // books under the code, since they record payments that happened.
    await this.pool.query(`DELETE FROM advisors WHERE owner_id = $1`, [ownerId]);
  }

  async setPayout(ownerId: string, payout: Payout) {
    await this.pool.query(`UPDATE advisors SET payout = $2 WHERE owner_id = $1`, [ownerId, JSON.stringify(payout)]);
  }
}

class MemoryAdvisorStore implements AdvisorStore {
  private readonly advisors = new Map<string, Advisor>();
  private readonly links = new Map<string, AdvisorLink>();
  private readonly earned: (Commission & { code: string })[] = [];

  async get(ownerId: string) {
    return this.advisors.get(ownerId) ?? null;
  }
  async byCode(code: string) {
    return [...this.advisors.values()].find((entry) => entry.code === code) ?? null;
  }
  async create(ownerId: string, name: string) {
    const existing = this.advisors.get(ownerId);
    if (existing) return existing;
    const advisor = { ownerId, code: newAdvisorCode(), name, createdAt: new Date().toISOString() };
    this.advisors.set(ownerId, advisor);
    return advisor;
  }
  async link(studentId: string, code: string, share: boolean, replace = false) {
    if (!replace && this.links.has(studentId)) return this.links.get(studentId)!;
    const link = { studentId, code, share, linkedAt: new Date().toISOString() };
    this.links.set(studentId, link);
    return link;
  }
  async linkOf(studentId: string) {
    return this.links.get(studentId) ?? null;
  }
  async setShare(studentId: string, share: boolean) {
    const link = this.links.get(studentId);
    if (link) link.share = share;
  }
  async unlink(studentId: string) {
    this.links.delete(studentId);
  }
  async students(code: string) {
    return [...this.links.values()].filter((entry) => entry.code === code);
  }
  async recordCommission(code: string, commission: Omit<Commission, "createdAt" | "paidAt">) {
    if (this.earned.some((entry) => entry.paymentId === commission.paymentId)) return false;
    this.earned.push({ ...commission, code, createdAt: new Date().toISOString(), paidAt: null });
    return true;
  }
  async commissions(code: string) {
    return this.earned.filter((entry) => entry.code === code).map(({ code: _code, ...rest }) => rest);
  }
  async eraseOwner(ownerId: string) {
    this.links.delete(ownerId);
    this.advisors.delete(ownerId);
  }

  async setPayout(ownerId: string, payout: Payout) {
    const advisor = this.advisors.get(ownerId);
    if (advisor) advisor.payout = payout;
  }
}

export function createAdvisorStore(pool: DbPool | null): AdvisorStore {
  return pool ? new PostgresAdvisorStore(pool) : new MemoryAdvisorStore();
}
