import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { Action, FadeRise, Panel, ScoreRing } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { ApiError, fetchHistoryEntry } from "@/lib/api";
import { companyName, formatSessionDate } from "@/lib/format";
import { PageBody, PageHeader } from "./AppShell";
import { mascotFor, verdictFor } from "./FeedbackReport";

type Entry = Awaited<ReturnType<typeof fetchHistoryEntry>>["session"];

/** An unfinished interview can still be reported on while the server holds it. */
const OPEN_FOR_MS = 55 * 60 * 1000;

/**
 * One past interview: how it went and what to do with it.
 *
 * Reached from every list of past interviews. Tapping one used to load its
 * setup into the bar and nothing else — a click that looked like it did
 * nothing. Now it opens this: the result if there is one, the way back into
 * it otherwise, and the conversation itself folded at the bottom.
 */
export function InterviewDetail() {
  const t = useT();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistoryEntry(id)
      .then((result) => setEntry(result.session))
      .catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : t("detail.notFound")));
  }, [id, t]);

  const back = (
    <Link to="/app/progress#sessions" className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-accent-text">
      <ArrowLeft aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
      {t("detail.back")}
    </Link>
  );

  if (error) {
    return (
      <>
        <PageHeader title={t("detail.notFound")} />
        <PageBody className="flex flex-col gap-4">{back}</PageBody>
      </>
    );
  }
  if (!entry) return <PageHeader title="…" />;

  const score = entry.evaluation?.overall_score_percentage ?? entry.score;
  const answers = entry.turns.filter((turn) => turn.speaker === "candidate").length;
  const stillOpen = Date.now() - new Date(entry.startedAt).getTime() < OPEN_FOR_MS;
  const mission = entry.evaluation?.actionable_next_steps[0] ?? entry.evaluation?.areas_for_improvement[0];
  const repeat = () => navigate("/app", { state: { repeatId: entry.id } });

  return (
    <>
      <PageHeader
        title={`${entry.role} · ${entry.stage}`}
        meta={[companyName(entry.company, t("field.generalRole")), formatSessionDate(entry.completedAt ?? entry.startedAt), entry.mode === "real" ? t("history.real") : null]
          .filter(Boolean)
          .join(" · ")}
      />
      <PageBody className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4">
        {back}

        <FadeRise>
          {score !== null && score !== undefined ? (
            <Panel variant="raised" className="flex flex-col items-center gap-5 p-6 text-center shadow-lift sm:flex-row sm:p-8 sm:text-left">
              <ScoreRing value={score} size={128}>
                <span className="text-3xl font-bold tabular-nums text-cream-bright">
                  {Math.round(score)}
                  <span className="text-base text-cream-faint">%</span>
                </span>
              </ScoreRing>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
                <img src={`/avatars/level-${mascotFor(score)}.png`} alt="" width={56} height={56} className="h-14 w-14" />
                <p className="text-title font-semibold text-cream-bright">{t(verdictFor(score))}</p>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Link to="/app/feedback" state={{ historyId: entry.id }}>
                    <Action withArrow>{t("detail.viewReport")}</Action>
                  </Link>
                  <Action tone="glass" onClick={repeat}>
                    <RotateCcw aria-hidden className="h-4 w-4" />
                    {t("history.repeat")}
                  </Action>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel variant="raised" className="flex flex-col gap-4 p-6 shadow-lift sm:p-8">
              <div className="flex items-center gap-4">
                <img src="/avatars/level-1.png" alt="" width={56} height={56} className="h-14 w-14" />
                <div>
                  <p className="text-title font-semibold text-cream-bright">{t("detail.unfinished")}</p>
                  <p className="text-sm text-cream-dim">{t("detail.answered", { count: answers })}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Action withArrow onClick={repeat}>
                  {t("detail.repeat")}
                </Action>
                {/* The server keeps an interview for an hour; within it, what
                    was answered can still become a report. */}
                {stillOpen && answers > 0 && (
                  <Link to="/app/feedback" state={{ sessionId: entry.id }}>
                    <Action tone="glass">{t("detail.generate")}</Action>
                  </Link>
                )}
              </div>
            </Panel>
          )}
        </FadeRise>

        {mission && (
          <FadeRise delay={0.05}>
            <section className="flex gap-4 rounded-card bg-accent p-6 text-accent-ink shadow-lift">
              <Sparkles aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <p className="text-sm font-semibold opacity-85">{t("feedback.missionTitle")}</p>
                <p className="mt-1 text-base font-semibold leading-snug">{mission}</p>
              </div>
            </section>
          </FadeRise>
        )}

        {entry.turns.length > 0 && (
          <FadeRise delay={0.1}>
            <details className="group rounded-card bg-surface-card shadow-card">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-5 sm:px-6">
                <span className="text-base font-semibold text-cream-bright">{t("detail.conversation")}</span>
                <ChevronDown aria-hidden className="h-5 w-5 text-cream-dim transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <ol className="flex flex-col gap-4 border-t border-line p-5 sm:p-6">
                {entry.turns.map((turn) => (
                  <li key={turn.idx} className="min-w-0">
                    <p className={`text-xs font-semibold ${turn.speaker === "candidate" ? "text-accent-text" : "text-cream-dim"}`}>
                      {turn.speaker === "candidate" ? t("call.you") : t("detail.interviewer")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-cream-bright [overflow-wrap:anywhere]">{turn.text}</p>
                  </li>
                ))}
              </ol>
            </details>
          </FadeRise>
        )}

        <Link to="/app/progress#sessions" className="focus-ring inline-flex items-center gap-1 self-start rounded-full text-sm text-cream-dim hover:text-cream-bright">
          {t("detail.back")}
          <ArrowRight aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
        </Link>
      </PageBody>
    </>
  );
}
