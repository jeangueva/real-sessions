import type { MessageKey } from "./i18n";
import type { SessionSummary } from "./api";

/**
 * What there is to be proud of, and what there is not.
 *
 * This is the whole product decision behind the share card, so it lives in one
 * pure module rather than inside the screen that draws it.
 *
 * Strava works because "ran 10 km" costs nothing to say. The equivalent here
 * does not exist: "scored 62% in my English interview" is a confession of
 * weakness published in the place where people are looking for work. A card
 * whose only stat is a score is a card nobody posts, and a share feature
 * nobody uses is dead weight on every screen it appears on.
 *
 * What IS boastable is effort, which is also the part that is actually
 * impressive: six weeks in a row, four this week, two hours of speaking
 * English out loud. So the score exists — some people are proud of theirs and
 * should be able to say so — and it is marked `sensitive`, which is how the
 * card knows never to offer it first.
 *
 * Every number here is derived from sessions already on the client. Nothing is
 * fetched for this, nothing is stored, and no new endpoint exists: a stat that
 * needed its own round trip would be a stat computed twice and eventually
 * disagreeing with the history screen it came from.
 */

export interface ShareStat {
  id: ShareStatId;
  /** The number, as it is drawn. Large type, read at a glance. */
  value: string;
  /** What the number is. Carries the unit, so it pluralises per language. */
  labelKey: MessageKey;
  /**
   * Whether publishing this says something unflattering.
   *
   * The card never selects a sensitive stat by default. Offering it is
   * correct; choosing it on somebody's behalf is not.
   */
  sensitive: boolean;
}

export type ShareStatId =
  | "streak"
  | "thisWeek"
  | "total"
  | "level"
  | "spoken"
  | "best";

/**
 * The Monday a date belongs to, in UTC.
 *
 * Mirrors `weekStart` in the server, deliberately and not by import — the
 * client cannot reach server code, and a week that began on a different day
 * here would make this card disagree with the quota the setup screen shows.
 */
export function weekStart(at: Date): number {
  const start = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
  // getUTCDay is 0 on Sunday, which belongs to the week that began six days
  // earlier rather than the one starting tomorrow.
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Consecutive weeks ending with the current one, counting only weeks that
 * have a finished interview in them.
 *
 * The current week is allowed to be empty without breaking the streak: it is
 * Monday morning for somebody, and telling them their six-week streak is over
 * because they have not practised yet today is both wrong and the single
 * fastest way to lose them. An empty current week holds the streak at what
 * last week earned.
 */
export function weekStreak(completedAt: readonly string[], now: Date): number {
  const weeks = new Set(completedAt.map((iso) => weekStart(new Date(iso))));
  if (weeks.size === 0) return 0;

  const current = weekStart(now);
  // Start from the current week if it has one, otherwise from last week — and
  // if last week is also empty, the streak really is broken.
  let cursor = weeks.has(current) ? current : current - WEEK_MS;
  if (!weeks.has(cursor)) return 0;

  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= WEEK_MS;
  }
  return streak;
}

/**
 * The stats worth drawing, best first.
 *
 * Ordered by what a reader would stop scrolling for, not by what is easiest to
 * compute: a streak is a story, a total is a fact. Stats with nothing behind
 * them are omitted rather than shown as zero — "0 weeks in a row" is a worse
 * thing to publish than silence, and a card offering it looks broken.
 */
export function shareStats(
  sessions: readonly SessionSummary[],
  now: Date = new Date(),
): ShareStat[] {
  const finished = sessions.filter(
    (session): session is SessionSummary & { completedAt: string } =>
      session.completedAt !== null,
  );

  const streak = weekStreak(
    finished.map((session) => session.completedAt),
    now,
  );
  const current = weekStart(now);
  const thisWeek = finished.filter(
    (session) => weekStart(new Date(session.completedAt)) === current,
  ).length;

  const scores = finished
    .map((session) => session.score)
    .filter((score): score is number => score !== null);

  // Speaking time only, not wall-clock: the minutes somebody held the floor in
  // English are the ones they earned. A session they sat through in silence
  // contributes nothing, which is correct.
  const spokenMs = finished.reduce(
    (total, session) => total + (session.metrics?.speakingMs ?? 0),
    0,
  );
  const spokenMinutes = Math.round(spokenMs / 60_000);

  // The level the most recent finished interview ran at. Not the highest ever
  // reached: a card saying C1 for somebody who has since dropped back to B2
  // is a card that misrepresents them to a recruiter.
  const level = finished[0]?.level ?? null;

  const stats: ShareStat[] = [];

  if (streak >= 2) {
    stats.push({
      id: "streak",
      value: String(streak),
      labelKey: "share.statStreak",
      sensitive: false,
    });
  }
  if (thisWeek > 0) {
    stats.push({
      id: "thisWeek",
      value: String(thisWeek),
      labelKey: "share.statThisWeek",
      sensitive: false,
    });
  }
  if (finished.length > 0) {
    stats.push({
      id: "total",
      value: String(finished.length),
      labelKey: "share.statTotal",
      sensitive: false,
    });
  }
  if (spokenMinutes > 0) {
    stats.push({
      id: "spoken",
      value: String(spokenMinutes),
      labelKey: "share.statSpoken",
      sensitive: false,
    });
  }
  if (level) {
    stats.push({
      id: "level",
      // The one stat whose value is not a number. Upper-cased because every
      // language writes the CEFR levels the same way.
      value: level.toUpperCase(),
      labelKey: "share.statLevel",
      sensitive: false,
    });
  }
  if (scores.length > 0) {
    stats.push({
      id: "best",
      value: `${Math.max(...scores)}%`,
      labelKey: "share.statBest",
      // See the note at the top. Offered, never chosen for them.
      sensitive: true,
    });
  }

  return stats;
}

/**
 * What the card shows before anybody touches it.
 *
 * Two stats, never a sensitive one. Two because one number looks thin and
 * three starts to cover the photograph — which is the candidate's, and is the
 * reason they are making this at all.
 */
export function defaultStats(stats: readonly ShareStat[]): ShareStatId[] {
  return stats
    .filter((stat) => !stat.sensitive)
    .slice(0, 2)
    .map((stat) => stat.id);
}
