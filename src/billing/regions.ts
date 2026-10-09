/**
 * What the plan costs, where.
 *
 * One price in soles was fair in Lima and wrong almost everywhere else: a
 * month in Madrid is easy at that number, a month in Bogotá is a real
 * decision, and a reader in Buenos Aires had to look up what a sol was before
 * deciding anything. So the price follows purchasing power, in four tiers, and
 * is charged in the reader's own currency wherever the provider can do it.
 *
 * Two providers, split by country:
 *
 *   Peru       Mercado Pago, in soles — local cards, lower fees, the checkout
 *              people there already trust. Its amounts stay in the
 *              environment (`MERCADOPAGO_AMOUNT`, `MERCADOPAGO_AMOUNT_YEARLY`)
 *              as before; this table does not override them.
 *   Elsewhere  Paddle, as merchant of record: it charges in local currency,
 *              applies the country's price below, and collects and remits the
 *              sales tax each country levies. A Peruvian Mercado Pago account
 *              can only charge soles, which is why this split exists.
 *
 * The countries listed are the ones the interface speaks to — the fourteen
 * languages it is translated into, and where those languages are spoken. Any
 * country not listed falls into tier 2 in dollars: a safe middle rather than
 * the cheapest price by accident.
 *
 * Prices include tax. The yearly price is ten months.
 *
 * Russia and Belarus are absent on purpose: Paddle cannot sell there under
 * sanctions, so they fall back to Mercado Pago in soles like any country
 * Paddle does not serve.
 */

export type Tier = 1 | 2 | 3 | 4;
export type Provider = "mercadopago" | "paddle";

export interface RegionalPrice {
  currency: string;
  monthly: number;
  yearly: number;
}

/**
 * Prices per tier, per currency. Each tier is roughly one dollar figure —
 * 4.99, 3.99, 2.99 and 1.99 a month — rounded to a number that reads as a
 * price in each currency rather than as a conversion. Tier 3 is Peru's level,
 * where the plan is S/ 9.90. Lowered on 2026-10-08 from 12/10/8/5: the price
 * should be an easy yes, not a decision. Review the volatile currencies (ARS,
 * TRY, UAH) every quarter.
 */
export const TIER_PRICES: Record<Tier, Record<string, RegionalPrice>> = {
  1: {
    USD: { currency: "USD", monthly: 4.99, yearly: 49.9 },
    EUR: { currency: "EUR", monthly: 4.99, yearly: 49.9 },
    GBP: { currency: "GBP", monthly: 3.99, yearly: 39.9 },
    CHF: { currency: "CHF", monthly: 3.99, yearly: 39.9 },
    CAD: { currency: "CAD", monthly: 6.99, yearly: 69.9 },
    AUD: { currency: "AUD", monthly: 7.99, yearly: 79.9 },
    NZD: { currency: "NZD", monthly: 8.99, yearly: 89.9 },
    JPY: { currency: "JPY", monthly: 750, yearly: 7500 },
    ILS: { currency: "ILS", monthly: 16.9, yearly: 169 },
    SGD: { currency: "SGD", monthly: 6.49, yearly: 64.9 },
    HKD: { currency: "HKD", monthly: 39, yearly: 390 },
    DKK: { currency: "DKK", monthly: 34, yearly: 340 },
    SEK: { currency: "SEK", monthly: 49, yearly: 490 },
    NOK: { currency: "NOK", monthly: 49, yearly: 490 },
  },
  2: {
    USD: { currency: "USD", monthly: 3.99, yearly: 39.9 },
    EUR: { currency: "EUR", monthly: 3.49, yearly: 34.9 },
    KRW: { currency: "KRW", monthly: 5500, yearly: 55000 },
    TWD: { currency: "TWD", monthly: 119, yearly: 1190 },
    CZK: { currency: "CZK", monthly: 85, yearly: 850 },
    PLN: { currency: "PLN", monthly: 14.9, yearly: 149 },
    HUF: { currency: "HUF", monthly: 1390, yearly: 13900 },
  },
  3: {
    USD: { currency: "USD", monthly: 2.99, yearly: 29.9 },
    EUR: { currency: "EUR", monthly: 2.59, yearly: 25.9 },
    MXN: { currency: "MXN", monthly: 55, yearly: 550 },
    BRL: { currency: "BRL", monthly: 15.9, yearly: 159 },
    CLP: { currency: "CLP", monthly: 2790, yearly: 27900 },
    CNY: { currency: "CNY", monthly: 21, yearly: 210 },
    THB: { currency: "THB", monthly: 99, yearly: 990 },
    ZAR: { currency: "ZAR", monthly: 52, yearly: 520 },
    TRY: { currency: "TRY", monthly: 125, yearly: 1250 },
  },
  4: {
    USD: { currency: "USD", monthly: 1.99, yearly: 19.9 },
    ARS: { currency: "ARS", monthly: 2900, yearly: 29000 },
    COP: { currency: "COP", monthly: 7900, yearly: 79000 },
    INR: { currency: "INR", monthly: 169, yearly: 1690 },
    VND: { currency: "VND", monthly: 49000, yearly: 490000 },
    UAH: { currency: "UAH", monthly: 79, yearly: 790 },
  },
};

