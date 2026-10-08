import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Action,
  AnimatedCounter,
  Eyebrow,
  FadeRise,
  Meter,
  Panel,
  RadarChart,
  TrendChart,
} from "@/design-system";
import type { TrendPoint } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Avatar, PopIn } from "@/design-system";
import { ChevronDown } from "lucide-react";
import { TIER_COUNT, dominantAxis, nextEvolution } from "@/lib/avatar";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";
import {
  ApiError,
  fetchLeaderboard,
  fetchProfile,
  fetchProgress,
} from "@/lib/api";
import type {
  Axis,
  AxisPoint,
  Badge,
  EarnedBadge,
  SessionSummary,
} from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { badgeText } from "@/lib/badges";
import { Journey } from "./Journey";
import { SessionList } from "./SessionList";

const AXIS_LABEL: Record<Axis, MessageKey> = {
  fluency: "axis.fluency",
  vocabulary: "axis.vocabulary",
  structure: "axis.structure",
  confidence: "axis.confidence",
};

const AXIS_CAPTION: Record<Axis, MessageKey> = {
  fluency: "axis.fluencyNote",
  vocabulary: "axis.vocabularyNote",
  structure: "axis.structureNote",
  confidence: "axis.confidenceNote",
};

interface Profile {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  badges: EarnedBadge[];
  catalogue: Badge[];
}

/**
 * Progress over time.
 *
 * The screen exists because a single score is not actionable — 62% tells you
 * nothing you can practise. Four axes and a trend do: they say which front is
 * moving and which is stuck.
 */
