import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, FadeRise, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, fetchHistory } from "@/lib/api";
import { formatFiller, formatSessionDate, formatWpm } from "@/lib/format";
import type { SessionSummary } from "@/lib/api";

/**
 * Past sessions, newest first. The trend is the point — one score means
 * little, four in a row is the reason to keep practising.
 */
export function SessionHistory() {
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
    <>
      <PageHeader
        title="History"
        meta={
          sessions === null
            ? "Loading…"
            : sessions.length === 0
              ? "No interviews yet"
              : `${scored.length} completed${best === null ? "" : ` · best ${best}%`}`
        }
        actions={
          <Link to="/app">
            <Action tone="glass">New session</Action>
          </Link>
        }
      />

      <PageBody>
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
              Finished interviews appear here with their feedback. Your first one
              takes about ten minutes.
            </p>
            <Link to="/app">
              <Action withArrow className="self-start">
                Start an interview
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
                        real
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {session.role} · {session.stage}
                    {session.completedAt
                      ? ` · ${formatSessionDate(session.completedAt)}`
                      : " · not finished"}
                  </p>
                  {/* The measured half, shown next to the score so the two are
                      read together — the score moves for reasons these explain. */}
                  {session.metrics && (
                    <p className="mt-2 text-xs text-cream-faint">
                      {session.metrics.fromSpeech &&
                        `${formatWpm(session.metrics.wpm)} · `}
                      fillers {formatFiller(session.metrics.fillerPer100)}
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
                      className="focus-ring rounded px-1 py-1 text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
                    >
                      View feedback
                    </Link>
                  )}
                </div>
              </Panel>
            </FadeRise>
          ))}
        </ul>
      </PageBody>
    </>
  );
}
