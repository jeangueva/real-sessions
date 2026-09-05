import { History } from "lucide-react";
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
export function shortDate(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function RecentSessions({
  sessions,
  genericCompany,
  onPick,
}: {
  sessions: SessionSummary[];
  genericCompany: string;
  /** Loads this session's configuration into the bar above. */
  onPick: (session: SessionSummary) => void;
}) {
  const t = useT();
  const recent = recentFirst(sessions);
  // Nothing to show on a first visit, and an empty rail with a heading is
  // worse than no rail: it promises something the account does not have yet.
  if (recent.length === 0) return null;

  return (
    <section aria-label={t("recent.label")} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-cream-faint" aria-hidden />
        <h2 className="text-xs uppercase tracking-[0.18em] text-cream-faint">
          {t("recent.heading")}
        </h2>
      </div>

      {/* `-mx-1 px-1` so a focus ring on the first card is not clipped by the
          scroll container. */}
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {recent.map((session) => (
          <li key={session.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onPick(session)}
              className="focus-ring flex h-full w-56 flex-col justify-between gap-3 rounded-2xl border border-line p-4 text-left transition-colors hover:bg-surface-lift"
            >
              <span>
                <span className="block truncate text-sm text-cream-bright">
                  {session.role}
                </span>
                <span className="block truncate text-xs text-cream-dim">
                  {session.stage}
                </span>
                <span className="mt-1 block truncate text-xs text-cream-faint">
                  {companyLabel(session, genericCompany, t("field.generalRole"))}
                </span>
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-cream-faint">
                  {shortDate(session.startedAt)}
                </span>
                {/* A blank would read as zero, which is a much worse thing to
                    tell someone about their own interview. */}
                <span className="text-sm text-cream-bright">
                  {session.score === null ? "—" : `${Math.round(session.score)}%`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
