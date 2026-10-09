import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Check, Flame, Share2, ShieldCheck, Sparkles, Target } from "lucide-react";
import { EASE_OUT } from "@/design-system/motion";
import { ScoreRing } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { fetchProfile } from "@/lib/api";
import type { Mission, SessionSummary } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { streakState } from "@/lib/journey";
import type { MessageKey } from "@/lib/i18n";

const MISSION_LABEL: Record<Mission["id"], MessageKey> = {
  "week-three": "mission.week-three",
  "week-share": "mission.week-share",
  "week-two-days": "mission.week-two-days",
};

const MISSION_ICON: Record<Mission["id"], typeof Target> = {
  "week-three": Target,
  "week-share": Share2,
  "week-two-days": CalendarDays,
};

/**
 * Today, at a glance: the day's ring, the streak and the week's missions.
 *
 * Duolingo's home is three questions answered before anything else — did I
 * practise today, is my streak safe, what is left this week — and this is
 * that, in the product's own units. The ring is XP, because XP is already
 * what the report hands out; the streak is days, with the shield that
 * forgives one slip a week (see `streakState`); the missions are the
 * server's, so the reward promised here is the one the ledger pays.
 *
 * A failed profile read leaves the ring and missions out rather than drawing
 * them at zero: "0 of 100" on a storage blip reads as a day not practised.
 */
export function Today({ sessions }: { sessions: SessionSummary[] }) {
  const t = useT();
  const still = useReducedMotion();
  const [profile, setProfile] = useState<{
    xpToday: number;
    dailyGoal: number;
    missions: Mission[];
  } | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((result) => {
        if (result.dailyGoal === undefined) return;
        setProfile({
          xpToday: result.xpToday ?? 0,
          dailyGoal: result.dailyGoal,
          missions: result.missions ?? [],
        });
      })
      .catch(() => undefined);
  }, []);

  const streak = streakState(
    sessions.flatMap((entry) => (entry.completedAt ? [entry.completedAt] : [])),
  );
  const pct = profile ? Math.min(100, Math.round((profile.xpToday / profile.dailyGoal) * 100)) : 0;
  const goalMet = profile !== null && profile.xpToday >= profile.dailyGoal;

  return (
    <section
      aria-labelledby="today-title"
      className="grid gap-4 rounded-card bg-surface-card p-5 shadow-card sm:p-7 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8 [&>*]:min-w-0"
    >
      <h2 id="today-title" className="sr-only">
        {t("today.title")}
      </h2>

      {/* The day and the streak, side by side: the two things that change
          today. */}
      <div className="flex items-center gap-5">
        {profile && (
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing value={pct} size={96}>
              {goalMet ? (
                <motion.span
                  className="grid h-10 w-10 place-items-center rounded-full bg-grow text-white"
                  initial={still ? false : { transform: "scale(0.6)", opacity: 0 }}
                  animate={{ transform: "scale(1)", opacity: 1 }}
                  transition={{ type: "spring", duration: 0.5, bounce: 0.4, delay: 0.9 }}
                >
                  <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                </motion.span>
              ) : (
                <span className="text-lg font-bold tabular-nums text-cream-bright">{pct}%</span>
              )}
            </ScoreRing>
            <p className="text-xs font-semibold text-cream-bright">{t("today.goalTitle")}</p>
            <p className="text-xs tabular-nums text-cream-dim">
              {goalMet
                ? t("today.goalDone")
                : t("today.goalProgress", { xp: formatCount(profile.xpToday), goal: formatCount(profile.dailyGoal) })}
            </p>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <p className="flex items-center gap-2">
            <motion.span
              aria-hidden
              className={`grid h-12 w-12 place-items-center rounded-2xl ${
                streak.days > 0 ? "bg-step-soft text-step" : "bg-surface-lift text-cream-faint"
              }`}
              // The flame flickers once when the day is already done — the
              // one moment it has something new to say.
              initial={false}
              animate={!still && streak.today ? { transform: ["scale(1)", "scale(1.15)", "scale(1)"] } : undefined}
              transition={{ duration: 0.6, delay: 0.6, ease: EASE_OUT }}
            >
              <Flame className="h-7 w-7" fill={streak.days > 0 ? "currentColor" : "none"} />
            </motion.span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold leading-none tabular-nums text-cream-bright">
                {formatCount(streak.days)}
              </span>
              <span className="text-sm text-cream-dim">
                {streak.days > 0 ? t("today.streakDays") : t("today.streakStart")}
              </span>
            </span>
          </p>
          {streak.days > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-cream-dim">
              <ShieldCheck
                aria-hidden
                className={`mt-px h-4 w-4 shrink-0 ${streak.shieldReady ? "text-accent-text" : "text-cream-faint"}`}
              />
              {streak.shieldReady ? t("today.shieldReady") : t("today.shieldUsed")}
            </p>
          )}
        </div>
      </div>

      {profile && profile.missions.length > 0 && (
        <div className="min-w-0 lg:border-l lg:border-line lg:pl-8">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-cream-bright">{t("today.missionsTitle")}</h3>
            <p className="text-xs text-cream-faint">{t("today.missionsReset")}</p>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {profile.missions.map((mission, index) => {
              const Icon = MISSION_ICON[mission.id];
              return (
                <li key={mission.id} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      mission.done ? "bg-grow text-white" : "bg-accent-soft text-accent-text"
                    }`}
                  >
                    {mission.done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm font-medium ${mission.done ? "text-cream-dim" : "text-cream-bright"}`}>
                        {t(MISSION_LABEL[mission.id])}
                      </p>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-premium">
                        <Sparkles aria-hidden className="h-3.5 w-3.5" />+{mission.xp} XP
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={mission.goal}
                      aria-valuenow={mission.progress}
                      aria-label={t(MISSION_LABEL[mission.id])}
                      className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-lift"
                    >
                      <motion.span
                        className={`block h-full origin-left rounded-full rtl:origin-right ${mission.done ? "bg-grow" : "bg-accent"}`}
                        initial={still ? false : { transform: "scaleX(0)" }}
                        animate={{ transform: `scaleX(${mission.progress / mission.goal})` }}
                        transition={{ duration: 0.6, delay: 0.2 + index * 0.08, ease: EASE_OUT }}
                      />
                    </div>
                  </div>
                  <span className="w-9 shrink-0 text-end text-xs tabular-nums text-cream-dim">
                    {mission.progress}/{mission.goal}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