export function Progress() {
  const t = useT();
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [axes, setAxes] = useState<AxisPoint[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [league, setLeague] = useState<{
    rows: { position: number; xp: number; you: boolean }[];
    you: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress()
      .then((result) => {
        setSessions(result.sessions);
        setAxes(result.axes);
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError ? caught.message : "Could not load progress.",
        ),
      );
    // Neither of these is worth an error banner: the trend is the screen, and
    // it renders without them.
    fetchProfile().then(setProfile).catch(() => undefined);
    fetchLeaderboard().then(setLeague).catch(() => undefined);
  }, []);

  /**
   * `/app/history` lands here with `#sessions`. The list loads after the
   * page, so the browser's own jump to the anchor finds nothing yet; this
   * waits for the data and then makes the same jump.
   */
  const { hash } = useLocation();
  useEffect(() => {
    if (hash !== "#sessions" || sessions === null) return;
    document.getElementById("sessions")?.scrollIntoView({ block: "start" });
  }, [hash, sessions]);

  const labelFor = (session: SessionSummary) =>
    `${session.company} · ${formatSessionDate(session.completedAt)}`;

  const scorePoints: TrendPoint[] = (sessions ?? []).map((session) => ({
    label: labelFor(session),
    value: session.score,
  }));

  /**
   * The most recent reading on each axis, which is what tints the avatar.
   *
   * The latest rather than an average: the avatar should say what someone is
   * good at now, and a mean over every session they ever ran keeps showing
   * them the shape of their first week.
   */
  const axisLatest = Object.fromEntries(
    (["fluency", "vocabulary", "structure", "confidence"] as Axis[]).map((axis) => [
      axis,
      [...axes].reverse().find((point) => point.scores[axis] !== null)?.scores[axis] ?? null,
    ]),
  ) as Record<Axis, number | null>;

  /** The highest and lowest measured axis, for the plain-language summary. */
  const measuredAxes = (Object.keys(axisLatest) as Axis[]).filter((axis) => axisLatest[axis] !== null);
  const strongest = measuredAxes.reduce<Axis | null>(
    (best, axis) => (best === null || axisLatest[axis]! > axisLatest[best]! ? axis : best),
    null,
  );
  const weakest = measuredAxes.reduce<Axis | null>(
    (worst, axis) => (worst === null || axisLatest[axis]! < axisLatest[worst]! ? axis : worst),
    null,
  );

  const axisPoints = (axis: Axis): TrendPoint[] =>
    axes.map((point, index) => ({
      label: sessions?.[index] ? labelFor(sessions[index]!) : `Session ${index + 1}`,
      value: point.scores[axis],
    }));

  const axisLabels = Object.fromEntries(
    (Object.keys(AXIS_LABEL) as Axis[]).map((axis) => [axis, t(AXIS_LABEL[axis])]),
  ) as Record<Axis, string>;

  if (error) {
    return (
      <>
        <PageHeader title={t("progress.title")} />
        <PageBody>
          <Panel variant="glass" className="max-w-2xl p-6 sm:p-8">
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          </Panel>
        </PageBody>
      </>
    );
  }

  if (sessions !== null && sessions.length === 0) {
    return (
      <>
        <PageHeader title={t("progress.title")} meta={t("progress.nothing")} />
        <PageBody>
          <Journey sessions={[]} />
          <Panel variant="raised" className="mt-4 flex max-w-2xl flex-col gap-5 p-6 sm:p-8">
            {/* The first form, shown rather than described. The copy beside
                this used to promise that the shape starts meaning something
                around the third session while showing no shape at all, which
                asked someone to work toward a reward they had never seen.
                Recessive but not faint: it is what they have rather than what
                they are heading for, and a shape too pale to make out would
                fail the one job it has. */}
            <div className="flex items-center gap-4">
              <Avatar
                level={1}
                size={88}
                className="shrink-0 text-cream-dim"
              />
              <p className="text-xs text-cream-faint">
                {t("avatar.empty", { count: TIER_COUNT - 1 })}
              </p>
            </div>
            <p className="text-sm text-cream-dim">
              {t("progress.empty")}
            </p>
            <Link to="/app" className="self-start">
              <Action withArrow>{t("cta.startInterview")}</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("progress.title")}
        meta={
          sessions === null
            ? t("history.loading")
            : t("history.completed", { count: sessions.length })
        }
        actions={
          /* Here because this is the screen somebody opens when they want to
             look at what they have done. The card is made of these numbers,
             so the offer belongs where the numbers are rather than in a menu
             nobody browses. */
          <Link to="/app/share">
            <Action tone="glass">{t("progress.share")}</Action>
          </Link>
        }
      />

      <PageBody className="flex flex-col gap-4">
        <FadeRise>
          <Journey sessions={sessions ?? []} />
        </FadeRise>

        {profile && (
          <FadeRise>
            <Panel variant="raised" className="flex flex-wrap items-center gap-8 p-6 sm:p-8">
              {/* The avatar sits with the level rather than in a panel of its
                  own: the number is what it is derived from, and separating
                  them would make it look like a decoration instead of a
                  reading of the same thing. */}
              <div className="flex items-center gap-4">
                <Avatar
                  level={profile.level}
                  axis={dominantAxis(axisLatest)}
                  size={104}
                  className="shrink-0 text-cream-bright"
                />
                <div>
                  <Eyebrow>{t("progress.level")}</Eyebrow>
                  <p className="mt-2 text-title font-semibold tabular-nums text-cream-bright">
                    <AnimatedCounter value={profile.level} />
                  </p>
                  <p className="mt-1 text-xs text-cream-faint">
                    {nextEvolution(profile.level) === null
                      ? t("avatar.final")
                      : t("avatar.evolvesAt", { level: nextEvolution(profile.level)! })}
                  </p>
                </div>
              </div>
              <div className="min-w-[12rem] flex-1">
                <Meter
                  label={t("progress.xpTotal", { xp: profile.xp })}
                  value={profile.xpIntoLevel}
                  max={profile.xpForNextLevel}
                  suffix=""
                />
                <p className="mt-2 text-xs text-cream-faint">
                  {t("progress.xpToLevel", {
                    xp: profile.xpForNextLevel - profile.xpIntoLevel,
                    level: profile.level + 1,
                  })}
                </p>
              </div>
              {league?.you && (
                <div>
                  <Eyebrow>{t("progress.thisWeek")}</Eyebrow>
                  <p className="mt-2 text-title font-semibold tabular-nums text-cream-bright">
                    #{league.you}
                  </p>
                  <p className="mt-1 text-xs text-cream-faint">
                    {t("progress.ofLeague", { total: league.rows.length })}
                  </p>
                </div>
              )}
            </Panel>
          </FadeRise>
        )}

        {/* In plain words first: where you are strong, what to practise. The
            same four readings the charts below plot, said as a sentence for
            someone who does not read charts. */}
        {strongest && weakest && strongest !== weakest && (
          <FadeRise delay={0.05}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Panel className="flex items-center gap-4 p-6">
                <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-grow-soft text-2xl">💪</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream-dim">{t("progress.strongest")}</p>
                  <p className="text-lg font-semibold text-cream-bright">
                    {t(AXIS_LABEL[strongest])} · <span className="tabular-nums">{Math.round(axisLatest[strongest]!)}</span>
                  </p>
                </div>
              </Panel>
              <Panel className="flex items-center gap-4 p-6">
                <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-step-soft text-2xl">🎯</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-cream-dim">{t("progress.weakest")}</p>
                  <p className="text-lg font-semibold text-cream-bright">
                    {t(AXIS_LABEL[weakest])} · <span className="tabular-nums">{Math.round(axisLatest[weakest]!)}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-cream-dim">{t(AXIS_CAPTION[weakest])}</p>
                </div>
              </Panel>
            </div>
          </FadeRise>
        )}

        {/* Badges, Duolingo's achievement wall: earned ones in full colour,
            the rest greyed so the next one to chase is visible. */}
        {profile && (
          <FadeRise delay={0.1}>
            <Panel className="p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-cream-bright">{t("progress.badges")}</h2>
                <p className="text-sm font-medium tabular-nums text-cream-dim">
                  {t("progress.badgesCount", {
                    earned: profile.badges.length,
                    total: profile.catalogue.length,
                  })}
                </p>
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {profile.catalogue.map((badge, index) => {
                  const held = profile.badges.find((b) => b.badgeId === badge.id);
                  const text = badgeText(t, badge);
                  return (
                    <li
                      key={badge.id}
                      className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-transform duration-200 ease-press ${
                        held ? "bg-accent-soft hover:scale-[1.03]" : "bg-surface-lift"
                      }`}
                    >
                      <PopIn delay={held ? 0.05 * index : 0}>
                        <img
                          src={`/badges/${badge.id}.png`}
                          alt=""
                          width={72}
                          height={72}
                          loading="lazy"
                          className={`h-[72px] w-[72px] ${held ? "drop-shadow-[0_6px_10px_rgb(0_0_0/0.15)]" : "opacity-40 grayscale"}`}
                        />
                      </PopIn>
                      <p className={`text-sm font-semibold ${held ? "text-cream-bright" : "text-cream-dim"}`}>{text.label}</p>
                      <p className="text-xs leading-snug text-cream-faint">{text.description}</p>
                      {held && (
                        <p className="text-xs font-medium text-accent-text">{formatSessionDate(held.earnedAt)}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </FadeRise>
        )}

        {/* The charts, for whoever wants them — folded so they never stand
            between a person and the plain-language summary above. */}
        <FadeRise delay={0.15}>
          <details className="group rounded-card bg-surface-card shadow-card">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-6 sm:px-8">
              <span>
                <span className="block text-base font-semibold text-cream-bright">{t("progress.charts")}</span>
                <span className="mt-0.5 block text-sm text-cream-dim">{t("progress.chartsHint")}</span>
              </span>
              <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-cream-dim transition-transform duration-200 ease-press group-open:rotate-180" />
            </summary>
            <div className="border-t border-line p-4 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-3">
          <FadeRise delay={0.05} className="xl:col-span-1">
            <div className="flex h-full flex-col p-2 sm:p-4">
              <Eyebrow>{t("progress.overall")}</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                {t("progress.overallNote")}
              </p>
              <div className="mt-6">
                <TrendChart title={t("progress.score")} points={scorePoints} />
              </div>
            </div>
          </FadeRise>

          <FadeRise delay={0.1} className="xl:col-span-2">
            <div className="flex h-full flex-col p-2 sm:p-4">
              <Eyebrow>{t("progress.byFront")}</Eyebrow>
              <p className="mt-2 max-w-3xl text-xs text-cream-faint">
                {t("progress.byFrontNote")}
              </p>
              {/* The shape answers whether someone is lopsided at a glance;
                  the small multiples underneath answer whether it is moving. */}
              <div className="mt-6 w-full max-w-md">
                <RadarChart
                  title={t("progress.shape")}
                  scores={axisLatest}
                  labels={axisLabels}
                />
              </div>
              <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {(Object.keys(AXIS_LABEL) as Axis[]).map((axis) => (
                  <TrendChart
                    key={axis}
                    title={t(AXIS_LABEL[axis])}
                    caption={t(AXIS_CAPTION[axis])}
                    points={axisPoints(axis)}
                  />
                ))}
              </div>
            </div>
          </FadeRise>
        </div>

            </div>
          </details>
        </FadeRise>

        <div className="mt-8">
          <SessionList />
        </div>
      </PageBody>
    </>
  );
}
