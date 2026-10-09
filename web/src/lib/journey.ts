import type { ApplicationStatus } from "./api";

/**
 * Where somebody is on the way from their first practice to a job.
 *
 * The product's promise is not a score. It is the day someone sits a real
 * interview in English and the day they get the offer, and until now nothing
 * on screen said that was the destination — every number pointed back at the
 * practice itself. Four milestones, each one decided by something the person
 * actually did, never by time spent in the app:
 *
 *   first     one finished practice interview
 *   practice  PRACTICE_GOAL finished practice interviews
 *   real      an application they track has reached "interviewing"
 *   offer     an application they track has reached "offer"
 *
 * The real interview and the offer come from Applications, so a person who
 * does not track their search simply sees those two ahead of them. That is
 * the honest reading, and it is also the invitation to track it.
 */

export const PRACTICE_GOAL = 10;

export type MilestoneId = "first" | "practice" | "real" | "offer";
export type MilestoneState = "done" | "now" | "ahead";

export interface Milestone {
  id: MilestoneId;
  state: MilestoneState;
}

export function journey(
  completed: number,
  statuses: readonly ApplicationStatus[],
): Milestone[] {
  const reached: Record<MilestoneId, boolean> = {
    first: completed >= 1,
    practice: completed >= PRACTICE_GOAL,
    real: statuses.some((status) => status === "interviewing" || status === "offer"),
    offer: statuses.includes("offer"),
  };
  const order: MilestoneId[] = ["first", "practice", "real", "offer"];
  // "Now" is the first milestone not yet reached. Everything before it reads
  // as done even when it was skipped — someone who landed a real interview
  // after three practices has not failed the practice milestone, they
  // outgrew it.
  const furthest = order.reduce(
    (last, id, index) => (reached[id] ? index : last),
    -1,
  );
  return order.map((id, index) => ({
    id,
    state: index <= furthest ? "done" : index === furthest + 1 ? "now" : "ahead",
  }));
}

/** A calendar day in the reader's own timezone, as a sortable key. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** How many days a missed day stays forgiven for: one shield a week. */
export const SHIELD_DAYS = 7;

export interface Streak {
  /** Days practised in the unbroken run. A shielded day is not counted. */
  days: number;
  /** Whether a finished interview landed today. */
  today: boolean;
  /** The most recent day the shield covered, as YYYY-MM-DD, or null. */
  shielded: string | null;
  /** Whether a missed day today-or-tomorrow would still be forgiven. */
  shieldReady: boolean;
}

/**
 * Consecutive days, ending today or yesterday, with a finished interview —
 * and a shield that forgives one missed day a week.
 *
 * Yesterday counts as unbroken: at nine in the morning a streak that ran to
 * last night is still alive, and showing it as zero would punish someone for
 * not having practised yet today. Local days, not UTC — a session at eleven
 * at night in Lima belongs to that evening, not to tomorrow.
 *
 * The shield is Duolingo's streak freeze without the shop: nobody buys or
 * equips it. One missed day inside any seven is simply not a break, because
 * the habit this protects is "most days", and a streak lost to one bad
 * Tuesday teaches people to stop caring about it. Two missed days in a row
 * still end it — that is no longer a slip, it is a pause.
 */
export function streakState(completedAt: readonly string[], now = new Date()): Streak {
  const days = new Set(
    completedAt
      .map((iso) => new Date(iso))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(dayKey),
  );
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = days.has(dayKey(cursor));
  if (!today) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  let walked = 0;
  /** `walked` at the shield used nearest to today, if any. */
  let shieldAt: number | null = null;
  let shielded: string | null = null;
  for (;;) {
    if (days.has(dayKey(cursor))) {
      count += 1;
    } else {
      const before = new Date(cursor);
      before.setDate(before.getDate() - 1);
      const free = shieldAt === null || walked - shieldAt >= SHIELD_DAYS;
      // Only a gap with practice on both sides is a slip worth forgiving;
      // the start of a run is not a missed day.
      if (!free || count === 0 || !days.has(dayKey(before))) break;
      shieldAt = walked;
      shielded ??= dayKey(cursor);
    }
    walked += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  // The shield is spent if one was used within the last week of the run.
  const offsetToday = today ? 0 : 1;
  const nearest = shielded === null ? null : (() => {
    const [y, m, d] = shielded.split("-").map(Number);
    const at = new Date(y!, m! - 1, d!);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((start.getTime() - at.getTime()) / 86_400_000);
  })();
  return {
    days: count,
    today,
    shielded,
    shieldReady: count > 0 && (nearest === null || nearest + offsetToday >= SHIELD_DAYS),
  };
}

/** Consecutive days with a finished interview, shield included. */
export function streakDays(completedAt: readonly string[], today = new Date()): number {
  return streakState(completedAt, today).days;
}
