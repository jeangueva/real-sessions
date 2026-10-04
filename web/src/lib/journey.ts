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

/**
 * Consecutive days, ending today or yesterday, with a finished interview.
 *
 * Yesterday counts as unbroken: at nine in the morning a streak that ran to
 * last night is still alive, and showing it as zero would punish someone for
 * not having practised yet today. Local days, not UTC — a session at eleven
 * at night in Lima belongs to that evening, not to tomorrow.
 */
export function streakDays(completedAt: readonly string[], today = new Date()): number {
  const days = new Set(
    completedAt
      .map((iso) => new Date(iso))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(dayKey),
  );
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
