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

/** "Aug 31" for this year, "Aug 31, 2025" for any other. */
export function formatSessionDate(iso: string): string {
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
