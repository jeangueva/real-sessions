import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Meter, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { SAMPLE_EVALUATION } from "@/lib/evaluation";
import type { Evaluation } from "@/lib/evaluation";
import { ApiError, fetchHistoryEntry, requestEvaluation } from "@/lib/api";
import type { Badge as BadgeInfo, SessionMetrics, XpAward } from "@/lib/api";
import {
  formatFiller,
  formatSeconds,
  formatSessionDate,
  formatShare,
  formatMinutes,
  formatWpm,
} from "@/lib/format";

interface FeedbackState {
  sessionId?: string;
  /** Set when opened from History — reads a stored evaluation instead. */
  historyId?: string;
  company?: string;
  role?: string;
  stage?: string;
}

/**
 * Fetches the real evaluation when a session id was handed over, and falls
 * back to the sample so `/app/feedback` still renders when opened directly.
 */
export function FeedbackReport() {
  const { state } = useLocation() as { state: FeedbackState | null };
  const sessionId = state?.sessionId;
  const historyId = state?.historyId;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    sessionId || historyId ? null : SAMPLE_EVALUATION,
  );
  const [meta, setMeta] = useState(
    state?.company
      ? `${state.company} · ${state.role} · ${state.stage}`
      : "Sample report",
  );
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [xp, setXp] = useState<XpAward | null>(null);
  const [earned, setEarned] = useState<BadgeInfo[]>([]);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    const describe = (caught: unknown) =>
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load your feedback.",
      );

    if (historyId) {
      requested.current = true;
      fetchHistoryEntry(historyId)
        .then((result) => {
          setEvaluation(result.session.evaluation);
          setMetrics(result.session.metrics);
          setMeta(
            `${result.session.company} · ${result.session.role} · ` +
              `${result.session.stage} · ${formatSessionDate(result.session.completedAt)}`,
          );
        })
        .catch(describe);
      return;
    }

    if (sessionId) {
      requested.current = true;
      requestEvaluation(sessionId)
        .then((result) => {
          setEvaluation(result.evaluation);
          setMetrics(result.metrics);
          setXp(result.xp);
          // Only what was just earned. Re-announcing a badge from last week
          // would make the whole system read as noise.
          setEarned(result.badges);
        })
        .catch(describe);
    }
  }, [sessionId, historyId]);

  if (error) {
    return (
      <>
        <PageHeader title="Your feedback" meta={meta} />
        <PageBody>
          <Panel variant="glass" className="flex max-w-2xl flex-col gap-4 p-6">
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
            <p className="text-xs text-cream-dim">
              Your transcript is not lost — evaluation can be retried from
              history once the service recovers.
            </p>
            <Link to="/app">
              <Action tone="glass">Back to sessions</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  if (!evaluation) {
    return (
      <>
        <PageHeader title="Your feedback" meta={meta} />
        <PageBody>
          <Panel variant="raised" className="max-w-2xl p-6">
            <p className="text-sm text-cream-dim">
              Reading your transcript. This usually takes under a minute.
            </p>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <FeedbackBody
      evaluation={evaluation}
      meta={meta}
      metrics={metrics}
      xp={xp}
      earned={earned}
    />
  );
}

/**
 * Phase 2 output, rendered. Every field of `EvaluationSchema` has a home here;
 * if the backend adds one, it gets a panel rather than being dropped silently.
 *
 * The ordering is deliberate: strengths before corrections. People come back
 * to a product that tells them what worked first.
 */
function FeedbackBody({
  evaluation,
  meta,
  metrics,
  xp,
  earned,
}: {
  evaluation: Evaluation;
  meta: string;
  metrics: SessionMetrics | null;
  xp: XpAward | null;
  earned: BadgeInfo[];
}) {
  return (
    <>
      <PageHeader
        title="Your feedback"
        meta={meta}
        actions={
          <Link to="/app">
            <Action tone="glass">Practice again</Action>
          </Link>
        }
      />

      <PageBody className="grid gap-4 lg:grid-cols-3">
        <FadeRise className="lg:col-span-1">
          <Panel variant="raised" className="flex h-full flex-col gap-6 p-6">
            <Eyebrow>Overall</Eyebrow>
            <p className="text-display text-cream-bright" style={{ fontSize: "clamp(3rem,8vw,5rem)" }}>
              {evaluation.overall_score_percentage}
              <span className="text-cream-faint">%</span>
            </p>
            <div className="flex flex-col gap-4">
              <Meter
                label="Vocabulary"
                value={evaluation.vocabulary_feedback.score_out_of_10}
                max={10}
                suffix="/10"
              />
              <Meter
                label="Structure"
                value={evaluation.structure_feedback.score_out_of_10}
                max={10}
                suffix="/10"
              />
            </div>
            <p className="mt-auto text-xs text-cream-faint">
              Scores compare you against the bar for this role and stage, not
              against other candidates.
            </p>
          </Panel>
        </FadeRise>

        <FadeRise delay={0.1} className="lg:col-span-2">
          <Panel className="flex h-full flex-col gap-6 p-6">
            <div>
              <Eyebrow>What worked</Eyebrow>
              <ul className="mt-3 flex flex-col gap-3">
                {evaluation.strengths.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-cream-bright">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line pt-6">
              <Eyebrow>What to fix</Eyebrow>
              <ul className="mt-3 flex flex-col gap-3">
                {evaluation.areas_for_improvement.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-cream-dim">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </FadeRise>

        <FadeRise delay={0.2} className="lg:col-span-2">
          <Panel className="flex h-full flex-col gap-5 p-6">
            <Eyebrow>Language</Eyebrow>
            <div>
              <p className="text-xs text-cream-faint">Used well</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {evaluation.vocabulary_feedback.good_usage.map((word) => (
                  <span
                    key={word}
                    className="rounded-full border border-line px-3 py-1 text-xs text-cream-bright"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-cream-faint">Corrections</p>
              <ul className="mt-2 flex flex-col gap-2">
                {evaluation.vocabulary_feedback.missed_opportunities_or_errors.map(
                  (item) => (
                    <li key={item} className="text-sm text-cream-dim">
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
            <p className="border-t border-line pt-5 text-sm leading-relaxed text-cream-dim">
              {evaluation.structure_feedback.feedback_text}
            </p>
          </Panel>
        </FadeRise>

        {metrics && (
          <FadeRise delay={0.25} className="lg:col-span-3">
            <Panel className="flex flex-col gap-5 p-6">
              <div>
                <Eyebrow>Measured</Eyebrow>
                <p className="mt-2 text-xs text-cream-faint">
                  Counted from your transcript, not judged by a model — these
                  numbers mean the same thing in every session, which is what
                  makes them comparable over time.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Words" value={String(metrics.words)} />
                <Stat label="Fillers" value={formatFiller(metrics.fillerPer100)} />
                <Stat label="Your share" value={formatShare(metrics.wordShare)} />
                <Stat label="Pace" value={formatWpm(metrics.wpm)} />
                <Stat
                  label="Thinking time"
                  value={formatSeconds(metrics.avgResponseMs)}
                />
                <Stat label="Speaking" value={formatMinutes(metrics.speakingMs)} />
              </dl>
              {!metrics.fromSpeech && (
                <p className="border-t border-line pt-4 text-xs text-cream-faint">
                  Pace, thinking time and speaking length need spoken answers.
                  Turn the microphone on next time and they will appear here.
                </p>
              )}
            </Panel>
          </FadeRise>
        )}

        {(xp !== null || earned.length > 0) && (
          <FadeRise delay={0.28} className="lg:col-span-3">
            <Panel variant="raised" className="flex flex-wrap items-center gap-6 p-6">
              {xp && (
                <div>
                  <Eyebrow>Earned</Eyebrow>
                  <p className="mt-2 text-title text-cream-bright">
                    +{xp.gained} XP
                  </p>
                  <p className="mt-1 text-xs text-cream-faint">
                    {xp.events.map((event) => event.kind).join(" · ")}
                  </p>
                </div>
              )}
              {earned.length > 0 && (
                <ul className="flex flex-wrap gap-3">
                  {earned.map((badge) => (
                    <li
                      key={badge.id}
                      className="rounded-2xl border border-line px-4 py-3"
                    >
                      <p className="text-sm text-cream-bright">{badge.label}</p>
                      <p className="mt-0.5 text-xs text-cream-faint">
                        {badge.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </FadeRise>
        )}

        <FadeRise delay={0.3} className="lg:col-span-3">
          <Panel variant="raised" className="flex h-full flex-col gap-4 p-6">
            <Eyebrow>Before your next one</Eyebrow>
            <ol className="flex flex-col gap-4">
              {evaluation.actionable_next_steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-cream-bright">
                  <span aria-hidden className="text-cream-faint">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Panel>
        </FadeRise>
      </PageBody>
    </>
  );
}

/** One number with its label. Used across the measured panel. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-cream-faint">{label}</dt>
      <dd className="mt-1 text-sm text-cream-bright">{value}</dd>
    </div>
  );
}
