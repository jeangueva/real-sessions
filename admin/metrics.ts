/**
 * The numbers, from raw rows.
 *
 * Loading and counting are kept apart: `load` asks the stores for a handful of
 * small, already-grouped result sets, and `summarise` is a pure function over
 * them. The counting is what has to be right, and a pure function is the only
 * kind that can be tested against a hand-made week of data.
 *
 * Accounts live in Redis and everything else in Postgres; the account id is
 * the `owner_id` in every table, which is the one join this needs.
 */
import type { Pool } from "pg";
import type { RedisClientType } from "redis";

export interface AccountRow {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt?: string;
  /** Null for Google-only accounts. */
  passwordHash?: string | null;
}

export interface OwnerActivity {
  ownerId: string;
  started: number;
  completed: number;
  firstAt: string;
  lastAt: string;
}

export interface DayCount {
  day: string;
  started: number;
  completed: number;
}

export interface PremiumGrant {
  ownerId: string;
  source: string;
}

export interface SubscriptionRow {
  ownerId: string;
  provider: string;
  status: string;
  periodEnd: string | null;
  createdAt: string;
}

export interface Raw {
  accounts: AccountRow[];
  activity: OwnerActivity[];
  /** One row per day for the window, oldest first; days with nothing may be absent. */
  days: DayCount[];
  premium: PremiumGrant[];
  subscriptions: SubscriptionRow[];
  /** Users active in the last 7 / 30 days, by sessions started. */
  active7: string[];
  active30: string[];
}

export interface UserRow {
  email: string;
  createdAt: string;
  verified: boolean;
  google: boolean;
  plan: "premium" | "free";
  /** Why premium: subscription, early-access, manual, forever… */
  source: string | null;
  provider: string | null;
  completed: number;
  lastAt: string | null;
}

export interface Summary {
  generatedAt: string;
  accounts: { total: number; verified: number; new7: number; new30: number };
  active: { d7: number; d30: number };
  plans: { premium: number; free: number; bySource: Record<string, number> };
  subscriptions: { active: number; byProvider: Record<string, number>; byStatus: Record<string, number> };
  /** Percent of accounts paying through a subscription. */
  paidConversion: number;
  funnel: { label: string; count: number }[];
  signupsByDay: { day: string; count: number }[];
  interviewsByDay: DayCount[];
  users: UserRow[];
}

/** Statuses the providers use for a subscription that is currently paid for. */
const LIVE_STATUSES = new Set(["authorized", "active", "trialing", "past_due"]);

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** The last `count` UTC days, oldest first, ending today. */
export function lastDays(count: number, now: Date): string[] {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10));
  }
  return days;
}

function tally<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

