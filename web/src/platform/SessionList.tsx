import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Action, FadeRise, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { ApiError, fetchHistory } from "@/lib/api";
import { formatFiller, formatSessionDate, formatWpm } from "@/lib/format";
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

  return (
    <section id="sessions" aria-labelledby="sessions-title" className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="sessions-title" className="font-serif text-title text-cream-bright">
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
            <p className="text-sm text-cream-dim">
              {t("history.emptyBody")}
            </p>
            <Link to="/app">
              <Action withArrow className="self-start">
                {t("cta.startInterview")}
              </Action>
            </Link>
          </Panel>
        )}

        <ul className="grid gap-3 xl:grid-cols-2">
          {sessions?.map((session, index) => (
            <FadeRise key={session.id} delay={index * 0.06}>
              <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cream-bright">
                    {session.company}
                    {session.mode === "real" && (
                      <span className="ml-2 text-xs font-normal text-cream-faint">
                        {t("history.real")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {session.role} · {session.stage}
                    {session.completedAt
                      ? ` · ${formatSessionDate(session.completedAt)}`
                      : ` · ${t("history.notFinished")}`}
                  </p>
                  {/* The measured half, shown next to the score so the two are
                      read together — the score moves for reasons these explain. */}
                  {session.metrics && (
                    <p className="mt-2 text-xs text-cream-faint">
                      {session.metrics.fromSpeech &&
                        `${formatWpm(session.metrics.wpm)} · `}
                      {t("history.fillers", {
                        rate: formatFiller(session.metrics.fillerPer100),
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-title text-cream-bright">
                    {session.score === null ? (
                      <span className="text-cream-faint">—</span>
                    ) : (
                      <>
                        {session.score}
                        <span className="text-cream-faint">%</span>
                      </>
                    )}
                  </span>
                  {session.score !== null && (
                    <Link
                      to="/app/feedback"
                      state={{ historyId: session.id }}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-cream-bright transition-colors hover:border-accent hover:text-accent-text"
                    >
                      {t("history.view")}
                      <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
                    </Link>
                  )}
                </div>
              </Panel>
            </FadeRise>
          ))}
        </ul>
    </section>
  );
}
