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

/**
 * Sustentación: the thesis product, in numbers and in the advisors owed money.
 * Every query is guarded — on a database the product has not migrated yet, or
 * a role not yet granted these tables, the section reads as empty instead of
 * taking the whole dashboard down.
 */
export interface DefenseSummary {
  theses: number;
  defenses: { total: number; d7: number; d30: number; completed: number };
  packs: { kind: string; count: number; revenue: number }[];
  questionsPending: number;
  institutions: { code: string; name: string; seats: number; members: number; credits: number; expiresAt: string; owner: string | null }[];
  /** Universities' platforms connected over LTI, and who has launched from each. */
  platforms: { issuer: string; clientId: string; institution: string | null; users: number }[];
  /** The latest schools that asked to talk. */
  leads: { name: string; email: string; institution: string; role: string | null; country: string | null; students: number | null; platform: string | null; message: string | null; at: string }[];
  advisors: {
    code: string;
    name: string;
    email: string | null;
    linked: number;
    shared: number;
    sales: number;
    pending: number;
    paid: number;
    currency: string;
    /** How they want to be paid, as one line. */
    payout: string | null;
  }[];
}

const EMPTY_DEFENSE: DefenseSummary = {
  theses: 0,
  defenses: { total: 0, d7: 0, d30: 0, completed: 0 },
  packs: [],
  questionsPending: 0,
  institutions: [],
  platforms: [],
  leads: [],
  advisors: [],
};

