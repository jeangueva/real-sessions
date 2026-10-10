import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { ApiError, fetchHistory } from "@/lib/api";
import { formatSessionDate, formatWpm } from "@/lib/format";
import type { SessionSummary } from "@/lib/api";

/**
 * Past sessions, newest first. The trend is the point — one score means
 * little, four in a row is the reason to keep practising.
 *
 * It was its own screen, beside Progress in the rail. The two answered the
 * same question — how am I doing — one as a curve and one as a list, so the
 * list is the bottom half of the path now. `/app/history` still resolves and
 * lands here, for every link and bookmark that points at it.
 */
export function SessionList() {
  const t = useT();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then((result) => setSessions(result.sessions))
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError ? caught.message : "Could not load history.",
        ),
      );
  }, []);

  // Only finished interviews have a score. A row now exists from the moment
  // one starts, so this has to skip the abandoned ones rather than reduce over
  // a null and report NaN.
  const scored = (sessions ?? []).filter(
    (session): session is SessionSummary & { score: number } =>
      session.score !== null,
  );
  const best = scored.length > 0 ? Math.max(...scored.map((s) => s.score)) : null;

  const [filter, setFilter] = useState<"all" | "scored">("all");
  const rows = (sessions ?? []).filter((session) => filter === "all" || session.score !== null);

  return (
    <section id="sessions" aria-labelledby="sessions-title" className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sessions-title" className="text-title font-semibold text-cream-bright">
            {t("history.title")}
          </h2>
          <p className="mt-1 text-xs text-cream-dim">
            {sessions === null
              ? t("history.loading")
              : sessions.length === 0
                ? t("history.none")
                : t("history.completed", { count: scored.length }) +
                  (best === null ? "" : ` · ${t("history.best", { score: best })}`)}
          </p>
        </div>
        {/* Most rows are interviews left half-way; a report is what someone
            usually comes here for, so they can be hidden in one tap. */}
        {sessions !== null && sessions.length > scored.length && scored.length > 0 && (
          <div role="group" aria-label={t("history.title")} className="inline-flex rounded-full bg-surface-lift p-1">
            {(["all", "scored"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === value ? "bg-surface-card text-cream-bright shadow-card" : "text-cream-dim hover:text-cream-bright"
                }`}
              >
                {t(value === "all" ? "history.filterAll" : "history.filterScored")}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Panel variant="glass" className="max-w-2xl p-6">
          <p role="alert" className="text-sm text-cream-bright">
            {error}
          </p>
        </Panel>
      )}

      {!error && sessions?.length === 0 && (
        <Panel variant="raised" className="flex max-w-2xl flex-col gap-4 p-6">
          <p className="text-sm text-cream-dim">{t("history.emptyBody")}</p>
          <Link to="/app">
            <Action withArrow className="self-start">
              {t("cta.startInterview")}
            </Action>
          </Link>
        </Panel>
      )}

      {rows.length > 0 && (
        /* A table on a desk; on a phone each row becomes a small card with
           the same order — when, what, result, then what to do with it. */
        <div className="overflow-hidden rounded-card bg-surface-card shadow-card">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="hidden sm:table-header-group">
              <tr className="text-xs text-cream-faint">
                <th scope="col" className="px-5 py-3 font-medium">{t("history.colDate")}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t("history.colInterview")}</th>
                <th scope="col" className="px-5 py-3 font-medium">{t("history.colResult")}</th>
                <th scope="col" className="px-5 py-3 text-end font-medium">
                  <span className="sr-only">{t("history.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((session) => (
                <tr
                  key={session.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 first:border-t-0 sm:table-row sm:px-0 sm:py-0 sm:first:border-t"
                >
                  <td className="order-3 text-xs tabular-nums text-cream-dim sm:order-none sm:w-36 sm:px-5 sm:py-3.5">
                    {formatSessionDate(session.completedAt ?? session.startedAt)}
                  </td>
                  <td className="order-1 min-w-0 basis-full sm:order-none sm:basis-auto sm:px-5 sm:py-3.5">
                    <p className="truncate font-semibold text-cream-bright">
                      {session.company}
                      {session.mode === "real" && (
                        <span className="ml-2 rounded-full bg-surface-lift px-2 py-0.5 text-xs font-medium text-cream-dim">
                          {t("history.real")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-cream-dim">
                      {session.role} · {session.stage}
                    </p>
                  </td>
                  <td className="order-2 sm:order-none sm:px-5 sm:py-3.5">
                    {session.score === null ? (
                      <span className="text-xs text-cream-faint">{t("history.notFinished")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold tabular-nums text-accent-text">
                          {session.score}%
                        </span>
                        {session.metrics?.fromSpeech && session.metrics.wpm !== null && (
                          <span className="hidden text-xs text-cream-faint lg:inline">{formatWpm(session.metrics.wpm)}</span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="order-4 ms-auto sm:order-none sm:px-5 sm:py-3.5">
                    <span className="flex items-center justify-end gap-1.5">
                      {session.score !== null && (
                        <Link
                          to="/app/feedback"
                          state={{ historyId: session.id }}
                          className="focus-ring inline-flex items-center gap-1 rounded-full bg-surface-lift px-3 py-1.5 text-xs font-medium text-cream-bright transition-[background-color,transform] duration-150 ease-press hover:bg-cream/15 active:scale-[0.97]"
                        >
                          {t("history.view")}
                          <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
                        </Link>
                      )}
                      <Link
                        to="/app"
                        state={{ repeatId: session.id }}
                        aria-label={`${t("history.repeat")}: ${session.company} · ${session.role}`}
                        className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-accent-text transition-[background-color,transform] duration-150 ease-press hover:bg-accent-soft active:scale-[0.97]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        {t("history.repeat")}
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
