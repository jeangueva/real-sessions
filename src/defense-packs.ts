/**
 * The Pack Sustentación: five full defences, valid six months.
 *
 * Kept apart from the subscription plans. A defence is prepared for once, in
 * the weeks before a date, and a monthly plan is the wrong shape for it —
 * which is why it is sold as a one-time pack and counted in credits.
 *
 * Credits are not decremented anywhere. What is left is the packs still in
 * date, minus the full defences started since the oldest of them: the
 * sessions table already records every defence, and a second counter would
 * be one more thing to get out of step with it.
 */
import type { DbPool } from "./db/index.js";

export const PACK_CREDITS = 5;
export const PACK_MONTHS = 6;

export interface PackGrant {
  paymentId: string;
  credits: number;
  grantedAt: string;
  expiresAt: string;
}

export interface DefensePackStore {
  /** Idempotent on the payment: a webhook and a return can both report it. */
  grant(ownerId: string, paymentId: string, credits?: number, months?: number): Promise<boolean>;
  active(ownerId: string, now?: Date): Promise<PackGrant[]>;
  eraseOwner(ownerId: string): Promise<void>;
}

/** What is left, given the packs in date and when each full defence began. */
export function remainingCredits(packs: readonly PackGrant[], fullDefencesStartedAt: readonly string[]): number {
  if (packs.length === 0) return 0;
  const since = Math.min(...packs.map((pack) => Date.parse(pack.grantedAt)));
  const used = fullDefencesStartedAt.filter((at) => Date.parse(at) >= since).length;
  const total = packs.reduce((sum, pack) => sum + pack.credits, 0);
  return Math.max(0, total - used);
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

class PostgresDefensePackStore implements DefensePackStore {
  constructor(private readonly pool: DbPool) {}

  async grant(ownerId: string, paymentId: string, credits = PACK_CREDITS, months = PACK_MONTHS) {
    const result = await this.pool.query(
      `INSERT INTO defense_packs (owner_id, payment_id, credits, expires_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT (payment_id) DO NOTHING`,
      [ownerId, paymentId, credits, addMonths(new Date(), months).toISOString()],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async active(ownerId: string, now = new Date()) {
    const { rows } = await this.pool.query(
      `SELECT payment_id, credits, granted_at, expires_at FROM defense_packs
        WHERE owner_id = $1 AND expires_at > $2 ORDER BY granted_at`,
      [ownerId, now.toISOString()],
    );
    return rows.map((row) => ({
      paymentId: row.payment_id as string,
      credits: Number(row.credits),
      grantedAt: new Date(row.granted_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
    }));
  }

  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM defense_packs WHERE owner_id = $1`, [ownerId]);
  }
}

class MemoryDefensePackStore implements DefensePackStore {
  private readonly rows: (PackGrant & { ownerId: string })[] = [];

  async grant(ownerId: string, paymentId: string, credits = PACK_CREDITS, months = PACK_MONTHS) {
    if (this.rows.some((row) => row.paymentId === paymentId)) return false;
    const now = new Date();
    this.rows.push({
      ownerId,
      paymentId,
      credits,
      grantedAt: now.toISOString(),
      expiresAt: addMonths(now, months).toISOString(),
    });
    return true;
  }

  async active(ownerId: string, now = new Date()) {
    return this.rows
      .filter((row) => row.ownerId === ownerId && Date.parse(row.expiresAt) > now.getTime())
      .map(({ ownerId: _owner, ...grant }) => grant);
  }

  async eraseOwner(ownerId: string) {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      if (this.rows[index]!.ownerId === ownerId) this.rows.splice(index, 1);
    }
  }
}

export function createDefensePackStore(pool: DbPool | null): DefensePackStore {
  return pool ? new PostgresDefensePackStore(pool) : new MemoryDefensePackStore();
}
