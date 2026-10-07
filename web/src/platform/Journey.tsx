import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, Check, Flame } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { fetchApplications } from "@/lib/api";
import type { ApplicationStatus, SessionSummary } from "@/lib/api";
import { journey, PRACTICE_GOAL, streakDays } from "@/lib/journey";
import type { MilestoneId, MilestoneState } from "@/lib/journey";
import type { MessageKey } from "@/lib/i18n";

const LABEL: Record<Exclude<MilestoneId, "practice">, MessageKey> = {
  first: "journey.first",
  real: "journey.real",
  offer: "journey.offer",
};

const STATE: Record<MilestoneState, MessageKey> = {
  done: "journey.done",
  now: "journey.now",
  ahead: "journey.ahead",
};

/**
 * The way from here to a job, drawn as a path.
 *
 * Sits on the two screens somebody opens to decide whether to practise again
 * — the start screen and their path — so the reason to keep going is in view
 * at the moment of deciding. Each stop is decided by something they did (see
 * `lib/journey.ts`); nothing here moves because time passed.
 *
 * The applications are fetched here rather than passed in, because neither
 * screen otherwise needs them. A failed fetch is read as "no applications":
 * the two job milestones stay ahead, which is what they would show anyway for
 * somebody who has not tracked a search.
 */
export function Journey({ sessions }: { sessions: SessionSummary[] }) {
  const t = useT();
  const still = useReducedMotion();
  const [statuses, setStatuses] = useState<ApplicationStatus[]>([]);

  useEffect(() => {
    fetchApplications()
      .then((result) => setStatuses(result.applications.map((entry) => entry.status)))
      .catch(() => setStatuses([]));
  }, []);

  const completed = sessions.filter((entry) => entry.completedAt !== null);
  const milestones = journey(completed.length, statuses);
  const streak = streakDays(completed.map((entry) => entry.completedAt as string));

  return (
    <section
      aria-labelledby="journey-title"
      className="rounded-2xl border border-line bg-surface-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="journey-title" className="text-sm text-cream-dim">
          {t("journey.title")}
        </h2>
        {/* Two days at least. One day is not a streak, it is today, and a
            badge that says "1" reads as a count of how little was done. */}
        {streak >= 2 && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs text-accent-text">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {t("streak.days", { count: streak })}
          </p>
        )}
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-1">
        {milestones.map((milestone, index) => {
          const label =
            milestone.id === "practice"
              ? t("journey.practice", {
                  done: Math.min(completed.length, PRACTICE_GOAL),
                  goal: PRACTICE_GOAL,
                })
              : t(LABEL[milestone.id]);
          const last = index === milestones.length - 1;
          return (
            <li key={milestone.id} className="relative flex flex-col items-center text-center">
              {/* The line to the next stop. Filled when this stop is behind
                  them, so the drawn part of the path is the part walked. */}
              {!last && (
                <span
                  aria-hidden
                  className="absolute top-4 h-0.5 w-full translate-x-1/2 bg-line rtl:-translate-x-1/2"
                >
                  {milestone.state === "done" && (
                    <motion.span
                      className="block h-full origin-left bg-grow rtl:origin-right"
                      initial={still ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, delay: 0.2 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </span>
              )}
              <Stop state={milestone.state} index={index} offer={milestone.id === "offer"} still={!!still} />
              <span
                className={`mt-2 text-xs leading-snug ${
                  milestone.state === "ahead" ? "text-cream-faint" : "text-cream-bright"
                }`}
              >
                {label}
                <span className="sr-only">. {t(STATE[milestone.state])}</span>
              </span>
              {milestone.id === "real" && milestone.state !== "done" && statuses.length === 0 && (
                <Link
                  to="/app/applications"
                  className="focus-ring mt-1 rounded text-xs text-accent-text underline underline-offset-4"
                >
                  {t("nav.applications")}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Stop({
  state,
  index,
  offer,
  still,
}: {
  state: MilestoneState;
  index: number;
  offer: boolean;
  still: boolean;
}) {
  if (state === "done") {
    return (
      <motion.span
        aria-hidden
        className="relative grid h-8 w-8 place-items-center rounded-full bg-grow text-surface-raised shadow-[0_0_12px_rgba(95,208,168,0.4)]"
        initial={still ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </motion.span>
    );
  }
  if (state === "now") {
    return (
      <span aria-hidden className="relative grid h-8 w-8 place-items-center">
        {/* The one moving thing on the path: the stop they are on breathes,
            the way the interviewer does while waiting for them to speak. */}
        {!still && (
          <motion.span
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ scale: [1, 1.6, 1], opacity: [0.45, 0, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_0_16px_rgba(168,151,255,0.45)]">
          {offer ? <Briefcase className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-accent-ink" />}
        </span>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="relative grid h-8 w-8 place-items-center rounded-full border-2 border-dashed border-line-strong bg-surface-card text-cream-faint"
    >
      {offer && <Briefcase className="h-4 w-4" />}
    </span>
  );
}
