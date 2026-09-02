/**
 * Who is paying, and in what state.
 *
 * Deliberately separate from `entitlements`. An entitlement answers "does this
 * identity have premium right now"; a subscription answers "does this identity
 * have a billing relationship, and what is Mercado Pago saying about it". They
 * diverge in the case that matters most: someone cancels on the 3rd having paid
 * through the 30th. The subscription is cancelled, the grant runs to the end of
 * the period, and collapsing them would either cut them off early or leave them
 * premium forever.
 */
import type { DbPool } from "../db/index.js";
import type { PreapprovalStatus } from "./mercadopago.js";

export interface Subscription {
  ownerId: string;
  externalId: string;
  status: PreapprovalStatus;
  periodEnd: string | null;
  updatedAt: string;
}

export interface SubscriptionStore {
  /** Inserts or replaces the row for an owner. One subscription each. */
  put(input: {
    ownerId: string;
    externalId: string;
    status: PreapprovalStatus;
    periodEnd: Date | null;
  }): Promise<void>;
  forOwner(ownerId: string): Promise<Subscription | null>;
  /** Resolves the owner from the provider's id, which is all a webhook has. */
  byExternalId(externalId: string): Promise<Subscription | null>;
  transfer(fromOwnerId: string, toOwnerId: string): Promise<void>;
  eraseOwner(ownerId: string): Promise<void>;
}

class PostgresSubscriptionStore implements SubscriptionStore {
  constructor(private readonly pool: DbPool) {}

  async put(input: {
    ownerId: string;
    externalId: string;
    status: PreapprovalStatus;
    periodEnd: Date | null;
  }) {
    await this.pool.query(
      `INSERT INTO subscriptions (owner_id, external_id, status, period_end, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (owner_id) DO UPDATE SET
         external_id = EXCLUDED.external_id,
         status = EXCLUDED.status,
         period_end = EXCLUDED.period_end,
         updated_at = now()`,
      [input.ownerId, input.externalId, input.status, input.periodEnd],
    );
  }

  async forOwner(ownerId: string): Promise<Subscription | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_id, external_id, status, period_end, updated_at
         FROM subscriptions WHERE owner_id = $1`,
      [ownerId],
    );
    return rows[0] ? toSubscription(rows[0]) : null;
  }

  async byExternalId(externalId: string): Promise<Subscription | null> {
    const { rows } = await this.pool.query(
      `SELECT owner_id, external_id, status, period_end, updated_at
         FROM subscriptions WHERE external_id = $1`,
      [externalId],
    );
    return rows[0] ? toSubscription(rows[0]) : null;
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    // The account's own subscription wins if it already has one; the guest's
    // is dropped rather than colliding with the primary key.
    await this.pool.query(
      `UPDATE subscriptions SET owner_id = $2 WHERE owner_id = $1
        AND NOT EXISTS (SELECT 1 FROM subscriptions WHERE owner_id = $2)`,
      [fromOwnerId, toOwnerId],
    );
    await this.pool.query(`DELETE FROM subscriptions WHERE owner_id = $1`, [fromOwnerId]);
  }

  async eraseOwner(ownerId: string) {
    await this.pool.query(`DELETE FROM subscriptions WHERE owner_id = $1`, [ownerId]);
  }
}

function toSubscription(row: Record<string, unknown>): Subscription {
  return {
    ownerId: row.owner_id as string,
    externalId: row.external_id as string,
    status: row.status as PreapprovalStatus,
    periodEnd: row.period_end ? new Date(row.period_end as string).toISOString() : null,
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

class MemorySubscriptionStore implements SubscriptionStore {
  private readonly byOwner = new Map<string, Subscription>();

  async put(input: {
    ownerId: string;
    externalId: string;
    status: PreapprovalStatus;
    periodEnd: Date | null;
  }) {
    this.byOwner.set(input.ownerId, {
      ownerId: input.ownerId,
      externalId: input.externalId,
      status: input.status,
      periodEnd: input.periodEnd ? input.periodEnd.toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
  }

  async forOwner(ownerId: string) {
    return this.byOwner.get(ownerId) ?? null;
  }

  async byExternalId(externalId: string) {
    return (
      [...this.byOwner.values()].find((row) => row.externalId === externalId) ?? null
    );
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    if (fromOwnerId === toOwnerId) return;
    const incoming = this.byOwner.get(fromOwnerId);
    if (!incoming) return;
    if (!this.byOwner.has(toOwnerId)) {
      this.byOwner.set(toOwnerId, { ...incoming, ownerId: toOwnerId });
    }
    this.byOwner.delete(fromOwnerId);
  }

  async eraseOwner(ownerId: string) {
    this.byOwner.delete(ownerId);
  }
}

export function createSubscriptionStore(pool: DbPool | null): SubscriptionStore {
  return pool ? new PostgresSubscriptionStore(pool) : new MemorySubscriptionStore();
}
