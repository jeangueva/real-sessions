import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Meter, Panel, TrendChart } from "@/design-system";
import type { TrendPoint } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Avatar } from "@/design-system";
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

  const axisPoints = (axis: Axis): TrendPoint[] =>
    axes.map((point, index) => ({
      label: sessions?.[index] ? labelFor(sessions[index]!) : `Session ${index + 1}`,
      value: point.scores[axis],
    }));

  if (error) {
    return (
      <>
        <PageHeader title={t("progress.title")} />
        <PageBody>
          <Panel variant="glass" className="max-w-2xl p-6">
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
          <Panel variant="raised" className="flex max-w-2xl flex-col gap-5 p-6">
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
                size={56}
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
            ? "Loading…"
            : `${sessions.length} completed session${sessions.length === 1 ? "" : "s"}`
        }
      />

      <PageBody className="flex flex-col gap-4">
        {profile && (
          <FadeRise>
            <Panel variant="raised" className="flex flex-wrap items-center gap-8 p-6">
              {/* The avatar sits with the level rather than in a panel of its
                  own: the number is what it is derived from, and separating
                  them would make it look like a decoration instead of a
                  reading of the same thing. */}
              <div className="flex items-center gap-4">
                <Avatar
                  level={profile.level}
                  axis={dominantAxis(axisLatest)}
                  size={72}
                  className="shrink-0 text-cream-bright"
                />
                <div>
                  <Eyebrow>{t("progress.level")}</Eyebrow>
                  <p className="mt-2 text-title text-cream-bright">{profile.level}</p>
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
                  <p className="mt-2 text-title text-cream-bright">
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

        <div className="grid gap-4 xl:grid-cols-3">
          <FadeRise delay={0.05} className="xl:col-span-1">
            <Panel className="flex h-full flex-col p-6">
              <Eyebrow>{t("progress.overall")}</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                {t("progress.overallNote")}
              </p>
              <div className="mt-6">
                <TrendChart title={t("progress.score")} points={scorePoints} />
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.1} className="xl:col-span-2">
            <Panel className="flex h-full flex-col p-6">
              <Eyebrow>{t("progress.byFront")}</Eyebrow>
              <p className="mt-2 max-w-3xl text-xs text-cream-faint">
                {t("progress.byFrontNote")}
              </p>
              <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {(Object.keys(AXIS_LABEL) as Axis[]).map((axis) => (
                  <TrendChart
                    key={axis}
                    title={t(AXIS_LABEL[axis])}
                    caption={t(AXIS_CAPTION[axis])}
                    points={axisPoints(axis)}
                  />
                ))}
              </div>
            </Panel>
          </FadeRise>
        </div>

        {profile && (
          <FadeRise delay={0.15}>
            <Panel className="p-6">
              <Eyebrow>{t("progress.badges")}</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                {t("progress.badgesCount", {
                  earned: profile.badges.length,
                  total: profile.catalogue.length,
                })}
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {profile.catalogue.map((badge) => {
                  const held = profile.badges.find((b) => b.badgeId === badge.id);
                  return (
                    <li
                      key={badge.id}
                      className={`rounded-2xl border px-4 py-3 ${
                        held ? "border-cream/40" : "border-line opacity-50"
                      }`}
                    >
                      <p className="text-sm text-cream-bright">{badge.label}</p>
                      <p className="mt-1 text-xs text-cream-faint">
                        {badge.description}
                      </p>
                      {held && (
                        <p className="mt-2 text-xs text-cream-dim">
                          {formatSessionDate(held.earnedAt)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </FadeRise>
        )}
      </PageBody>
    </>
  );
}
