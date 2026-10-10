import { History } from "lucide-react";
import type { ReactNode } from "react";
import type { SessionSummary } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * The last few interviews, as a row you can scroll and press.
 *
 * The search field above already finds a past session, but only if you
 * remember one exists and think to look. This is the same action made
 * visible: the whole point of the product is the second attempt, and a
 * configuration you have to reconstruct by hand is one nobody repeats.
 *
 * Pressing a card loads its configuration rather than opening the transcript.
 * Reading an old interview is what History is for; this row is for running one
 * again.
 */

/** Newest first, capped. Ten is more than anyone scrolls past. */
export const RECENT_LIMIT = 10;

export function recentFirst(
  sessions: readonly SessionSummary[],
  limit = RECENT_LIMIT,
): SessionSummary[] {
  return [...sessions]
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, limit);
}

/**
 * What a card says the interview was against.
 *
 * A free session is recorded under a placeholder company, and printing "a
 * well-regarded technology company" on a card reads like a bug rather than
 * like a plan tier.
 */
export function companyLabel(
  session: SessionSummary,
  genericCompany: string,
  generalLabel = "General role",
): string {
  return session.company && session.company !== genericCompany
    ? session.company
    : generalLabel;
}

/** "12 Aug" — enough to place an attempt without a timestamp's precision. */
export function shortDate(iso: string, withTime = false): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  // The interface language, not the browser's, so the card and the report
  // agree on how a date reads.
  const locale =
    typeof document !== "undefined" && document.documentElement.lang
      ? document.documentElement.lang
      : undefined;
  return when.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    // Two cards with the same role, company and day were indistinguishable;
    // the time tells them apart, and only appears when it has to.
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}


/** One interview setup, however many times it was run. */
export interface RecentSetup {
  latest: SessionSummary;
  times: number;
  /** The newest finished score for this setup, or null when none finished. */
  score: number | null;
}

/** Same role, round, company, level, mode and interviewer: the same setup. */
function setupKey(session: SessionSummary): string {
  return [session.role, session.stage, session.company, session.level ?? "", session.mode, session.personaId ?? ""].join("|");
}

/**
 * The newest distinct setups, newest first.
 *
 * Five cards reading "Senior Product Designer · Recruiter screen · Stripe"
 * said one thing five times. Grouped, the row is the few interviews someone
 * actually rotates between, each with how often and how it last went.
 */
export function recentSetups(sessions: readonly SessionSummary[], limit = 3): RecentSetup[] {
  const groups = new Map<string, RecentSetup>();
  for (const session of recentFirst(sessions, Number.MAX_SAFE_INTEGER)) {
    const key = setupKey(session);
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { latest: session, times: 1, score: session.score });
    } else {
      group.times += 1;
      if (group.score === null && session.score !== null) group.score = session.score;
    }
  }
  return [...groups.values()].slice(0, limit);
}

export function RecentSessions({
  sessions,
  genericCompany,
  onPick,
  action,
}: {
  sessions: SessionSummary[];
  genericCompany: string;
  onPick: (session: SessionSummary) => void;
  /** Something to sit at the end of the heading, e.g. the search toggle. */
  action?: ReactNode;
}) {
  const t = useT();
  const setups = recentSetups(sessions);
  if (setups.length === 0) return null;

  return (
    <section aria-label={t("recent.label")} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-cream-dim">
          <History className="h-4 w-4 text-cream-faint" aria-hidden />
          {t("recent.heading")}
        </h2>
        {action}
      </div>

      {/* One line each: the setup on the left, how it last went on the
          right. A tap loads every field back the way it was. */}
      <ul className="grid gap-2 sm:grid-cols-3">
        {setups.map(({ latest, times, score }) => {
          const company = companyLabel(latest, genericCompany, t("field.generalRole"));
          return (
            <li key={latest.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(latest)}
                className="focus-ring flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl bg-surface-card px-4 py-3 text-left shadow-card transition-[box-shadow,transform] duration-150 ease-press hover:shadow-lift active:scale-[0.98]"
              >
                <span className="min-w-0">
                  <span title={latest.role} className="block truncate text-sm font-semibold text-cream-bright">
                    {latest.role}
                  </span>
                  <span title={`${latest.stage} · ${company}`} className="block truncate text-xs text-cream-dim">
                    {latest.stage} · {company}
                    {times > 1 && <span className="text-cream-faint"> · ×{times}</span>}
                  </span>
                </span>
                {/* Only a real score: a dash read as "zero" next to the
                    interviews that never got a report. */}
                {score !== null && (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-text">
                    {Math.round(score)}%
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
