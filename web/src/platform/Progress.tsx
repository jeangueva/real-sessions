import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Meter, Panel, TrendChart } from "@/design-system";
import type { TrendPoint } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
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

const AXIS_LABEL: Record<Axis, string> = {
  fluency: "Fluency",
  vocabulary: "Vocabulary",
  structure: "Structure",
  confidence: "Confidence",
};

const AXIS_CAPTION: Record<Axis, string> = {
  fluency: "Pace, against a 140 wpm target",
  vocabulary: "Range of words you actually reach for",
  structure: "Whether an answer has a shape",
  confidence: "Fewer fillers reads as steadier",
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

  const axisPoints = (axis: Axis): TrendPoint[] =>
    axes.map((point, index) => ({
      label: sessions?.[index] ? labelFor(sessions[index]!) : `Session ${index + 1}`,
      value: point.scores[axis],
    }));

  if (error) {
    return (
      <>
        <PageHeader title="Progress" />
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
        <PageHeader title="Progress" meta="Nothing to plot yet" />
        <PageBody>
          <Panel variant="raised" className="flex max-w-2xl flex-col gap-4 p-6">
            <p className="text-sm text-cream-dim">
              Finish an interview and this fills in. One session gives you a
              baseline; the shape starts meaning something around the third.
            </p>
            <Link to="/app" className="self-start">
              <Action withArrow>Start an interview</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Progress"
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
              <div>
                <Eyebrow>Level</Eyebrow>
                <p className="mt-2 text-title text-cream-bright">{profile.level}</p>
              </div>
              <div className="min-w-[12rem] flex-1">
                <Meter
                  label={`${profile.xp} XP total`}
                  value={profile.xpIntoLevel}
                  max={profile.xpForNextLevel}
                  suffix=""
                />
                <p className="mt-2 text-xs text-cream-faint">
                  {profile.xpForNextLevel - profile.xpIntoLevel} XP to level{" "}
                  {profile.level + 1}
                </p>
              </div>
              {league?.you && (
                <div>
                  <Eyebrow>This week</Eyebrow>
                  <p className="mt-2 text-title text-cream-bright">
                    #{league.you}
                  </p>
                  <p className="mt-1 text-xs text-cream-faint">
                    of {league.rows.length} in your league
                  </p>
                </div>
              )}
            </Panel>
          </FadeRise>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <FadeRise delay={0.05} className="xl:col-span-1">
            <Panel className="flex h-full flex-col p-6">
              <Eyebrow>Overall score</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                The evaluator's read of each interview. The axis is fixed at
                0–100 on purpose — a chart that rescales to its own data turns
                three points of noise into a climb.
              </p>
              <div className="mt-6">
                <TrendChart title="Score" points={scorePoints} />
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.1} className="xl:col-span-2">
            <Panel className="flex h-full flex-col p-6">
              <Eyebrow>By front</Eyebrow>
              <p className="mt-2 max-w-3xl text-xs text-cream-faint">
                Four separate readings rather than one number. Being fluent but
                disorganised, or structured but hesitant, are different problems
                with different fixes — a single score hides both.
              </p>
              <div className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {(Object.keys(AXIS_LABEL) as Axis[]).map((axis) => (
                  <TrendChart
                    key={axis}
                    title={AXIS_LABEL[axis]}
                    caption={AXIS_CAPTION[axis]}
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
              <Eyebrow>Badges</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                {profile.badges.length} of {profile.catalogue.length} earned.
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
