/**
 * What the admin can change, and the record that it did.
 *
 * Every operation here writes one row to `admin_audit` in the same transaction
 * as the change (or straight after it, for the two that live in Redis), naming
 * who did it, to whom, and with what values. A plan granted by hand with no
 * trace of who granted it is exactly the question nobody can answer in six
 * months.
 *
 * Inputs are validated here rather than trusted from the page: the page is
 * ours, but the endpoint is reachable by anyone holding a session cookie, and
 * a typo in a script should not grant a ten-thousand-year plan.
 */
import type { Pool, PoolClient } from "pg";
import type { RedisClientType } from "redis";

export class ActionError extends Error {}

export const ACTIONS = ["grant", "revoke", "verify", "rename", "coupon.create", "coupon.disable", "coupon.days"] as const;
export type ActionName = (typeof ACTIONS)[number];

const accountKey = (id: string) => `rs:account:${id}`;
const prefsKey = (id: string) => `rs:prefs:${id}`;

/** Days a manual grant may run: one day to five years, or open-ended. */
export function readDays(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 1825) {
    throw new ActionError("Los días deben ser un número entero entre 1 y 1825, o vacío para que no venza.");
  }
  return days;
}

/** A coupon code: 3–32 letters, digits, dash or underscore, stored upper-cased. */
export function readCode(value: unknown): string {
  const code = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new ActionError("El código debe tener de 3 a 32 letras, números, guiones o guiones bajos.");
  }
  return code;
}

function readCount(value: unknown, label: string, max: number): number {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > max) {
    throw new ActionError(`${label} debe ser un número entero entre 1 y ${max}.`);
  }
  return count;
}

function readDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new ActionError("La fecha de vencimiento debe ser futura.");
  }
  return date;
}

export function readName(value: unknown): string {
  const name = String(value ?? "").trim();
  if (name.length > 60) throw new ActionError("El nombre puede tener hasta 60 caracteres.");
  return name;
}

async function audit(
  db: Pool | PoolClient,
  actor: string,
  action: ActionName,
  target: string,
  detail: Record<string, unknown>,
): Promise<void> {
  await db.query(`INSERT INTO admin_audit (actor, action, target, detail) VALUES ($1, $2, $3, $4)`, [
    actor,
    action,
    target,
    JSON.stringify(detail),
  ]);
}

async function inTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function accountEmail(redis: RedisClientType, id: string): Promise<string> {
  const raw = await redis.get(accountKey(String(id)));
  if (!raw) throw new ActionError("Esa cuenta no existe.");
  return (JSON.parse(raw) as { email: string }).email;
}

export interface Deps {
  pool: Pool;
  redis: RedisClientType;
  actor: string;
}

/** Premium by hand. Source `manual`, so it is never confused with a payment. */
export async function grantPremium(deps: Deps, userId: string, rawDays: unknown, note: unknown): Promise<string> {
  const email = await accountEmail(deps.redis, userId);
  const days = readDays(rawDays);
  const reason = String(note ?? "").trim().slice(0, 200);
  const expiresAt = days === null ? null : new Date(Date.now() + days * 86_400_000);
  await inTransaction(deps.pool, async (client) => {
    await client.query(
      `INSERT INTO entitlements (owner_id, plan, source, expires_at) VALUES ($1, 'premium', 'manual', $2)`,
      [userId, expiresAt],
    );
    await audit(client, deps.actor, "grant", email, { days, reason });
  });
  return days === null ? `Premium otorgado a ${email} sin fecha de fin.` : `Premium otorgado a ${email} por ${days} días.`;
}

/**
 * Ends every live premium grant, whatever its source. Expires rather than
 * deletes, so the history of who had access, and until when, survives.
 *
 * It does not cancel a subscription with the payment provider — that would
 * keep charging them — so the caller is told to, when there is one.
 */
export async function revokePremium(deps: Deps, userId: string, note: unknown): Promise<string> {
  const email = await accountEmail(deps.redis, userId);
  const reason = String(note ?? "").trim().slice(0, 200);
  const { sources, paying } = await inTransaction(deps.pool, async (client) => {
    const ended = await client.query(
      `UPDATE entitlements SET expires_at = now()
        WHERE owner_id = $1 AND plan = 'premium' AND (expires_at IS NULL OR expires_at > now())
        RETURNING source`,
      [userId],
    );
    const subscription = await client.query(
      `SELECT provider FROM subscriptions WHERE owner_id = $1 AND lower(status) IN ('authorized','active','trialing','past_due')`,
      [userId],
    );
    const sources = [...new Set(ended.rows.map((row) => row.source as string))];
    await audit(client, deps.actor, "revoke", email, { sources, reason });
    return { sources, paying: subscription.rows[0]?.provider as string | undefined };
  });
  if (sources.length === 0) return `${email} no tenía premium activo.`;
  return paying
    ? `Premium retirado a ${email}. Todavía tiene una suscripción activa en ${paying}: cancélala ahí también o le seguirán cobrando.`
    : `Premium retirado a ${email}.`;
}

