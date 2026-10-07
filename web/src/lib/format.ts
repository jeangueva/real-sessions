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
/**
 * The interface language, read from `<html lang>` (useLocale keeps it in
 * step). Dates used to be pinned to en-US so they never mixed with English
 * sentences; the interface is translated now, and "Oct 7" in a Spanish
 * sentence is the same mismatch the pin was written to avoid, turned round.
 * Falls back to en-US where there is no document — the tests, the server.
 */
function uiLocale(): string {
  if (typeof document === "undefined") return "en-US";
  return document.documentElement.lang || "en-US";
}

/** A count in the reader's grouping: 12.840 in Spanish, 12,840 in English. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat(uiLocale()).format(value);
}

function oneDecimal(value: number): string {
  return new Intl.NumberFormat(uiLocale(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

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
  return date.toLocaleDateString(uiLocale(), {
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

/**
 * A price, in the currency the seller's Mercado Pago account charges in.
 *
 * `Intl` knows each currency's own conventions — two decimals and "S/" for
 * PEN, none at all for CLP — which is what stops 29.9 reaching a reader as
 * "29.9". Falls back to "<amount> <code>" where the runtime has no data for
 * the currency rather than throwing on the page that announces the price.
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatWpm(value: number | null): string {
  return value === null ? ABSENT : `${Math.round(value)} wpm`;
}

/** Per hundred words. `unit` is the translated "/ 100 words". */
export function formatFiller(value: number | null, unit = "/ 100 words"): string {
  return value === null ? ABSENT : `${oneDecimal(value)} ${unit}`;
}

export function formatSeconds(ms: number | null): string {
  return ms === null ? ABSENT : `${oneDecimal(ms / 1000)}s`;
}

export function formatMinutes(ms: number | null): string {
  if (ms === null) return ABSENT;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  // Rolls up to hours: "77040m 0s" was the first version's answer to a
  // long session, and nobody reads minutes in the tens of thousands.
  if (minutes >= 60) {
    return `${formatCount(Math.floor(minutes / 60))}h ${minutes % 60}m`;
  }
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${seconds}s`;
}

/** A ratio stored 0–1, shown as a percentage. */
export function formatShare(value: number | null): string {
  return value === null ? ABSENT : `${Math.round(value * 100)}%`;
}
