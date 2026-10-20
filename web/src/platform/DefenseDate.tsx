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
  // Inline in the thesis bar: the date, the days left, the warm-up once it
  // is close. What the mails are lives in the input's tooltip.
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <CalendarDays aria-hidden className="h-4 w-4 text-accent-text" />
      <label htmlFor="defense-date" className="text-sm font-medium text-cream-bright">
        {t("dateShort")}
      </label>
      <input
        id="defense-date"
        type="date"
        min={today()}
        value={date}
        title={t("dateBody")}
        onChange={(event) => void save(event.target.value || null)}
        className="focus-ring rounded-lg bg-surface-lift px-2 py-1 text-sm text-cream-bright"
      />
      {left !== null && left >= 0 && (
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">
          {left === 0 ? t("dayToday") : left === 1 ? t("dayTomorrow") : t("daysLeft", { count: left })}
        </span>
      )}
      {date && left !== null && left <= 1 && (
        <Link to="/app/thesis/warmup" className="focus-ring rounded-full text-xs font-semibold text-accent-text underline underline-offset-4">
          {t("warmupCta")}
        </Link>
      )}
      {date && (
        <button
          type="button"
          onClick={() => void save(null)}
          aria-label={t("dateClear")}
          title={t("dateClear")}
          className="focus-ring grid h-6 w-6 place-items-center rounded-full text-cream-faint transition-[background-color,color,transform] duration-150 ease-press hover:bg-surface-lift hover:text-cream-bright active:scale-[0.92]"
        >
          ×
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-step-text">
          {error}
        </p>
      )}
    </div>
  );
}