async function loadDefense(pool: Pool, accounts: AccountRow[]): Promise<DefenseSummary> {
  const quiet = <T>(promise: Promise<{ rows: T[] }>) => promise.catch(() => ({ rows: [] as T[] }));
  const [theses, defenses, packs, questions, advisors, links, commissions, institutions, platforms, leads] = await Promise.all([
    quiet(pool.query(`SELECT count(*)::int AS n FROM theses`)),
    quiet(
      pool.query(
        `SELECT count(*)::int AS total,
                count(*) FILTER (WHERE started_at >= now() - interval '7 days')::int AS d7,
                count(*) FILTER (WHERE started_at >= now() - interval '30 days')::int AS d30,
                count(completed_at)::int AS completed
           FROM sessions WHERE stage LIKE 'Sustentación%'`,
      ),
    ),
    // Payment ids from the local tests are not sales: only Mercado Pago's.
    quiet(pool.query(`SELECT kind, count(*)::int AS n FROM defense_packs WHERE payment_id ~ '^[0-9]+$' GROUP BY kind`)),
    quiet(pool.query(`SELECT count(*)::int AS n FROM defense_questions WHERE status = 'pending'`)),
    quiet(pool.query(`SELECT owner_id, code, name, payout FROM advisors`)),
    quiet(
      pool.query(
        `SELECT advisor_code, count(*)::int AS linked, count(*) FILTER (WHERE share)::int AS shared
           FROM advisor_links GROUP BY advisor_code`,
      ),
    ),
    quiet(
      pool.query(
        `SELECT advisor_code, count(*)::int AS sales,
                COALESCE(sum(amount) FILTER (WHERE paid_at IS NULL), 0)::float AS pending,
                COALESCE(sum(amount) FILTER (WHERE paid_at IS NOT NULL), 0)::float AS paid,
                max(currency) AS currency
           FROM advisor_commissions GROUP BY advisor_code`,
      ),
    ),
    quiet(
      pool.query(
        `SELECT i.code, i.name, i.seats, i.credits_per_student, i.expires_at, i.owner_id,
                (SELECT count(*)::int FROM institution_members m WHERE m.code = i.code) AS members
           FROM institutions i ORDER BY i.created_at DESC`,
      ),
    ),
    quiet(
      pool.query(
        `SELECT p.issuer, p.client_id, p.institution_code,
                (SELECT count(*)::int FROM lti_users u WHERE u.platform_id = p.id) AS users
           FROM lti_platforms p ORDER BY p.created_at DESC`,
      ),
    ),
    quiet(pool.query(`SELECT * FROM b2b_leads ORDER BY created_at DESC LIMIT 50`)),
  ]);
  const prices: Record<string, number> = { sustentacion: 39, intensivo: 79, grupal: 119 };
  const byCode = <T extends { advisor_code: string }>(rows: T[]) => new Map(rows.map((row) => [row.advisor_code, row]));
  const linkRows = byCode(links.rows as { advisor_code: string; linked: number; shared: number }[]);
  const moneyRows = byCode(commissions.rows as { advisor_code: string; sales: number; pending: number; paid: number; currency: string }[]);
  const emails = new Map(accounts.map((account) => [account.id, account.email]));
  const first = (rows: { n?: number }[]) => rows[0]?.n ?? 0;
  const d = (defenses.rows[0] ?? {}) as { total?: number; d7?: number; d30?: number; completed?: number };
  return {
    theses: first(theses.rows as { n: number }[]),
    defenses: { total: d.total ?? 0, d7: d.d7 ?? 0, d30: d.d30 ?? 0, completed: d.completed ?? 0 },
    packs: (packs.rows as { kind: string; n: number }[]).map((row) => ({
      kind: row.kind,
      count: row.n,
      revenue: row.n * (prices[row.kind] ?? 0),
    })),
    questionsPending: first(questions.rows as { n: number }[]),
    institutions: (institutions.rows as Record<string, unknown>[]).map((row) => ({
      code: row.code as string,
      name: row.name as string,
      seats: Number(row.seats),
      members: Number(row.members),
      credits: Number(row.credits_per_student),
      expiresAt: iso(row.expires_at),
      owner: emails.get(row.owner_id as string) ?? null,
    })),
    platforms: (platforms.rows as Record<string, unknown>[]).map((row) => ({
      issuer: row.issuer as string,
      clientId: row.client_id as string,
      institution: (row.institution_code as string | null) ?? null,
      users: Number(row.users),
    })),
    leads: (leads.rows as Record<string, unknown>[]).map((row) => ({
      name: row.name as string,
      email: row.email as string,
      institution: row.institution as string,
      role: (row.role as string | null) ?? null,
      country: (row.country as string | null) ?? null,
      students: row.students === null ? null : Number(row.students),
      platform: (row.platform as string | null) ?? null,
      message: (row.message as string | null) ?? null,
      at: iso(row.created_at),
    })),
    advisors: (advisors.rows as { owner_id: string; code: string; name: string; payout: { method: string; account: string; holder: string } | null }[])
      .map((row) => ({
        code: row.code,
        name: row.name,
        email: emails.get(row.owner_id) ?? null,
        linked: linkRows.get(row.code)?.linked ?? 0,
        shared: linkRows.get(row.code)?.shared ?? 0,
        sales: moneyRows.get(row.code)?.sales ?? 0,
        pending: Number(moneyRows.get(row.code)?.pending ?? 0),
        paid: Number(moneyRows.get(row.code)?.paid ?? 0),
        currency: moneyRows.get(row.code)?.currency ?? "PEN",
        payout: row.payout ? `${row.payout.method} · ${row.payout.account} · ${row.payout.holder}` : null,
      }))
      .sort((a, b) => b.pending - a.pending || b.linked - a.linked),
  };
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
  /** Interviews started more than half an hour ago and never reported on. */
  unfinished: UnfinishedRow[];
  coupons: CouponRow[];
  audit: AuditRow[];
  /** Absent on fixtures written before the thesis product existed. */
  defense?: DefenseSummary;
}

export interface UnfinishedRow {
  ownerId: string;
  mode: string;
  level: string | null;
  startedAt: string;
  /** Answers the candidate gave before leaving. */
  answers: number;
  /** Who spoke last: "interviewer" means they left without answering. */
  lastSpeaker: "interviewer" | "candidate" | null;
  /** Whether any answer was spoken rather than typed. */
  spoke: boolean;
}

export interface CouponRow {
  code: string;
  grantDays: number;
  cap: number;
  redeemed: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface AuditRow {
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
}

/**
 * Where unfinished interviews stopped. Buckets by answers given, because the
 * cause differs: nothing answered is a microphone or a nerve; everything
 * answered is a report that was never asked for.
 */
export interface DropOff {
  total: number;
  buckets: { label: string; key: string; count: number }[];
  leftWaiting: number;
  spoke: number;
  typed: number;
  byMode: Record<string, number>;
  /** Unfinished interviews by people who have finished at least one other. */
  returning: number;
}

/** Answers that make a full interview; at or past this, the report is what is missing. */
export const FULL_INTERVIEW = 7;

export interface UserRow {
  id: string;
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
  dropOff: DropOff;
  coupons: CouponRow[];
  audit: AuditRow[];
  signupsByDay: { day: string; count: number }[];
  interviewsByDay: DayCount[];
  users: UserRow[];
  defense: DefenseSummary;
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
        id: account.id,
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

