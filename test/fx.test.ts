import { afterEach, describe, expect, it, vi } from "vitest";
import { clearRates, ratesFrom } from "../src/fx.js";

const ok = (rates: Record<string, unknown>) =>
  vi.fn(async () =>
    new Response(
      JSON.stringify({ result: "success", rates, time_last_update_utc: "Sat, 04 Oct 2026 00:02:31 +0000" }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch;

afterEach(() => clearRates());

describe("ratesFrom", () => {
  it("reads the provider's rates and drops anything that is not a positive number", async () => {
    const rates = await ratesFrom("PEN", { fetcher: ok({ PEN: 1, ARS: 440.1, BAD: "x", ZERO: 0 }) });
    expect(rates?.values).toEqual({ PEN: 1, ARS: 440.1 });
    expect(rates?.base).toBe("PEN");
  });

  it("caches, so the landing page does not wait on the provider every visit", async () => {
    const fetcher = ok({ ARS: 440 });
    await ratesFrom("PEN", { fetcher, now: 0 });
    await ratesFrom("PEN", { fetcher, now: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves yesterday's rate when a refresh fails", async () => {
    await ratesFrom("PEN", { fetcher: ok({ ARS: 440 }), now: 0 });
    const failing = vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    const rates = await ratesFrom("PEN", { fetcher: failing, now: 13 * 60 * 60 * 1000 });
    expect(rates?.values.ARS).toBe(440);
  });

  it("is null when there is nothing to serve, rather than throwing", async () => {
    const failing = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await ratesFrom("PEN", { fetcher: failing })).toBeNull();
  });
});
