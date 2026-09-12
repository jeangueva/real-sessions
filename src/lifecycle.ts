/**
 * Mail that is sent because time passed rather than because someone did
 * something.
 *
 * Everything else the product sends is transactional: a receipt, a failed
 * charge, a password change. Those answer an action the recipient just took
 * and nobody opts out of them. What is here is the other kind — a nudge after
 * a fortnight away, a weekly summary — and that difference is not cosmetic. It
 * decides who may be written to, how often, and whether an unsubscribe link is
 * required. It is, so there is one, and this module is where that rule lives
 * rather than being remembered at each call site.
 *
 * The scheduling itself is deliberately small. No queue, no worker, no second
 * service: a timer in the web process, a row per job saying when it last ran,
 * and a conditional update that makes the claim atomic. That is enough for
 * work measured in a handful of rows a day, and the alternative is
 * infrastructure that has to be operated before it has anything to do.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

/**
 * Whether this deployment may send lifecycle mail at all.
 *
 * Off unless asked for, and that default is a safety property rather than
 * caution. A developer's `.env` points at the same Postgres as production and
 * usually has a working mail provider, so a scheduler that ran on boot would
 * mail real customers from a laptop the first time anyone started the server.
 * The same applies to a staging copy of the database.
 *
 * Transactional mail is unaffected: a receipt or a password notice answers
 * something the recipient just did, and is only ever sent to the person doing
 * it. This gates the mail that goes out on a timer, to people who are not
 * there.
 */
export function lifecycleEmailEnabled(): boolean {
  return process.env.REALSESSIONS_LIFECYCLE_EMAIL === "1";
}

/** Every kind of lifecycle mail. The strings reach the database. */
export type LifecycleKind = "inactivity" | "weekly-digest";

export interface JobSchedule {
  /** Stable identifier; the primary key in `job_runs`. */
  job: string;
  /** How long between runs. */
  everyMs: number;
}

export const JOBS: JobSchedule[] = [
  // Daily. The job itself decides who is far enough away to hear from, so
  // running it more often than that only costs queries.
  { job: "inactivity", everyMs: 24 * 60 * 60 * 1000 },
  { job: "weekly-digest", everyMs: 7 * 24 * 60 * 60 * 1000 },
];

/**
 * Whether a job is due.
 *
 * Pure, and separate from claiming it, because this is the arithmetic worth
 * testing and the claim is a database round trip. A job that has never run is
 * due immediately — which means a deploy sends whatever was pending, and that
 * is the intended behaviour for a first run rather than waiting a full period
 * to start.
 */
export function isDue(lastRunAt: Date | null, everyMs: number, now = new Date()): boolean {
  if (!lastRunAt || Number.isNaN(lastRunAt.getTime())) return true;
  return now.getTime() - lastRunAt.getTime() >= everyMs;
}

/**
 * How long someone has to be gone before a nudge is worth sending.
 *
 * Fourteen days rather than seven. A week away from an interview-practice tool
 * is an ordinary week; two is the point where the habit has actually lapsed
 * and a reminder is information rather than nagging.
 */
export const INACTIVE_DAYS = 14;

/** And how long before the same person may be nudged again. */
export const NUDGE_COOLDOWN_DAYS = 30;

/**
 * A signed unsubscribe token.
 *
 * An HMAC of the address rather than a stored row, so a link in a mail sent
 * months ago still works without a table of tokens to keep. It is scoped with
 * its own label so it cannot be swapped for a token minted for anything else
 * signed with the same secret.
 */
export function unsubscribeToken(email: string): string {
  const secret = process.env.REALSESSIONS_SESSION_SECRET ?? "realsessions-dev-salt";
  return createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("hex");
}

/** Constant-time, so a wrong token cannot be found one character at a time. */
export function unsubscribeTokenValid(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

/** The link that has to appear in every lifecycle mail. */
export function unsubscribeUrl(siteUrl: string, email: string): string {
  const params = new URLSearchParams({ e: email, t: unsubscribeToken(email) });
  return `${siteUrl}/unsubscribe?${params.toString()}`;
}