  const unfinished = raw.unfinished.filter((row) => accountIds.has(row.ownerId));
  const bucket = (from: number, to: number) => unfinished.filter((row) => row.answers >= from && row.answers <= to).length;
  const dropOff: DropOff = {
    total: unfinished.length,
    buckets: [
      { key: "none", label: "No answers", count: bucket(0, 0) },
      { key: "one", label: "1 answer", count: bucket(1, 1) },
      { key: "some", label: "2–3 answers", count: bucket(2, 3) },
      { key: "most", label: `4–${FULL_INTERVIEW - 1} answers`, count: bucket(4, FULL_INTERVIEW - 1) },
      { key: "all", label: "Answered everything", count: bucket(FULL_INTERVIEW, Number.MAX_SAFE_INTEGER) },
    ],
    leftWaiting: unfinished.filter((row) => row.lastSpeaker === "interviewer").length,
    spoke: unfinished.filter((row) => row.spoke).length,
    typed: unfinished.filter((row) => row.answers > 0 && !row.spoke).length,
    byMode: tally(unfinished, (row) => row.mode),
    returning: unfinished.filter((row) => (activityByOwner.get(row.ownerId)?.completed ?? 0) > 0).length,
  };

  const total = raw.accounts.length;
  return {
    defense: raw.defense ?? EMPTY_DEFENSE,
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
    dropOff,
    coupons: raw.coupons,
    audit: raw.audit,
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
  const [accounts, activity, days, premium, subscriptions, active7, active30, unfinished, coupons, audit] = await Promise.all([
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
    // Counts and the last speaker only — never the text of what was said.
    pool.query(
      `SELECT s.owner_id, s.mode, s.level, s.started_at,
              COUNT(t.idx) FILTER (WHERE t.speaker = 'candidate')::int AS answers,
              (ARRAY_AGG(t.speaker ORDER BY t.idx DESC))[1] AS last_speaker,
              COALESCE(BOOL_OR(t.speaker = 'candidate' AND t.t_start_ms IS NOT NULL), false) AS spoke
         FROM sessions s LEFT JOIN turns t ON t.session_id = s.id
        WHERE s.completed_at IS NULL AND s.started_at < now() - interval '30 minutes'
        GROUP BY s.id ORDER BY s.started_at DESC LIMIT 1000`,
    ),
    pool.query(`SELECT code, grant_days, cap, redeemed, expires_at, created_at FROM promo_codes ORDER BY created_at DESC`),
    // The log may not exist yet on a database the product has not migrated.
    pool
      .query(`SELECT at, actor, action, target, detail FROM admin_audit ORDER BY at DESC LIMIT 100`)
      .catch(() => ({ rows: [] as Record<string, unknown>[] })),
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
    unfinished: unfinished.rows.map((row) => ({
      ownerId: row.owner_id as string,
      mode: (row.mode as string) ?? "practice",
      level: (row.level as string | null) ?? null,
      startedAt: iso(row.started_at),
      answers: row.answers as number,
      lastSpeaker: (row.last_speaker as UnfinishedRow["lastSpeaker"]) ?? null,
      spoke: Boolean(row.spoke),
    })),
    coupons: coupons.rows.map((row) => ({
      code: row.code as string,
      grantDays: row.grant_days as number,
      cap: row.cap as number,
      redeemed: row.redeemed as number,
      expiresAt: row.expires_at ? iso(row.expires_at) : null,
      createdAt: iso(row.created_at),
    })),
    audit: audit.rows.map((row) => ({
      at: iso(row.at),
      actor: row.actor as string,
      action: row.action as string,
      target: row.target as string,
      detail: (row.detail as Record<string, unknown>) ?? {},
    })),
    defense: await loadDefense(pool, accounts).catch(() => EMPTY_DEFENSE),
  };
}