/**
 * Country → [tier, local currency]. The currency is used when the tier has a
 * price in it and Paddle can charge it; otherwise the tier's dollar price is.
 */
export const COUNTRIES: Record<string, [Tier, string]> = {
  // Tier 1 — English, German, French, Japanese, Hebrew, Chinese (HK/SG) and the Nordics
  US: [1, "USD"], CA: [1, "CAD"], GB: [1, "GBP"], IE: [1, "EUR"], AU: [1, "AUD"],
  NZ: [1, "NZD"], CH: [1, "CHF"], DE: [1, "EUR"], AT: [1, "EUR"], FR: [1, "EUR"],
  BE: [1, "EUR"], NL: [1, "EUR"], LU: [1, "EUR"], DK: [1, "DKK"], SE: [1, "SEK"],
  NO: [1, "NOK"], FI: [1, "EUR"], IS: [1, "USD"], JP: [1, "JPY"], SG: [1, "SGD"],
  HK: [1, "HKD"], IL: [1, "ILS"], AE: [1, "USD"], QA: [1, "USD"], KW: [1, "USD"],
  // Tier 2 — Southern and Central Europe, Korea, Taiwan, the Gulf
  ES: [2, "EUR"], PT: [2, "EUR"], IT: [2, "EUR"], GR: [2, "EUR"], CY: [2, "EUR"],
  MT: [2, "EUR"], SI: [2, "EUR"], SK: [2, "EUR"], EE: [2, "EUR"], LV: [2, "EUR"],
  LT: [2, "EUR"], HR: [2, "EUR"], CZ: [2, "CZK"], PL: [2, "PLN"], HU: [2, "HUF"],
  KR: [2, "KRW"], TW: [2, "TWD"], SA: [2, "USD"], BH: [2, "USD"], OM: [2, "USD"],
  // Tier 3 — Peru's own level: Mexico, Brazil, Chile, Uruguay, Central America's
  // dollar economies, China, Thailand, South Africa, Turkey, Eastern EU
  PE: [3, "PEN"], MX: [3, "MXN"], BR: [3, "BRL"], CL: [3, "CLP"], UY: [3, "USD"],
  CR: [3, "USD"], PA: [3, "USD"], DO: [3, "USD"], PR: [3, "USD"], CN: [3, "CNY"],
  TH: [3, "THB"], MY: [3, "USD"], ZA: [3, "ZAR"], TR: [3, "TRY"], RO: [3, "EUR"],
  BG: [3, "EUR"], KZ: [3, "USD"], JO: [3, "USD"], LB: [3, "USD"],
  // Tier 4 — Argentina, Colombia, the Andes and Central America, India,
  // Vietnam, the Philippines, Indonesia, North and Sub-Saharan Africa, Ukraine
  AR: [4, "ARS"], CO: [4, "COP"], BO: [4, "USD"], PY: [4, "USD"], EC: [4, "USD"],
  VE: [4, "USD"], GT: [4, "USD"], HN: [4, "USD"], NI: [4, "USD"], SV: [4, "USD"],
  CU: [4, "USD"], IN: [4, "INR"], VN: [4, "VND"], PH: [4, "USD"], ID: [4, "USD"],
  PK: [4, "USD"], BD: [4, "USD"], EG: [4, "USD"], MA: [4, "USD"], DZ: [4, "USD"],
  TN: [4, "USD"], NG: [4, "USD"], KE: [4, "USD"], GH: [4, "USD"], SN: [4, "USD"],
  CI: [4, "USD"], CM: [4, "USD"], AO: [4, "USD"], MZ: [4, "USD"], UA: [4, "UAH"],
};

/** Where Paddle cannot sell (sanctions). */
export const PADDLE_EXCLUDED = new Set(["RU", "BY", "IR", "KP", "SY", "CU"]);

/** A country not in the table: tier 2, in dollars. */
const DEFAULT_TIER: Tier = 2;

export interface Region {
  /** ISO 3166-1 alpha-2, upper case, or null when unknown. */
  country: string | null;
  tier: Tier;
  provider: Provider;
  /** The Paddle price for this country. Null for Mercado Pago countries. */
  price: RegionalPrice | null;
}

export function normaliseCountry(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase();
  // Cloudflare sends XX for unknown and T1 for Tor.
  return code && /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/**
 * The tier, provider and price for a country.
 *
 * `paddleReady` is whether Paddle is configured on this deployment. Without
 * it every country is sold through Mercado Pago in soles, which is exactly
 * how the product sold before this table existed.
 */
export function regionFor(rawCountry: string | null | undefined, paddleReady: boolean): Region {
  const country = normaliseCountry(rawCountry);
  const [tier, currency] = (country && COUNTRIES[country]) || [DEFAULT_TIER, "USD"];
  const paddle = paddleReady && country !== "PE" && !(country && PADDLE_EXCLUDED.has(country));
  if (!paddle) return { country, tier, provider: "mercadopago", price: null };
  const prices = TIER_PRICES[tier];
  return { country, tier, provider: "paddle", price: prices[currency] ?? prices.USD! };
}