/** Marks the email as confirmed, for someone whose confirmation mail never arrived. */
export async function verifyEmail(deps: Deps, userId: string): Promise<string> {
  const raw = await deps.redis.get(accountKey(userId));
  if (!raw) throw new ActionError("Esa cuenta no existe.");
  const account = JSON.parse(raw) as { email: string; emailVerifiedAt?: string };
  if (!account.emailVerifiedAt) {
    await deps.redis.set(accountKey(userId), JSON.stringify({ ...account, emailVerifiedAt: new Date().toISOString() }), {
      KEEPTTL: true,
    });
  }
  await audit(deps.pool, deps.actor, "verify", account.email, {});
  return `${account.email} quedó como verificado.`;
}

/** The name the interviewer greets them by. Kept with their other preferences. */
export async function renameUser(deps: Deps, userId: string, rawName: unknown): Promise<string> {
  const email = await accountEmail(deps.redis, userId);
  const name = readName(rawName);
  const raw = await deps.redis.get(prefsKey(userId));
  const prefs = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  await deps.redis.set(prefsKey(userId), JSON.stringify({ ...prefs, candidateName: name }), { KEEPTTL: true });
  await audit(deps.pool, deps.actor, "rename", email, { name });
  return name ? `${email} ahora se llama ${name}.` : `Se borró el nombre de ${email}.`;
}

export async function createCoupon(
  deps: Deps,
  input: { code: unknown; grantDays: unknown; cap: unknown; expiresAt: unknown },
): Promise<string> {
  const code = readCode(input.code);
  const grantDays = readCount(input.grantDays, "Los días de premium", 1825);
  const cap = readCount(input.cap, "Los usos", 100_000);
  const expiresAt = readDate(input.expiresAt);
  await inTransaction(deps.pool, async (client) => {
    const inserted = await client.query(
      `INSERT INTO promo_codes (code, grant_days, cap, expires_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      [code, grantDays, cap, expiresAt],
    );
    if (inserted.rowCount === 0) throw new ActionError(`${code} ya existe.`);
    await audit(client, deps.actor, "coupon.create", code, { grantDays, cap, expiresAt });
  });
  return `${code} creado: ${grantDays} días de premium, ${cap} usos.`;
}

/** Stops a code working now. Grants already redeemed run their course. */
export async function disableCoupon(deps: Deps, rawCode: unknown): Promise<string> {
  const code = readCode(rawCode);
  await inTransaction(deps.pool, async (client) => {
    const updated = await client.query(`UPDATE promo_codes SET expires_at = now() WHERE code = $1`, [code]);
    if (updated.rowCount === 0) throw new ActionError(`${code} no existe.`);
    await audit(client, deps.actor, "coupon.disable", code, {});
  });
  return `${code} ya no funciona. Quien ya lo canjeó conserva sus días.`;
}

/**
 * Changes how long a code's premium lasts. New redemptions get the new length
 * at once; with `extend`, everyone who already redeemed it is moved to the
 * new length too, counted from the day they redeemed.
 */
export async function setCouponDays(deps: Deps, rawCode: unknown, rawDays: unknown, extend: unknown): Promise<string> {
  const code = readCode(rawCode);
  const days = readCount(rawDays, "Los días de premium", 1825);
  const moveExisting = extend === true || extend === "on" || extend === "true";
  const moved = await inTransaction(deps.pool, async (client) => {
    const updated = await client.query(`UPDATE promo_codes SET grant_days = $2 WHERE code = $1`, [code, days]);
    if (updated.rowCount === 0) throw new ActionError(`${code} no existe.`);
    let count = 0;
    if (moveExisting) {
      const extended = await client.query(
        `UPDATE entitlements SET expires_at = granted_at + make_interval(days => $2)
          WHERE source = $1 AND expires_at IS NOT NULL`,
        [`promo:${code}`, days],
      );
      count = extended.rowCount ?? 0;
    }
    await audit(client, deps.actor, "coupon.days", code, { days, extendedExisting: moveExisting, moved: count });
    return count;
  });
  return moveExisting
    ? `${code} ahora da ${days} días. ${moved} ${moved === 1 ? "persona pasó" : "personas pasaron"} a ${days} días desde su canje.`
    : `${code} ahora da ${days} días a quien lo canjee desde hoy.`;
}