export function summarise(raw: Raw, now = new Date()): Summary {
  const accountIds = new Set(raw.accounts.map((account) => account.id));
  const since = (days: number) => now.getTime() - days * 86_400_000;

  // Only grants and activity that belong to an account that still exists:
  // an erased account's rows would otherwise inflate every ratio.
  const premiumByOwner = new Map<string, string>();
  for (const grant of raw.premium) {
    if (!accountIds.has(grant.ownerId)) continue;
    // A subscription is the most informative reason; keep it over the others.
    if (!premiumByOwner.has(grant.ownerId) || grant.source === "subscription") {
      premiumByOwner.set(grant.ownerId, grant.source);
    }
  }
  const activityByOwner = new Map(raw.activity.map((row) => [row.ownerId, row]));
  const subscriptionByOwner = new Map(raw.subscriptions.map((row) => [row.ownerId, row]));
  const liveSubscriptions = raw.subscriptions.filter(
    (row) => accountIds.has(row.ownerId) && LIVE_STATUSES.has(row.status.toLowerCase()),
  );

  const started = raw.accounts.filter((account) => (activityByOwner.get(account.id)?.started ?? 0) > 0);
  const completedOne = raw.accounts.filter((account) => (activityByOwner.get(account.id)?.completed ?? 0) >= 1);
  const completedThree = raw.accounts.filter((account) => (activityByOwner.get(account.id)?.completed ?? 0) >= 3);
  const paying = new Set(liveSubscriptions.map((row) => row.ownerId));

  const signups = tally(raw.accounts, (account) => dayKey(account.createdAt));
  const interviews = new Map(raw.days.map((row) => [row.day, row]));
  const window = lastDays(30, now);

  const users: UserRow[] = raw.accounts
    .map((account) => {
      const activity = activityByOwner.get(account.id);
      const source = premiumByOwner.get(account.id) ?? null;
      const subscription = subscriptionByOwner.get(account.id);
      return {
        email: account.email,
        createdAt: account.createdAt,
        verified: Boolean(account.emailVerifiedAt),
        google: account.passwordHash === null,
        plan: source ? ("premium" as const) : ("free" as const),
        source,
        provider: subscription && LIVE_STATUSES.has(subscription.status.toLowerCase()) ? subscription.provider : null,
        completed: activity?.completed ?? 0,
        lastAt: activity?.lastAt ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = raw.accounts.length;
  return {
    generatedAt: now.toISOString(),
    accounts: {
      total,
      verified: raw.accounts.filter((account) => account.emailVerifiedAt).length,
      new7: raw.accounts.filter((account) => new Date(account.createdAt).getTime() >= since(7)).length,
      new30: raw.accounts.filter((account) => new Date(account.createdAt).getTime() >= since(30)).length,
    },
    active: {
      d7: raw.active7.filter((id) => accountIds.has(id)).length,
      d30: raw.active30.filter((id) => accountIds.has(id)).length,
    },
    plans: {
      premium: premiumByOwner.size,
      free: total - premiumByOwner.size,
      bySource: tally([...premiumByOwner.values()], (source) => source),
    },
    subscriptions: {
      active: liveSubscriptions.length,
      byProvider: tally(liveSubscriptions, (row) => row.provider),
      byStatus: tally(
        raw.subscriptions.filter((row) => accountIds.has(row.ownerId)),
        (row) => row.status.toLowerCase(),
      ),
    },
    paidConversion: total === 0 ? 0 : Math.round((paying.size / total) * 1000) / 10,
    funnel: [
      { label: "Registered", count: total },
      { label: "Started an interview", count: started.length },
      { label: "Finished one", count: completedOne.length },
      { label: "Finished three", count: completedThree.length },
      { label: "Paying", count: paying.size },
    ],
    signupsByDay: window.map((day) => ({ day, count: signups[day] ?? 0 })),
    interviewsByDay: window.map((day) => interviews.get(day) ?? { day, started: 0, completed: 0 }),
    users,
  };
}

/** Every account record in Redis, by SCAN — never KEYS, which blocks the server. */
async function loadAccounts(redis: RedisClientType): Promise<AccountRow[]> {
  const keys: string[] = [];
  for await (const batch of redis.scanIterator({ MATCH: "rs:account:*", COUNT: 500 })) {
    keys.push(...(Array.isArray(batch) ? batch : [batch]));
  }
  const accounts: AccountRow[] = [];
  for (let i = 0; i < keys.length; i += 200) {
    const values = await redis.mGet(keys.slice(i, i + 200));
    for (const value of values) {
      if (typeof value !== "string") continue;
      try {
        const parsed = JSON.parse(value) as AccountRow;
        if (parsed.id && parsed.email && parsed.createdAt) accounts.push(parsed);
      } catch {
        /* not an account record */
      }
    }
  }
  return accounts;
}

const iso = (value: unknown): string => (value instanceof Date ? value.toISOString() : String(value));

export async function load(pool: Pool, redis: RedisClientType): Promise<Raw> {
  const [accounts, activity, days, premium, subscriptions, active7, active30] = await Promise.all([
    loadAccounts(redis),
    pool.query(
      `SELECT owner_id, COUNT(*)::int AS started, COUNT(completed_at)::int AS completed,
              MIN(started_at) AS first_at, MAX(started_at) AS last_at
         FROM sessions GROUP BY owner_id`,
    ),
    pool.query(
      `SELECT to_char((started_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
              COUNT(*)::int AS started, COUNT(completed_at)::int AS completed
         FROM sessions WHERE started_at >= now() - interval '30 days'
        GROUP BY 1 ORDER BY 1`,
    ),
    pool.query(
      `SELECT DISTINCT owner_id, source FROM entitlements
        WHERE plan = 'premium' AND (expires_at IS NULL OR expires_at > now())`,
    ),
    pool.query(`SELECT owner_id, provider, status, period_end, created_at FROM subscriptions`),
    pool.query(`SELECT DISTINCT owner_id FROM sessions WHERE started_at >= now() - interval '7 days'`),
    pool.query(`SELECT DISTINCT owner_id FROM sessions WHERE started_at >= now() - interval '30 days'`),
  ]);
  return {
    accounts,
    activity: activity.rows.map((row) => ({
      ownerId: row.owner_id as string,
      started: row.started as number,
      completed: row.completed as number,
      firstAt: iso(row.first_at),
      lastAt: iso(row.last_at),
    })),
    days: days.rows.map((row) => ({
      day: row.day as string,
      started: row.started as number,
      completed: row.completed as number,
    })),
    premium: premium.rows.map((row) => ({ ownerId: row.owner_id as string, source: row.source as string })),
    subscriptions: subscriptions.rows.map((row) => ({
      ownerId: row.owner_id as string,
      provider: row.provider as string,
      status: row.status as string,
      periodEnd: row.period_end ? iso(row.period_end) : null,
      createdAt: iso(row.created_at),
    })),
    active7: active7.rows.map((row) => row.owner_id as string),
    active30: active30.rows.map((row) => row.owner_id as string),
  };
}
