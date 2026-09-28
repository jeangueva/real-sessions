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

function serve(subscriptionStatus: string | null, plan: "free" | "premium") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/billing")
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
