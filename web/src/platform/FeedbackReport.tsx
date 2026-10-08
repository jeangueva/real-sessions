import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Action, AnimatedCounter, DotMatrix, FadeRise, Meter, Panel, PopIn, PremiumMark, ScoreRing } from "@/design-system";
import { EASE_OUT } from "@/design-system/motion";
import { ArrowUpRight, Check, ChevronDown, Image as ImageIcon, Link2, Share2, Sparkles, Target } from "lucide-react";
import { PageBody, PageHeader } from "./AppShell";
import { CorrectionSteps } from "./CorrectionSteps";
import { useT } from "@/hooks/useLocale";
import { badgeText } from "@/lib/badges";
import type { MessageKey } from "@/lib/i18n";
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
  formatCount,
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
      : sessionId || historyId
        ? ""
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
          <Panel variant="glass" className="flex max-w-2xl flex-col gap-4 p-6 sm:p-8">
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
          <Panel variant="raised" className="max-w-2xl p-6 sm:p-8">
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
  limited,
  initialToken,
}: {
  historyId: string;
  allowed: boolean;
  /**
   * The link will carry the free half of the report. Said under the link,
   * with the crown, because the reader of the link is somebody else and the
   * candidate should know what they are sending.
   */
  limited: boolean;
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
      <ShareMenu>
        {(close) => (
          <>
            <Link to="/app/settings#plan" onClick={close} className="block">
              <MenuItem icon={<Link2 className="h-4 w-4" />}>{t("feedback.sharePaid")}</MenuItem>
            </Link>
            <CardItem close={close} />
          </>
        )}
      </ShareMenu>
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
    <ShareMenu>
      {(close) => (
        <>
          <MenuItem
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => void share()}
            disabled={busy}
            hint={link ?? undefined}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={copied ? "copied" : link ? "copy" : "share"}
                initial={{ opacity: 0, filter: "blur(2px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                {copied
                  ? t("feedback.shareCopied")
                  : link
                    ? t("feedback.shareCopy")
                    : t("feedback.shareReport")}
              </motion.span>
            </AnimatePresence>
          </MenuItem>
          {link && limited && (
            <Link
              to="/app/settings#plan"
              onClick={close}
              className="focus-ring mx-2 mb-1 flex items-start gap-2 rounded-xl px-2 py-1.5 text-xs text-cream-dim hover:text-cream-bright"
            >
              <PremiumMark label={t("premium.mark")} />
              {t("share.linkPremium")}
            </Link>
          )}
          <CardItem close={close} />
          {link && (
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className="focus-ring mx-2 mt-1 rounded-xl px-3 py-2 text-left text-xs font-medium text-cream-faint hover:text-cream-bright"
            >
              {t("feedback.shareStop")}
            </button>
          )}
        </>
      )}
    </ShareMenu>
  );
}

/**
 * One "Share" button that opens what can be shared, instead of three
 * buttons stacked under the title. A popover rather than a sheet: two
 * choices, close to the thumb, growing out of the button that opened it.
 */
function ShareMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <Action tone="glass" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        <Share2 aria-hidden className="h-4 w-4" />
        {t("feedback.shareMenu")}
      </Action>
      {open && (
        <div
          role="menu"
          style={{ transformOrigin: "top left" }}
          className="pop-in absolute left-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-3xl bg-surface-raised p-2 shadow-float sm:left-auto sm:right-0 sm:[transform-origin:top_right]"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** The progress card — a picture for a story or a post. */
function CardItem({ close }: { close: () => void }) {
  const t = useT();
  return (
    <Link to="/app/share" onClick={close} className="block">
      <MenuItem icon={<ImageIcon className="h-4 w-4" />}>{t("feedback.shareProgress")}</MenuItem>
    </Link>
  );
}

function MenuItem({
  icon,
  children,
  onClick,
  disabled,
  hint,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-lift disabled:opacity-50"
    >
      <span aria-hidden className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-cream-bright">{children}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-cream-faint">{hint}</span>}
      </span>
    </button>
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
        /* The first thing said after an interview is what they did, not
           how it scored: minutes spoken in a language that is not theirs is
           the fact that was hard, and it is true whatever the score says.
           Typed sessions have no speaking time, so they keep the plain
           title rather than a claim the numbers cannot back. */
        title={
          metrics?.fromSpeech && metrics.speakingMs
            ? t("feedback.spoke", { time: formatMinutes(metrics.speakingMs) })
            : t("feedback.title")
        }
        meta={meta}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* The way forward is the loudest thing on the page. Going again
                straight away is what turns a bad answer into a practised one. */}
            <Link to="/app">
              <Action>{t("feedback.again")}</Action>
            </Link>
            {share?.historyId ? (
              <ShareControl
                historyId={share.historyId}
                allowed={share.allowed}
                limited={withheld.nextSteps || withheld.metrics}
                initialToken={share.token}
              />
            ) : (
              // No stored report to link to (the sample): the card still is.
              <ShareMenu>{(close) => <CardItem close={close} />}</ShareMenu>
            )}
          </div>
        }
      />

      {/* Read top to bottom, the way someone who does not read charts reads:
          how did it go, the one thing to do next, what went well, phrases to
          practise — and only then the numbers, folded away. `minmax(0,1fr)`
          and `min-w-0` keep a long unbreakable word from widening the page. */}
      <PageBody className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4 [&>*]:min-w-0">
        {/* 1. How did it go — Duolingo's lesson-complete card. */}
        <FadeRise>
          <Panel variant="raised" className="flex flex-col items-center gap-5 p-6 text-center shadow-lift sm:flex-row sm:p-8 sm:text-left">
            <ScoreRing value={evaluation.overall_score_percentage}>
              <span className="block text-[2.75rem] font-bold leading-none tabular-nums text-cream-bright">
                <AnimatedCounter value={evaluation.overall_score_percentage} />
                <span className="text-xl font-semibold text-cream-faint">%</span>
              </span>
            </ScoreRing>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
              <PopIn delay={0.5}>
                <img
                  src={`/avatars/level-${mascotFor(evaluation.overall_score_percentage)}.png`}
                  alt=""
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)]"
                />
              </PopIn>
              <p className="text-title font-semibold text-cream-bright">
                {t(verdictFor(evaluation.overall_score_percentage))}
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {xp && (
                  <PopIn delay={0.8}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-premium-soft px-3 py-1 text-sm font-bold text-premium">
                      <Sparkles aria-hidden className="h-4 w-4" />+{xp.gained} XP
                    </span>
                  </PopIn>
                )}
                {earned.map((badge, index) => (
                  <PopIn key={badge.id} delay={0.95 + index * 0.08}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1 pl-1 pr-3 text-sm font-semibold text-accent-text">
                      <img src={`/badges/${badge.id}.png`} alt="" width={24} height={24} className="h-6 w-6" />
                      {badgeText(t, badge).label}
                    </span>
                  </PopIn>
                ))}
              </div>
            </div>
          </Panel>
        </FadeRise>

        {/* 2. One thing to do next. Not a list: a list of six is six things
            to put off; one is a plan. */}
        {(evaluation.actionable_next_steps[0] || evaluation.areas_for_improvement[0]) && (
          <FadeRise delay={0.1}>
            <section className="flex gap-4 rounded-card bg-accent p-6 text-accent-ink shadow-lift sm:p-7">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20">
                <Target className="h-6 w-6" />
              </span>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <p className="text-sm font-semibold opacity-85">{t("feedback.missionTitle")}</p>
                <p className="mt-1 text-lg font-semibold leading-snug">
                  {evaluation.actionable_next_steps[0] ?? evaluation.areas_for_improvement[0]}
                </p>
                <p className="mt-2 text-sm opacity-85">{t("feedback.missionHint")}</p>
              </div>
            </section>
          </FadeRise>
        )}

        {/* 3. What went well, then what to work on — short, scannable. */}
        <FadeRise delay={0.15}>
          <Panel className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8 [&>*]:min-w-0">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-grow-soft text-grow-text">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                {t("feedback.worked")}
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {evaluation.strengths.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-cream-dim [overflow-wrap:anywhere]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-step-soft text-step-text">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={3} />
                </span>
                {t("feedback.toFix")}
              </h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {evaluation.areas_for_improvement.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-cream-dim [overflow-wrap:anywhere]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </FadeRise>

        {/* 4. Phrases to say out loud — the most practical part of the report. */}
        {evaluation.vocabulary_feedback.missed_opportunities_or_errors.length > 0 && (
          <FadeRise delay={0.2}>
            <Panel className="p-6 sm:p-8">
              <CorrectionSteps items={evaluation.vocabulary_feedback.missed_opportunities_or_errors} />
            </Panel>
          </FadeRise>
        )}

        {/* 5. The rest of the plan. */}
        {(evaluation.actionable_next_steps.length > 1 || withheld.nextSteps) && (
          <FadeRise delay={0.25}>
            <Panel className="flex flex-col gap-4 p-6 sm:p-8">
              <h2 className="text-base font-semibold text-cream-bright">{t("feedback.nextTime")}</h2>
              {withheld.nextSteps && (
                <p className="flex items-start gap-2 text-sm text-cream-dim">
                  <PremiumMark label={t("premium.mark")} />
                  <span>
                    {t("feedback.nextStepsLocked")}{" "}
                    <Link
                      to="/app/settings#plan"
                      className="focus-ring rounded font-medium text-accent-text underline underline-offset-4"
                    >
                      {t("feedback.nextStepsLink")}
                    </Link>
                    .
                  </span>
                </p>
              )}
              <ol className="flex flex-col gap-3">
                {evaluation.actionable_next_steps.slice(1).map((step, index) => (
                  <li key={step} className="flex min-w-0 gap-3 text-sm text-cream-bright [overflow-wrap:anywhere]">
                    <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold tabular-nums text-accent-text">
                      {index + 2}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Panel>
          </FadeRise>
        )}

        {/* 6. The numbers, for whoever wants them — folded, so they never
            stand between a person and the plain-language part above. */}
        <FadeRise delay={0.3}>
          <details className="group rounded-card bg-surface-card shadow-card">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-6 sm:px-8">
              <span>
                <span className="block text-base font-semibold text-cream-bright">{t("feedback.advanced")}</span>
                <span className="mt-0.5 block text-sm text-cream-dim">{t("feedback.advancedHint")}</span>
              </span>
              <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-cream-dim transition-transform duration-200 ease-press group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-6 border-t border-line p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
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
              {evaluation.vocabulary_feedback.good_usage.length > 0 && (
                <div>
                  <p className="text-xs text-cream-faint">{t("feedback.usedWell")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {evaluation.vocabulary_feedback.good_usage.map((word) => (
                      <span
                        key={word}
                        className="max-w-full rounded-full bg-surface-lift px-3 py-1 text-xs font-medium text-cream-bright [overflow-wrap:anywhere]"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {evaluation.structure_feedback.feedback_text.trim() !== "" && (
                <p className="text-sm leading-relaxed text-cream-dim">
                  {evaluation.structure_feedback.feedback_text}
                </p>
              )}
              {metrics && (
                <div className="border-t border-line pt-6">
                  <p className="text-xs text-cream-faint">{t("feedback.measuredNote")}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                    <Stat label={t("feedback.words")} value={formatCount(metrics.words)} />
                    <Stat
                      label={t("feedback.fillers")}
                      value={formatFiller(metrics.fillerPer100, t("feedback.fillerUnit"))}
                    />
                    <Stat label={t("feedback.share")} value={formatShare(metrics.wordShare)} />
                    <Stat label={t("feedback.pace")} value={formatWpm(metrics.wpm)} />
                    <Stat label={t("feedback.thinking")} value={formatSeconds(metrics.avgResponseMs)} />
                    <Stat label={t("feedback.speaking")} value={formatMinutes(metrics.speakingMs)} />
                  </dl>
                  {!metrics.fromSpeech && (
                    <p className="mt-4 text-xs text-cream-faint">{t("feedback.needsSpeech")}</p>
                  )}
                </div>
              )}
              {withheld.metrics && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
                  <p className="flex max-w-md items-start gap-2 text-sm text-cream-dim">
                    <PremiumMark label={t("premium.mark")} />
                    {t("feedback.measuredLocked")}
                  </p>
                  <Link to="/app/settings#plan" className="shrink-0">
                    <Action withArrow>{t("cta.seePlans")}</Action>
                  </Link>
                </div>
              )}
              <p className="text-xs text-cream-faint">{t("feedback.againstBar")}</p>
            </div>
          </details>
        </FadeRise>
      </PageBody>
    </>
  );
}

/** Which form of Mocki cheers the result: crowned at 80+, on stage at 50+. */
function mascotFor(score: number): number {
  return score >= 80 ? 6 : score >= 50 ? 5 : 4;
}

/** One encouraging sentence for the score — never "you failed". */
function verdictFor(score: number): MessageKey {
  return score >= 80 ? "feedback.verdictHigh" : score >= 50 ? "feedback.verdictMid" : "feedback.verdictLow";
}

/** One number with its label. Used across the measured panel. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-cream-faint">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-cream-bright">{value}</dd>
    </div>
  );
}
