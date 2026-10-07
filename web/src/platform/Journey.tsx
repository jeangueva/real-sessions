import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/design-system/motion";
import { formatCount } from "@/lib/format";
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
      className="rounded-card bg-surface-card p-5 shadow-card sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="journey-title" className="text-base font-semibold text-cream-bright">
          {t("journey.title")}
        </h2>
        {/* Two days at least. One day is not a streak, it is today, and a
            badge that says "1" reads as a count of how little was done. */}
        {streak >= 2 && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {t("streak.days", { count: formatCount(streak) })}
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
            <li key={milestone.id} className="relative flex min-w-0 flex-col items-center text-center">
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
                      // Practicar opens on this, tens of times: quick enough
                      // to read as the path settling, not as a show.
                      transition={{ duration: 0.4, delay: 0.1 + index * 0.05, ease: EASE_OUT }}
                    />
                  )}
                </span>
              )}
              <Stop state={milestone.state} index={index} offer={milestone.id === "offer"} still={!!still} />
              <span
                /* Four columns on a 320px phone are 65px each, narrower than
                   "entrevistas": the labels ran into one another. They may
                   hyphenate (in the interface language, set on <html>) and,
                   failing that, break anywhere — never overlap. */
                className={`mt-2 w-full hyphens-auto text-xs leading-snug [overflow-wrap:anywhere] ${
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
        className="relative grid h-8 w-8 place-items-center rounded-full bg-grow text-white shadow-card"
        initial={still ? false : { transform: "scale(0.9)", opacity: 0 }}
        animate={{ transform: "scale(1)", opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.05 + index * 0.05, ease: EASE_OUT }}
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </motion.span>
    );
  }
  if (state === "now") {
    return (
      <span aria-hidden className="relative grid h-8 w-8 place-items-center">
        {/* The stop they are on announces itself twice, then rests. It used
            to breathe for ever — a slow loop on a screen opened every session
            is exactly the oscillation Apple's accessibility guidance says to
            avoid, and after the first second it says nothing new. */}
        {!still && (
          <motion.span
            className="absolute inset-0 rounded-full bg-accent"
            initial={{ transform: "scale(1)", opacity: 0 }}
            animate={{ transform: ["scale(1)", "scale(1.35)"], opacity: [0.4, 0] }}
            transition={{ duration: 1.2, repeat: 1, delay: 0.4, ease: EASE_OUT }}
          />
        )}
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink shadow-card">
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
