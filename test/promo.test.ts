import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import process from "node:process";
import { migrate } from "../src/db/index.js";
import {
  createEntitlementStore,
  normalisePromoCode,
  promoCodesFromEnv,
} from "../src/entitlements.js";

/**
 * Promotion codes.
 *
 * The cap is the whole feature: "the first hundred people" is a promise with
 * a number in it, and a promise with a number in it is a race. Everything
 * else here is bookkeeping.
 */
const EARLY = { code: "EARLY100", grantDays: 30, cap: 100, expiresAt: null };

describe("reading codes from the environment", () => {
  it("takes code, days and seats", () => {
    expect(promoCodesFromEnv("EARLY100:30:100")).toEqual([
      { code: "EARLY100", grantDays: 30, cap: 100, expiresAt: null },
    ]);
  });

  it("upper-cases, so the table and the typing agree", () => {
    expect(promoCodesFromEnv("early100:30:100")[0]?.code).toBe("EARLY100");
    expect(normalisePromoCode("  early100 ")).toBe("EARLY100");
  });

  it("takes an end date when one is given", () => {
    const [promo] = promoCodesFromEnv("LAUNCH:14:50:2026-12-31");
    expect(promo?.expiresAt?.getUTCFullYear()).toBe(2026);
  });

  it("skips a malformed entry instead of refusing to boot", () => {
    // A typo in a promotion is not worth taking the product down for.
    expect(promoCodesFromEnv("GOOD:30:100,BROKEN:nope:100,:1:1")).toHaveLength(1);
  });
});

describe("redeeming", () => {
  it("grants the paid plan, and says until when", async () => {
    const plans = createEntitlementStore(null);
    await plans.definePromo(EARLY);
    const result = await plans.redeemPromo("EARLY100", "owner-1");
    expect(result.ok).toBe(true);
    expect(await plans.planFor("owner-1")).toBe("premium");
    if (result.ok) {
      const days = (result.until.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29);
      expect(days).toBeLessThan(31);
    }
  });

  it("refuses the same person twice", async () => {
    const plans = createEntitlementStore(null);
    await plans.definePromo(EARLY);
    await plans.redeemPromo("EARLY100", "owner-1");
    expect(await plans.redeemPromo("EARLY100", "owner-1")).toEqual({
      ok: false,
      reason: "taken",
    });
  });

  it("says a code it has never heard of is unknown", async () => {
    const plans = createEntitlementStore(null);
    expect(await plans.redeemPromo("NOPE", "owner-1")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("stops at the cap", async () => {
    const plans = createEntitlementStore(null);
    await plans.definePromo({ ...EARLY, cap: 2 });
    expect((await plans.redeemPromo("EARLY100", "a")).ok).toBe(true);
    expect((await plans.redeemPromo("EARLY100", "b")).ok).toBe(true);
    // The third person is told it is gone, not that they typed it wrong.
    expect(await plans.redeemPromo("EARLY100", "c")).toEqual({
      ok: false,
      reason: "full",
    });
  });

  it("gives out no more seats than the cap, however many arrive at once", async () => {
    /**
     * The hundredth seat, pressed by everybody simultaneously.
     *
     * This is why the Postgres path claims with a single conditional UPDATE
     * rather than reading the count and writing it back: that shape hands one
     * seat to three people, and a promotion for a hundred quietly serves a
     * hundred and four.
     */
    const plans = createEntitlementStore(null);
    await plans.definePromo({ ...EARLY, cap: 10 });
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) => plans.redeemPromo("EARLY100", `owner-${index}`)),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(10);
  });

  it("refuses a code whose date has passed", async () => {
    const plans = createEntitlementStore(null);
    await plans.definePromo({ ...EARLY, expiresAt: new Date(Date.now() - 1000) });
    expect(await plans.redeemPromo("EARLY100", "owner-1")).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("does not return seats when a code is redefined", async () => {
    // A deploy in the middle of a promotion must not hand out the seats
    // a hundred people are already holding.
    const plans = createEntitlementStore(null);
    await plans.definePromo({ ...EARLY, cap: 1 });
    await plans.redeemPromo("EARLY100", "owner-1");
    await plans.definePromo({ ...EARLY, cap: 1 });
    expect(await plans.redeemPromo("EARLY100", "owner-2")).toEqual({
      ok: false,
      reason: "full",
    });
  });
});


/**
 * The same cap, against a database that can actually race.
 *
 * The memory check above cannot fail: JavaScript is single-threaded, so forty
 * calls to an in-process map are forty calls in a row. The claim this feature
 * rests on — that the hundredth seat goes to exactly one person — only means
 * anything against Postgres, so it is tested there or not at all.
 *
 * Skipped without TEST_DATABASE_URL so the suite still runs on a machine with
 * no database, and the skip is visible rather than silent.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const pools: pg.Pool[] = [];

afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
});

describe.skipIf(!DATABASE_URL)("the cap, under a real race", () => {
  it("gives out exactly the seats it has", { timeout: 30_000 }, async () => {
    const pool = new pg.Pool({ connectionString: DATABASE_URL });
    pools.push(pool);
    await migrate(pool);
    const plans = createEntitlementStore(pool);

    const code = `RACE${Date.now()}`;
    await plans.definePromo({ code, grantDays: 30, cap: 10, expiresAt: null });

    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) => plans.redeemPromo(code, `${code}-owner-${index}`)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(10);

    // And the four places that count it all agree, which is the part a
    // read-then-write would get wrong in a way nobody notices until the bill.
    const counter = await pool.query("SELECT redeemed FROM promo_codes WHERE code = $1", [code]);
    const seats = await pool.query(
      "SELECT count(*)::int AS n FROM promo_redemptions WHERE code = $1",
      [code],
    );
    const granted = await pool.query(
      "SELECT count(*)::int AS n FROM entitlements WHERE source = $1",
      [`promo:${code}`],
    );
    expect(counter.rows[0]?.redeemed).toBe(10);
    expect(seats.rows[0]?.n).toBe(10);
    expect(granted.rows[0]?.n).toBe(10);
  });
});
