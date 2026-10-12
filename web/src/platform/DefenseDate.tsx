import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
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

  // One line inside the thesis card: the date, the days left, the warm-up.
  // What the mails are lives in the input's tooltip, not in a paragraph.
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <CalendarDays aria-hidden className="h-4 w-4 text-accent-text" />
        <label htmlFor="defense-date" className="text-sm font-semibold text-cream-bright">
          {t("dateTitle")}
        </label>
        <input
          id="defense-date"
          type="date"
          min={today()}
          value={date}
          title={t("dateBody")}
          onChange={(event) => void save(event.target.value || null)}
          className="focus-ring rounded-lg bg-surface-lift px-2.5 py-1.5 text-sm text-cream-bright"
        />
        {left !== null && left >= 0 && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">
            {left === 0 ? t("dayToday") : left === 1 ? t("dayTomorrow") : t("daysLeft", { count: left })}
          </span>
        )}
        {date && (
          <button
            type="button"
            onClick={() => void save(null)}
            className="focus-ring rounded-full text-xs font-semibold text-cream-dim underline underline-offset-4"
          >
            {t("dateClear")}
          </button>
        )}
        <Link
          to="/app/thesis/warmup"
          className="focus-ring ml-auto rounded-full text-xs font-semibold text-accent-text underline underline-offset-4"
        >
          {t("warmupCta")}
        </Link>
      </div>
      {!date && <p className="text-xs text-cream-dim">{t("dateBody")}</p>}
      {error && (
        <p role="alert" className="text-sm text-step-text">
          {error}
        </p>
      )}
    </div>
  );
}
