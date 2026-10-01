import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Action, DotMatrix, Eyebrow, FadeRise, Meter, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import { SAMPLE_EVALUATION } from "@/lib/evaluation";
import type { Evaluation } from "@/lib/evaluation";
import {
  ApiError,
  fetchHistoryEntry,
  fetchPlan,
  requestEvaluation,
  shareSession,
  unshareSession,
} from "@/lib/api";
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
  const t = useT();
  const { state } = useLocation() as { state: FeedbackState | null };
  const sessionId = state?.sessionId;
  const historyId = state?.historyId;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(
    sessionId || historyId ? null : SAMPLE_EVALUATION,
  );
  const [meta, setMeta] = useState(
    state?.company
      ? `${state.company} · ${state.role} · ${state.stage}`
      : t("feedback.sample"),
  );
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  /** What the plan held back, so the report can offer it rather than hide it. */
  const [withheld, setWithheld] = useState({ metrics: false, nextSteps: false });
  const [xp, setXp] = useState<XpAward | null>(null);
  const [earned, setEarned] = useState<BadgeInfo[]>([]);
  /**
   * Whether this report can be shared, and whether it already is.
   *
   * Null while unknown, so the control renders nothing rather than flashing
   * the paid-plan version at a subscriber for one frame.
   */
  const [canShare, setCanShare] = useState<boolean | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    // Separate from the evaluation read below, which is guarded against
    // running twice. This one is cheap and has no side effect, and a report
    // reached without an id — the sample — still wants the control's state.
    fetchPlan()
      .then((result) => setCanShare(result.capabilities.shareReport))
      .catch(() => setCanShare(false));
  }, []);

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
          setWithheld(result.session.withheld);
          setShareToken(result.session.shareToken ?? null);
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
          track("interview finished", {
            score: result.evaluation.overall_score_percentage,
            spoken: result.metrics?.fromSpeech ?? false,
          });
          setEvaluation(result.evaluation);
          setMetrics(result.metrics);
          setWithheld(result.withheld);
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
        <PageHeader title={t("feedback.title")} meta={meta} />
        <PageBody>
          <Panel variant="glass" className="flex max-w-2xl flex-col gap-4 p-6">
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
            <p className="text-xs text-cream-dim">
              {t("feedback.retry")}
            </p>
            <Link to="/app">
              <Action tone="glass">{t("feedback.back")}</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  if (!evaluation) {
    return (
      <>
        <PageHeader title={t("feedback.title")} meta={meta} />
        <PageBody>
          <Panel variant="raised" className="max-w-2xl p-6">
            {/* The longest wait in the product, with nothing honest to put on
                a progress bar: a model is reading the whole transcript. The
                sentence stays — it is what actually says what is happening —
                and the grid says the wait is still moving. */}
            <DotMatrix size={5} dotSize={4} speed={1.2} bloom label={t("feedback.reading")} />
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
      withheld={withheld}
      xp={xp}
      earned={earned}
      // Only a stored report can be shared. The sample has no row behind it,
      // and a just-finished interview is the same id as its history entry.
      share={
        canShare === null
          ? null
          : { historyId: historyId ?? sessionId ?? null, allowed: canShare, token: shareToken }
      }
    />
  );
}

/**
 * Share this report, or stop.
 *
 * Copies the link rather than opening a share sheet. The reader is in Lima
 * sending it to a mentor on WhatsApp, and the sheet is a different control on
 * every platform and absent on a desktop browser — a clipboard is the one
 * thing that behaves the same everywhere and lands in the app they are already
 * typing in.
 *
 * The state is three things, not two: not shared, shared, and "shared and the
 * link is on your clipboard right now". The last one is the only confirmation
 * a copy can give, and without it people click twice and wonder which click
 * worked.
 *
 * Shown on the free plan rather than hidden, because an absent control teaches
 * nobody that the feature exists. It says what it costs and goes to the plan.
 */
