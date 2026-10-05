/**
 * Exchange rates, for showing a price in the reader's own currency.
 *
 * The plan is charged in the currency of the seller's Mercado Pago account —
 * soles — and that cannot change per country. What can change is how it is
 * read: someone in Buenos Aires does not know that PEN is a sol, or what 287
 * of them is in pesos, and the first thing a tester asked for was exactly that.
 * So the page shows an approximate local figure beside the real one, and says
 * plainly which one the card is charged.
 *
 * Fetched by the server rather than the browser so the reader's address never
 * reaches a third party, and cached for half a day: an indicative conversion
 * does not need to be fresher than that, and the landing page must not wait on
 * someone else's API. Any failure is `null` — the page then shows the price as
 * it is charged, which is what it showed before this existed.
 */

export interface Rates {
  /** The currency the rates convert from (the one we charge in). */
  base: string;
  /** Units of each currency per one unit of `base`. */
  values: Record<string, number>;
  /** When the provider last updated them, ISO. */
  asOf: string;
}

const TTL_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 2_500;

const cache = new Map<string, { rates: Rates; at: number }>();
const pending = new Map<string, Promise<Rates | null>>();

type Fetch = typeof fetch;

async function load(base: string, fetcher: Fetch): Promise<Rates | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // open.er-api.com: free, no key, daily rates, covers every currency the
    // product's audience uses.
    const response = await fetcher(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, unknown>;
      time_last_update_utc?: string;
    };
    if (body.result !== "success" || !body.rates) return null;
    const values: Record<string, number> = {};
    for (const [code, value] of Object.entries(body.rates)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) values[code] = value;
    }
    const parsed = body.time_last_update_utc ? new Date(body.time_last_update_utc) : new Date();
    return {
      base,
      values,
      asOf: Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rates from `base`, cached. A stale cache is served rather than nothing when
 * a refresh fails: yesterday's rate is a fine approximation, and no rate at all
 * makes the page fall back to soles only.
 */
export async function ratesFrom(
  base: string,
  options: { fetcher?: Fetch; now?: number } = {},
): Promise<Rates | null> {
  const now = options.now ?? Date.now();
  const key = base.toUpperCase();
  const hit = cache.get(key);
  if (hit && now - hit.at < TTL_MS) return hit.rates;

  let inFlight = pending.get(key);
  if (!inFlight) {
    inFlight = load(key, options.fetcher ?? fetch).finally(() => pending.delete(key));
    pending.set(key, inFlight);
  }
  const fresh = await inFlight;
  if (fresh) {
    cache.set(key, { rates: fresh, at: now });
    return fresh;
  }
  return hit?.rates ?? null;
}

/** For tests: forget every cached rate. */
export function clearRates(): void {
  cache.clear();
  pending.clear();
}
