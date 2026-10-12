import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Panel } from "@/design-system";
import { ApiError, setDefenseDate } from "@/lib/api";
import type { StoredThesis } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/** Today, as YYYY-MM-DD in the reader's own time zone. */
function today(): string {
  return new Date().toLocaleDateString("en-CA");
}

/**
 * The date that everything else counts down to.
 *
 * Asked once and shown as days left, because "five days" changes what
 * someone does tonight in a way that "the 20th" does not.
 */
export function DefenseDate({ thesis, onChange }: { thesis: StoredThesis; onChange: (next: StoredThesis) => void }) {
  const t = useThesisT();
  const [error, setError] = useState<string | null>(null);
  const date = thesis.defenseDate ?? "";
  const left = date ? Math.round((Date.parse(date) - Date.parse(today())) / 86_400_000) : null;

  const save = async (next: string | null) => {
    setError(null);
    try {
      onChange((await setDefenseDate(next)).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    }
  };

  return (
    <Panel className="flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <CalendarDays aria-hidden className="h-5 w-5 text-accent-text" />
        <label htmlFor="defense-date" className="text-base font-semibold text-cream-bright">
          {t("dateTitle")}
        </label>
        <input
          id="defense-date"
          type="date"
          min={today()}
          value={date}
          onChange={(event) => void save(event.target.value || null)}
          className="focus-ring rounded-xl bg-surface-lift px-3 py-2 text-sm text-cream-bright"
        />
        {left !== null && left >= 0 && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-text">
            {left === 0 ? t("dayToday") : left === 1 ? t("dayTomorrow") : t("daysLeft", { count: left })}
          </span>
        )}
        {date && (
          <button
            type="button"
            onClick={() => void save(null)}
            className="focus-ring rounded-full px-2 py-1 text-xs font-semibold text-cream-dim underline underline-offset-4"
          >
            {t("dateClear")}
          </button>
        )}
      </div>
      <p className="text-sm text-cream-dim">{t("dateBody")}</p>
      {/* The warm-up is for the day itself, and offered from here so it is
          found when it is needed — on the morning, next to the countdown. */}
      <Link
        to="/app/thesis/warmup"
        className="focus-ring self-start rounded-full text-sm font-semibold text-accent-text underline underline-offset-4"
      >
        {t("warmupCta")}
      </Link>
      {error && (
        <p role="alert" className="text-sm text-step-text">
          {error}
        </p>
      )}
    </Panel>
  );
}
