/**
 * The reader's own currency, and what a price comes to in it.
 *
 * The plan is charged in soles and can only be charged in soles — that is the
 * currency of the seller's Mercado Pago account. A reader in Buenos Aires or
 * Madrid does not know "PEN" is a sol, or what 287 of them is; the first
 * person to look at the pricing card from outside Peru asked for exactly that.
 * So the page shows an approximate figure in their currency next to the real
 * one, and says which one the card is charged.
 *
 * The currency is read from the browser's region (`es-AR` → ARS), then from
 * its timezone, and nothing is sent anywhere to work it out. When neither
 * names a country we know, there is no local figure — the charged price on its
 * own is better than a guess in the wrong currency.
 */

/** Country → currency, for the places this product's readers are. */
const CURRENCY_BY_REGION: Record<string, string> = {
  // Latin America
  AR: "ARS", BO: "BOB", BR: "BRL", CL: "CLP", CO: "COP", CR: "CRC", CU: "CUP",
  DO: "DOP", EC: "USD", GT: "GTQ", HN: "HNL", MX: "MXN", NI: "NIO", PA: "USD",
  PE: "PEN", PR: "USD", PY: "PYG", SV: "USD", UY: "UYU", VE: "USD",
  // North America and the UK
  US: "USD", CA: "CAD", GB: "GBP",
  // Euro area
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR",
  LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
  // Elsewhere the interface is translated for
  CH: "CHF", IL: "ILS", IN: "INR", JP: "JPY", KR: "KRW", CN: "CNY", RU: "RUB",
  TH: "THB", SA: "SAR", AE: "AED", EG: "EGP", AU: "AUD", NZ: "NZD",
};

/**
 * Timezone → country, for browsers whose language carries no region ("es",
 * "en"). Only the zones that settle it unambiguously; a reader in
 * `America/New_York` with `es` is far likelier to want dollars than anything
 * a broader guess would give.
 */
const REGION_BY_ZONE: Record<string, string> = {
  "America/Lima": "PE",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Buenos_Aires": "AR",
  "America/Argentina/Cordoba": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Mexico_City": "MX",
  "America/Monterrey": "MX",
  "America/Guayaquil": "EC",
  "America/Caracas": "VE",
  "America/Montevideo": "UY",
  "America/Asuncion": "PY",
  "America/La_Paz": "BO",
  "America/Sao_Paulo": "BR",
  "America/Costa_Rica": "CR",
  "America/Guatemala": "GT",
  "America/Panama": "PA",
  "America/Santo_Domingo": "DO",
  "America/El_Salvador": "SV",
  "America/Tegucigalpa": "HN",
  "America/Managua": "NI",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "Europe/Madrid": "ES",
  "Europe/London": "GB",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Lisbon": "PT",
  "Europe/Amsterdam": "NL",
  "Europe/Dublin": "IE",
};

export function currencyFor(languages: readonly string[], timeZone: string | undefined): string | null {
  for (const tag of languages) {
    const region = tag.split(/[-_]/)[1]?.toUpperCase();
    if (region && CURRENCY_BY_REGION[region]) return CURRENCY_BY_REGION[region]!;
  }
  const region = timeZone ? REGION_BY_ZONE[timeZone] : undefined;
  return region ? (CURRENCY_BY_REGION[region] ?? null) : null;
}

/** The reader's currency, from this browser. */
export function visitorCurrency(): string | null {
  try {
    const languages = typeof navigator === "undefined" ? [] : [...(navigator.languages ?? []), navigator.language];
    return currencyFor(languages.filter(Boolean), Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

export interface Rates {
  base: string;
  values: Record<string, number>;
  asOf: string;
}

/**
 * The approximate amount in `target`, or null when there is nothing worth
 * showing: no rate, or the reader already pays in the charged currency.
 */
export function convert(
  amount: number,
  charged: string,
  target: string | null,
  rates: Rates | null,
): number | null {
  if (!target || !rates || target === charged || rates.base !== charged) return null;
  const rate = rates.values[target];
  return rate ? amount * rate : null;
}

/** An approximate figure, with no decimals: "≈ ARS 126.305", not "126.304,87". */
export function formatApprox(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

/** "sol peruano", "Peruvian sol" — the currency's own name, in the reader's language. */
export function currencyName(currency: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "currency" }).of(currency) ?? currency;
  } catch {
    return currency;
  }
}
