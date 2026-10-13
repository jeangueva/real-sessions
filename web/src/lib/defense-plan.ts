/**
 * The days between today and the defence, each with one thing to do.
 *
 * One task a day, not a timetable: a student in the last weeks has classes,
 * a job and an advisor to chase, and a plan that asks for three hours a day
 * is a plan they abandon on the second. The anchors are the countdown mails'
 * days, so the plan on screen and the mail in the inbox say the same thing;
 * the days between them go to the thesis's own weak points, most serious
 * first, and to whatever the student has not done yet.
 */

export type PlanTask =
  | { kind: "diagnosis" }
  | { kind: "first-rehearsal" }
  | { kind: "risk"; question: string; page: number | null }
  | { kind: "slides" }
  | { kind: "study" }
  | { kind: "demanding" }
  | { kind: "short" }
  | { kind: "real-questions" }
  | { kind: "rest" };

export interface PlanDay {
  /** YYYY-MM-DD. */
  date: string;
  /** Days before the defence: 1 is the eve. */
  daysLeft: number;
  task: PlanTask;
}

export interface PlanInput {
  /** YYYY-MM-DD, today where the student is. */
  today: string;
  defenseDate: string;
  risks: { severity: "alta" | "media" | "baja"; likely_question: string; page: number | null }[];
  hasSlides: boolean;
  hasStudy: boolean;
  /** Full rehearsals finished so far. */
  rehearsals: number;
}

const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Today's date in the browser's own timezone, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA");
}

/**
 * The plan from today to the eve of the defence. Empty on the day itself and
 * after it — the day of has its own screen, and a plan for a past date is
 * nothing to do.
 */
export function buildPlan(input: PlanInput): PlanDay[] {
  const total = daysBetween(input.today, input.defenseDate);
  if (total <= 0) return [];

  const order = { alta: 0, media: 1, baja: 2 };
  const risks = [...input.risks].sort((a, b) => order[a.severity] - order[b.severity]);

  /** The fixed days, counted back from the defence. */
  const anchors = new Map<number, PlanTask>([
    [1, { kind: "short" }],
    [3, { kind: "demanding" }],
  ]);
  /** What the student has not done, in the order it pays off. */
  const pending: PlanTask[] = [];
  if (total >= 7) anchors.set(7, { kind: "first-rehearsal" });
  else if (input.rehearsals === 0) {
    // A short run-up and nothing rehearsed yet: the first full rehearsal
    // takes the demanding day, and the demanding one follows it.
    anchors.set(Math.min(3, total), { kind: "first-rehearsal" });
    if (total >= 3) pending.push({ kind: "demanding" });
  }
  if (input.rehearsals === 0 && total >= 5) pending.push({ kind: "diagnosis" });
  if (!input.hasSlides) pending.push({ kind: "slides" });
  if (!input.hasStudy) pending.push({ kind: "study" });
  pending.push({ kind: "real-questions" });

  let riskAt = 0;
  const days: PlanDay[] = [];
  for (let offset = 0; offset < total; offset += 1) {
    const daysLeft = total - offset;
    const anchored = anchors.get(daysLeft);
    let task: PlanTask;
    if (anchored) task = anchored;
    else if (pending.length > 0) task = pending.shift()!;
    else if (riskAt < risks.length) {
      const risk = risks[riskAt++]!;
      task = { kind: "risk", question: risk.likely_question, page: risk.page };
    } else task = { kind: "rest" };
    days.push({ date: addDays(input.today, offset), daysLeft, task });
  }
  return days;
}
