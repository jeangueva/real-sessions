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

/**
 * What can be bought. The pack is the defence itself; the pass is a month of
 * every mode for the student in the last stretch; the group pass is the same
 * for a thesis written by two or three. Prices are in the Mercado Pago
 * account's currency and overridable per deployment.
 */
export type PackKind = "sustentacion" | "intensivo" | "grupal" | "docente" | "asesor_pro";

export const PACK_KINDS: Record<
  PackKind,
  { credits: number; days: number; amount: number; title: string; modes: boolean; group: boolean; advisor?: boolean; mentor?: boolean }
> = {
  sustentacion: {
    credits: PACK_CREDITS,
    days: PACK_MONTHS * 30,
    amount: Number(process.env.DEFENSE_PACK_AMOUNT ?? 39),
    title: "Mockio — Pack Sustentación (5 ensayos, 6 meses)",
    modes: false,
    group: false,
  },
  intensivo: {
    credits: 20,
    days: 30,
    amount: Number(process.env.DEFENSE_INTENSIVO_AMOUNT ?? 79),
    title: "Mockio — Pase Intensivo (20 ensayos y todos los modos, 30 días)",
    modes: true,
    group: false,
  },
  grupal: {
    credits: 20,
    days: 30,
    amount: Number(process.env.DEFENSE_GRUPAL_AMOUNT ?? 119),
    title: "Mockio — Tesis grupal (20 ensayos, todos los modos y ensayo grupal, 30 días)",
    modes: true,
    group: true,
  },
  /**
   * The intensive pass plus thirty minutes with a real teacher, over the
   * record the panel left. The answer to "it is only an AI": arranged by
   * hand from the advisor network, and the anchor that makes the pack look
   * like what it is.
   */
  docente: {
    credits: 20,
    days: 30,
    amount: Number(process.env.DEFENSE_DOCENTE_AMOUNT ?? 189),
    title: "Mockio — Sustentación con docente (20 ensayos, todos los modos y 30 min con un docente, 30 días)",
    modes: true,
    group: false,
    mentor: true,
  },
  /**
   * For advisors: their students' rehearsals, paid by them. No credits of its
   * own — while it runs, up to ADVISOR_PRO_SEATS students who share their
   * progress get ADVISOR_PRO_CREDITS full defences each.
   */
  asesor_pro: {
    credits: 0,
    days: 30,
    amount: Number(process.env.DEFENSE_ASESOR_PRO_AMOUNT ?? 290),
    title: "Mockio — Asesor Pro (20 tesistas, 30 días)",
    modes: false,
    group: false,
    advisor: true,
  },
};

export const ADVISOR_PRO_SEATS = 20;
export const ADVISOR_PRO_CREDITS = 3;

export function isPackKind(value: unknown): value is PackKind {
  return typeof value === "string" && value in PACK_KINDS;
}

export interface PackGrant {
  paymentId: string;
  kind: PackKind;
  credits: number;
  grantedAt: string;
  expiresAt: string;
}

export interface DefensePackStore {
  /** Idempotent on the payment: a webhook and a return can both report it. */
  grant(ownerId: string, paymentId: string, kind?: PackKind): Promise<boolean>;
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

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** What an owner's packs in date unlock beyond credits. */
export function unlocks(packs: readonly PackGrant[]): { modes: boolean; group: boolean; mentor: boolean } {
  return {
    modes: packs.some((pack) => PACK_KINDS[pack.kind]?.modes),
    group: packs.some((pack) => PACK_KINDS[pack.kind]?.group),
    mentor: packs.some((pack) => PACK_KINDS[pack.kind]?.mentor === true),
  };
}

class PostgresDefensePackStore implements DefensePackStore {
  constructor(private readonly pool: DbPool) {}

  async grant(ownerId: string, paymentId: string, kind: PackKind = "sustentacion") {
    const offer = PACK_KINDS[kind];
    const result = await this.pool.query(
      `INSERT INTO defense_packs (owner_id, payment_id, kind, credits, expires_at)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (payment_id) DO NOTHING`,
      [ownerId, paymentId, kind, offer.credits, addDays(new Date(), offer.days).toISOString()],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async active(ownerId: string, now = new Date()) {
    const { rows } = await this.pool.query(
      `SELECT payment_id, kind, credits, granted_at, expires_at FROM defense_packs
        WHERE owner_id = $1 AND expires_at > $2 ORDER BY granted_at`,
      [ownerId, now.toISOString()],
    );
    return rows.map((row) => ({
      paymentId: row.payment_id as string,
      kind: (isPackKind(row.kind) ? row.kind : "sustentacion") as PackKind,
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

  async grant(ownerId: string, paymentId: string, kind: PackKind = "sustentacion") {
    if (this.rows.some((row) => row.paymentId === paymentId)) return false;
    const now = new Date();
    this.rows.push({
      ownerId,
      paymentId,
      kind,
      credits: PACK_KINDS[kind].credits,
      grantedAt: now.toISOString(),
      expiresAt: addDays(now, PACK_KINDS[kind].days).toISOString(),
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
