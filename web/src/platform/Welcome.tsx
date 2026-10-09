import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { EASE_OUT } from "@/design-system/motion";
import { useT } from "@/hooks/useLocale";
import { fetchApplications, fetchPreferences } from "@/lib/api";
import type { SessionSummary } from "@/lib/api";
import type { MessageKey } from "@/lib/i18n";

const DISMISSED = "mockio.welcome.dismissed";

interface Step {
  id: string;
  label: MessageKey;
  done: boolean;
  /** Where to go to do it. Absent when the Begin button below is the way. */
  to?: string;
}

/**
 * The first five things to do, as a checklist with a bar.
 *
 * Open University's lesson: a short list with a visible end gets finished,
 * and each tick is its own small reward. Every item is a fact the product
 * already stores — nothing is ticked for having looked at a screen — and
 * each one is a step deeper into it: a name the interviewer greets you by,
 * a first interview, one without coaching, a shared report, a real search.
 *
 * It leaves on its own once everything is ticked, and can be hidden sooner.
 * Hiding is per browser: it is a convenience, not a setting.
 */
export function Welcome({ sessions }: { sessions: SessionSummary[] }) {
  const t = useT();
  const still = useReducedMotion();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED) === "1";
    } catch {
      return false;
    }
  });
  const [named, setNamed] = useState<boolean | null>(null);
  const [tracking, setTracking] = useState<boolean | null>(null);

  useEffect(() => {
    if (hidden) return;
    fetchPreferences()
      .then((result) => setNamed(result.preferences.candidateName.trim().length > 0))
      .catch(() => setNamed(false));
    fetchApplications()
      .then((result) => setTracking(result.applications.length > 0))
      .catch(() => setTracking(false));
  }, [hidden]);

  // Until both reads land the list would flash items as undone.
  if (hidden || named === null || tracking === null) return null;

  const completed = sessions.filter((entry) => entry.completedAt !== null);
  const steps: Step[] = [
    { id: "name", label: "welcome.name", done: named, to: "/app/settings#account" },
    { id: "first", label: "welcome.first", done: completed.length > 0 },
    { id: "real", label: "welcome.real", done: completed.some((entry) => entry.mode === "real") },
    { id: "share", label: "welcome.share", done: sessions.some((entry) => Boolean(entry.shareToken)), to: "/app/progress#sessions" },
    { id: "track", label: "welcome.track", done: tracking, to: "/app/applications" },
  ];
  const done = steps.filter((step) => step.done).length;
  if (done === steps.length) return null;

  const hide = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {
      /* private window: hidden for this visit only */
    }
    setHidden(true);
  };

  return (
    <section aria-labelledby="welcome-title" className="rounded-card bg-surface-card p-5 shadow-card sm:p-7">
      <div className="flex items-start gap-4">
        <img src="/avatars/level-1.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 id="welcome-title" className="text-base font-semibold text-cream-bright">
              {t("welcome.title")}
            </h2>
            <button
              type="button"
              onClick={hide}
              aria-label={t("welcome.hide")}
              className="focus-ring -m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-cream-faint transition-colors hover:bg-surface-lift hover:text-cream-bright"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <p className="mt-0.5 text-sm text-cream-dim">
            {t("welcome.progress", { done, total: steps.length })}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-lift">
            <motion.span
              className="block h-full origin-left rounded-full bg-grow rtl:origin-right"
              initial={still ? false : { transform: "scaleX(0)" }}
              animate={{ transform: `scaleX(${done / steps.length})` }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
            />
          </div>
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => {
          const body = (
            <>
              <span
                aria-hidden
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  step.done ? "bg-grow text-white" : "border-2 border-line-strong"
                }`}
              >
                {step.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className={step.done ? "text-cream-faint line-through" : "text-cream-bright"}>
                {t(step.label)}
              </span>
              <span className="sr-only">. {t(step.done ? "journey.done" : "journey.ahead")}</span>
            </>
          );
          const className = "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm";
          return (
            <li key={step.id}>
              {step.to && !step.done ? (
                <Link to={step.to} className={`${className} focus-ring bg-surface-lift transition-colors hover:bg-accent-soft`}>
                  {body}
                </Link>
              ) : (
                <span className={`${className} ${step.done ? "" : "bg-surface-lift"}`}>{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