function ShareControl({
  historyId,
  allowed,
  initialToken,
}: {
  historyId: string;
  allowed: boolean;
  /** The token the report already had, when it arrived with one. */
  initialToken: string | null;
}) {
  const t = useT();
  const [token, setToken] = useState<string | null>(initialToken);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!allowed) {
    return (
      <Link to="/app/settings#plan">
        <Action tone="glass">{t("feedback.sharePaid")}</Action>
      </Link>
    );
  }

  const link = url ?? (token ? `${window.location.origin}/r/${token}` : null);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Long enough to read, short enough that the button is not stuck
      // confirming something the reader has moved on from.
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      // A browser that refuses the clipboard — an insecure origin, a denied
      // permission — still gets the link, below, to select by hand.
      setCopied(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      if (link) {
        await copy(link);
        return;
      }
      const result = await shareSession(historyId);
      setToken(result.shared.token);
      setUrl(result.shared.url);
      track("report shared");
      await copy(result.shared.url);
    } catch {
      // Nothing to say that the reader can act on: the link either exists or
      // it does not, and the button still reads "share" if it does not.
      setToken(null);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await unshareSession(historyId);
      setToken(null);
      setUrl(null);
      setCopied(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Action tone="glass" onClick={share} disabled={busy}>
          {copied
            ? t("feedback.shareCopied")
            : link
              ? t("feedback.shareCopy")
              : t("feedback.shareReport")}
        </Action>
        {link && (
          <Action tone="glass" onClick={stop} disabled={busy}>
            {t("feedback.shareStop")}
          </Action>
        )}
      </div>
      {link && (
        /* The link in full, selectable. For the browser that refused the
           clipboard, and for the reader who wants to see what they are about
           to send before they send it. */
        <p className="max-w-xs break-all text-right text-xs text-cream-faint">{link}</p>
      )}
    </div>
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
  withheld,
  xp,
  earned,
  share,
}: {
  evaluation: Evaluation;
  meta: string;
  metrics: SessionMetrics | null;
  withheld: { metrics: boolean; nextSteps: boolean };
  xp: XpAward | null;
  earned: BadgeInfo[];
  share: { historyId: string | null; allowed: boolean; token: string | null } | null;
}) {
  const t = useT();
  return (
    <>
      <PageHeader
        title={t("feedback.title")}
        meta={meta}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
            {share?.historyId && (
              <ShareControl
                historyId={share.historyId}
                allowed={share.allowed}
                initialToken={share.token}
              />
            )}
            {/* The moment the card is worth offering: a streak has just
                grown and the number is fresh. Offering it from a menu a week
                later is offering it to somebody who has stopped feeling it. */}
            <Link to="/app/share">
              <Action tone="glass">{t("feedback.shareProgress")}</Action>
            </Link>
            <Link to="/app">
              <Action tone="glass">{t("feedback.again")}</Action>
            </Link>
          </div>
        }
      />

      <PageBody className="grid gap-4 lg:grid-cols-3">
        <FadeRise className="lg:col-span-1">
          <Panel variant="raised" className="flex h-full flex-col gap-6 p-6">
            <Eyebrow>{t("feedback.overall")}</Eyebrow>
            <p className="text-display text-cream-bright" style={{ fontSize: "clamp(3rem,8vw,5rem)" }}>
              {evaluation.overall_score_percentage}
              <span className="text-cream-faint">%</span>
            </p>
            <div className="flex flex-col gap-4">
              <Meter
                label={t("feedback.vocabulary")}
                value={evaluation.vocabulary_feedback.score_out_of_10}
                max={10}
                suffix="/10"
              />
              <Meter
                label={t("feedback.structure")}
                value={evaluation.structure_feedback.score_out_of_10}
                max={10}
                suffix="/10"
              />
            </div>
            <p className="mt-auto text-xs text-cream-faint">
              {t("feedback.againstBar")}
            </p>
          </Panel>
        </FadeRise>

        <FadeRise delay={0.1} className="lg:col-span-2">
          <Panel className="flex h-full flex-col gap-6 p-6">
            <div>
              <Eyebrow>{t("feedback.worked")}</Eyebrow>
              <ul className="mt-3 flex flex-col gap-3">
                {evaluation.strengths.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-cream-bright">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-line pt-6">
              <Eyebrow>{t("feedback.toFix")}</Eyebrow>
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
            <Eyebrow>{t("feedback.language")}</Eyebrow>
            <div>
              <p className="text-xs text-cream-faint">{t("feedback.usedWell")}</p>
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
              <p className="text-xs text-cream-faint">{t("feedback.corrections")}</p>
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

        {withheld.metrics && (
          <FadeRise delay={0.25} className="lg:col-span-3 lg:order-2">
            <Panel variant="glass" className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="max-w-xl">
                <Eyebrow>{t("feedback.measured")}</Eyebrow>
                <p className="mt-2 text-sm text-cream-dim">
                  {t("feedback.measuredLocked")}
                </p>
              </div>
              <Link to="/app/settings#plan" className="shrink-0">
                <Action withArrow>{t("cta.seePlans")}</Action>
              </Link>
            </Panel>
          </FadeRise>
        )}

        {metrics && (
          <FadeRise delay={0.25} className="lg:col-span-3 lg:order-2">
            <Panel className="flex flex-col gap-5 p-6">
              <div>
                <Eyebrow>{t("feedback.measured")}</Eyebrow>
                <p className="mt-2 text-xs text-cream-faint">
                  {t("feedback.measuredNote")}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label={t("feedback.words")} value={String(metrics.words)} />
                <Stat label={t("feedback.fillers")} value={formatFiller(metrics.fillerPer100)} />
                <Stat label={t("feedback.shareReport")} value={formatShare(metrics.wordShare)} />
                <Stat label={t("feedback.pace")} value={formatWpm(metrics.wpm)} />
                <Stat
                  label={t("feedback.thinking")}
                  value={formatSeconds(metrics.avgResponseMs)}
                />
                <Stat label={t("feedback.speaking")} value={formatMinutes(metrics.speakingMs)} />
              </dl>
              {!metrics.fromSpeech && (
                <p className="border-t border-line pt-4 text-xs text-cream-faint">
                  {t("feedback.needsSpeech")}
                </p>
              )}
            </Panel>
          </FadeRise>
        )}

        {(xp !== null || earned.length > 0) && (
          <FadeRise delay={0.28} className="lg:col-span-1 lg:order-1">
            <Panel variant="raised" className="flex flex-col gap-5 p-6">
              {xp && (
                <div>
                  <Eyebrow>{t("feedback.earned")}</Eyebrow>
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

        <FadeRise delay={0.3} className="lg:col-span-3 lg:order-3">
          <Panel variant="raised" className="flex h-full flex-col gap-4 p-6">
            <Eyebrow>{t("feedback.nextTime")}</Eyebrow>
            {withheld.nextSteps && (
              <p className="text-sm text-cream-dim">
                {t("feedback.nextStepsLocked")}{" "}
                <Link
                  to="/app/settings#plan"
                  className="focus-ring rounded underline underline-offset-4 hover:text-cream-bright"
                >
                  {t("feedback.nextStepsLink")}
                </Link>
                .
              </p>
            )}
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
