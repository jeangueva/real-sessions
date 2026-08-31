import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, FadeRise, Panel } from "@/design-system";
import { PageHeader } from "./AppShell";
import { ApiError, fetchHistory } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
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

  const best =
    sessions && sessions.length > 0
      ? Math.max(...sessions.map((session) => session.score))
      : null;

  return (
    <>
      <PageHeader
        title="History"
        meta={
          sessions === null
            ? "Loading…"
            : sessions.length === 0
              ? "No interviews yet"
              : `${sessions.length} session${sessions.length === 1 ? "" : "s"} · best ${best}%`
        }
        actions={
          <Link to="/app">
            <Action tone="glass">New session</Action>
          </Link>
        }
      />

      <div className="px-6 py-10 lg:px-10">
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

        <ul className="flex max-w-4xl flex-col gap-2">
          {sessions?.map((session, index) => (
            <FadeRise key={session.id} delay={index * 0.06}>
              <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-cream-bright">
                    {session.company}
                  </p>
                  <p className="mt-0.5 text-xs text-cream-dim">
                    {session.role} · {session.stage} ·{" "}
                    {formatSessionDate(session.completedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-title text-cream-bright">
                    {session.score}
                    <span className="text-cream-faint">%</span>
                  </span>
                  <Link
                    to="/app/feedback"
                    state={{ historyId: session.id }}
                    className="focus-ring rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
                  >
                    View feedback
                  </Link>
                </div>
              </Panel>
            </FadeRise>
          ))}
        </ul>
      </div>
    </>
  );
}
