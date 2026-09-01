/**
 * Display formatting shared across screens.
 *
 * Dates are pinned to `en-US` rather than the browser locale. The product copy
 * is English, and a Spanish-locale browser rendered "31 ago" next to English
 * text — which reads as "31 ago", not "31 August". Mixing one locale's dates
 * into another locale's sentences is worse than picking one.
 *
 * When the interface is translated, this is the single place that changes.
 */
const LOCALE = "en-US";

/**
 * "Aug 31" for this year, "Aug 31, 2025" for any other.
 *
 * Accepts null because a session row now exists from the moment an interview
 * starts, so an abandoned one has no completion date to show.
 */
export function formatSessionDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    // Dropping the year only when it is the current one keeps recent rows
    // short without making an old session ambiguous.
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * Metric formatters.
 *
 * Every one of these returns an em dash for null rather than a zero. A zero is
 * a measurement and null is the absence of one — printing "0 wpm" for a typed
 * session would be a quiet lie, and these numbers are shown as evidence.
 */
const ABSENT = "—";

export function formatWpm(value: number | null): string {
  return value === null ? ABSENT : `${Math.round(value)} wpm`;
}

export function formatFiller(value: number | null): string {
  return value === null ? ABSENT : `${value.toFixed(1)} / 100 words`;
}

export function formatSeconds(ms: number | null): string {
  return ms === null ? ABSENT : `${(ms / 1000).toFixed(1)}s`;
}

export function formatMinutes(ms: number | null): string {
  if (ms === null) return ABSENT;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

/** A ratio stored 0–1, shown as a percentage. */
export function formatShare(value: number | null): string {
  return value === null ? ABSENT : `${Math.round(value * 100)}%`;
}
