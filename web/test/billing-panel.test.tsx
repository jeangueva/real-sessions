import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Billing } from "../src/platform/Billing";

/**
 * The plan card in the state that was handled worst.
 *
 * A cancelled subscription keeps the paid plan until the period already paid
 * for runs out. That left `plan === "premium"`, which hid every offer to
 * subscribe behind `!active`, while the cancel button had correctly gone —
 * so the card showed a status and no action at all, at exactly the moment
 * someone who cancelled by mistake is easiest to win back.
 */
const PERIOD_END = "2026-10-27T00:00:00.000Z";

/** Paths the panel asked for, in order. */
let asked: string[] = [];

function serve(subscriptionStatus: string | null, plan: "free" | "premium") {
  asked = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      asked.push(url);
      const body = url.includes("/api/billing/reconcile")
        ? { plan }
        : url.includes("/api/billing")
        ? {
            configured: true,
            mode: "live",
            publicKey: "APP_USR-key",
            plan: { amount: 29.9, currency: "PEN" },
            subscription: subscriptionStatus
              ? { status: subscriptionStatus, periodEnd: PERIOD_END }
              : null,
          }
        : url.includes("/api/plan")
          ? { plan, capabilities: {}, reviewer: false }
          : { kind: "user", email: "someone@example.com" };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
  render(
    <MemoryRouter>
      <Billing />
    </MemoryRouter>,
  );
}

describe("the plan card, once cancelled", () => {
  it("offers a way back while the paid period is still running", async () => {
    serve("cancelled", "premium");
    // The button the old conditions hid: `!active` was false, so nothing was
    // offered until the plan actually lapsed.
    expect(await screen.findByRole("button", { name: /Resume the paid plan/i })).
      toBeInTheDocument();
  });

  it("says it is cancelled once, not twice", async () => {
    serve("cancelled", "premium");
    await screen.findByRole("button", { name: /Resume the paid plan/i });
    // The status line and the closing note both carried the word and the
    // date. One of them now stands down — the one that cannot say why the
    // plan is still running.
    const text = document.body.textContent ?? "";
    expect(text.match(/Cancelled/gi) ?? []).toHaveLength(1);
  });

  it("does not offer to resume a subscription that is still live", async () => {
    serve("authorized", "premium");
    await waitFor(() => expect(screen.getByText(/Active/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Resume the paid plan/i })).toBeNull();
  });
});

/**
 * The call that has to happen, and the reason this file is where the
 * refactor is held.
 *
 * Settling used to happen inside `GET /api/billing`, so nothing could forget
 * it. Moving it to its own POST made the server honest — a read that writes
 * is a surprise to whoever opens the file next — at the cost of a client that
 * now has to remember. A client that forgets brings back the worst failure
 * this product has: a payer whose webhook was late reads "you are on the free
 * plan" with the money already gone. Nothing on the server can catch that,
 * so it is caught here.
 */
describe("the plan panel, on load", () => {
  it("asks the server to settle, and reads again once it answers", async () => {
    serve("pending", "free");
    await waitFor(() =>
      expect(asked.filter((url) => url.endsWith("/api/billing"))).toHaveLength(2),
    );
    // One read before settling, so a provider that hangs cannot leave this
    // panel blank, and one after, because settling is what turns a payment
    // into a plan.
    expect(asked.filter((url) => url.includes("/api/billing/reconcile"))).toHaveLength(1);
    const settled = asked.findIndex((url) => url.includes("/api/billing/reconcile"));
    const reads = asked.flatMap((url, at) => (url.endsWith("/api/billing") ? [at] : []));
    expect(reads[0]).toBeLessThan(settled);
    expect(reads[1]).toBeGreaterThan(settled);
  });

  it("still reads the panel when the provider cannot be reached", async () => {
    // A 502 from reconcile must leave a slightly stale panel, not an empty
    // one: Mercado Pago being down is not a reason to hide someone's plan.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/billing/reconcile")) {
          return { ok: false, status: 502, json: async () => ({ error: "nope" }) };
        }
        const body = url.includes("/api/billing")
          ? {
              configured: true, mode: "live", publicKey: "APP_USR-key",
              plan: { amount: 29.9, currency: "PEN" },
              subscription: { status: "pending", periodEnd: PERIOD_END },
            }
          : url.includes("/api/plan")
            ? { plan: "free", capabilities: {}, reviewer: false }
            : { kind: "user", email: "someone@example.com" };
        return { ok: true, status: 200, json: async () => body };
      }),
    );
    render(
      <MemoryRouter>
        <Billing />
      </MemoryRouter>,
    );
    // The offer is still there, drawn from the stored row.
    expect(await screen.findByRole("button", { name: /29.9/ })).toBeInTheDocument();
  });
});
