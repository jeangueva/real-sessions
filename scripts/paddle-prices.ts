/**
 * Creates the Premium product and its two prices in Paddle, with every
 * country's price from `src/billing/regions.ts`, then checks each currency
 * against Paddle's own price preview before trusting it.
 *
 *   npm run paddle:prices -- --dry-run   print what would be created
 *   npm run paddle:prices                create in PADDLE_ENV (sandbox first)
 *
 * Needs PADDLE_ENV and PADDLE_API_KEY in .env. Prints the two price ids to put
 * in PADDLE_PRICE_MONTHLY and PADDLE_PRICE_YEARLY. Set PADDLE_PRODUCT_ID to
 * add prices to an existing product instead of creating one.
 *
 * Why the preview: a currency counted in whole units by Paddle but sent here
 * in hundredths is charged at a hundred times its price. The table cannot
 * know which currencies those are with certainty; Paddle can, so it is asked,
 * and the script stops — loudly — at the first price it does not agree with.
 */
import "../src/env.js";
import { COUNTRIES, PADDLE_EXCLUDED, TIER_PRICES } from "../src/billing/regions.js";
import type { Tier } from "../src/billing/regions.js";
import { minorUnits, overridesFor, paddleApiBase } from "../src/billing/paddle.js";
import type { PaddleEnv } from "../src/billing/paddle.js";

const dryRun = process.argv.includes("--dry-run");
const env = process.env.PADDLE_ENV?.trim() as PaddleEnv | undefined;
const apiKey = process.env.PADDLE_API_KEY?.trim();

if (dryRun) {
  for (const cycle of ["monthly", "yearly"] as const) {
    const { base, overrides } = overridesFor(cycle);
    console.log(`\n${cycle}: base ${base.amount} ${base.currency_code}`);
    for (const entry of overrides) {
      console.log(`  ${entry.unit_price.amount.padStart(9)} ${entry.unit_price.currency_code}  ${entry.country_codes.join(" ")}`);
    }
  }
  process.exit(0);
}

if ((env !== "sandbox" && env !== "production") || !apiKey) {
  console.error("Set PADDLE_ENV (sandbox | production) and PADDLE_API_KEY in .env first.");
  process.exit(1);
}

const base = paddleApiBase(env);

async function call(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`${path} → ${response.status}: ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data as Record<string, unknown>;
}

let productId = process.env.PADDLE_PRODUCT_ID?.trim();
if (!productId) {
  const product = await call("/products", {
    name: "Mockio Premium",
    tax_category: "standard",
    description: "Interview practice in English, for the role and company you are applying to.",
  });
  productId = product.id as string;
  console.log(`Created product ${productId}`);
}

const created: Record<"monthly" | "yearly", string> = { monthly: "", yearly: "" };
for (const cycle of ["monthly", "yearly"] as const) {
  const { base: unit, overrides } = overridesFor(cycle);
  const price = await call("/prices", {
    product_id: productId,
    description: cycle === "monthly" ? "Premium — monthly" : "Premium — yearly",
    name: cycle === "monthly" ? "Monthly" : "Yearly",
    billing_cycle: { interval: cycle === "monthly" ? "month" : "year", frequency: 1 },
    // Prices include tax: the figure on the page is the figure charged.
    tax_mode: "internal",
    unit_price: unit,
    unit_price_overrides: overrides,
  });
  created[cycle] = price.id as string;
  console.log(`Created ${cycle} price ${created[cycle]}`);
}

/**
 * One country per currency, previewed: the total Paddle would charge there must
 * be exactly the table's amount in that currency.
 */
const sample = new Map<string, string>();
for (const [country, [tier, currency]] of Object.entries(COUNTRIES)) {
  if (country === "PE" || PADDLE_EXCLUDED.has(country)) continue;
  const prices = TIER_PRICES[tier as Tier];
  const chosen = prices[currency] ? currency : "USD";
  if (!sample.has(chosen)) sample.set(chosen, country);
}

let failed = false;
for (const [currency, country] of sample) {
  const [tier] = COUNTRIES[country]!;
  const expected = TIER_PRICES[tier][currency]!;
  const preview = await call("/pricing-preview", {
    items: [{ price_id: created.monthly, quantity: 1 }],
    address: { country_code: country },
  });
  const details = preview.details as { line_items: { totals: { total: string } }[] };
  const total = details.line_items[0]?.totals.total;
  const want = minorUnits(expected.monthly, currency);
  const shown = (preview.currency_code as string | undefined) ?? "?";
  const ok = total === want && shown === currency;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${country} ${currency}: Paddle ${total} ${shown}, table ${want} ${currency}`);
}

if (failed) {
  console.error(
    "\nAt least one currency does not match. Do not use these prices: archive them in the Paddle " +
      "dashboard, fix ZERO_DECIMAL in src/billing/paddle.ts, and run this again.",
  );
  process.exit(1);
}

console.log(`\nAll currencies match. Put these in the environment:\n`);
console.log(`PADDLE_PRICE_MONTHLY=${created.monthly}`);
console.log(`PADDLE_PRICE_YEARLY=${created.yearly}`);
