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

describe("the billing and support panel", () => {
  it("shows free status and no cancel button once a historical subscription is cancelled", async () => {
    serve("cancelled", "premium");
    expect(await screen.findByText(/Everything stays free/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel subscription/i })).toBeNull();
  });

  it("offers to cancel an existing active subscription while keeping all features free", async () => {
    serve("authorized", "premium");
    expect(
      await screen.findByRole("button", { name: /Cancel subscription/i }),
    ).toBeInTheDocument();
  });
});

describe("the plan panel, on load", () => {
  it("asks the server to settle, and reads again once it answers", async () => {
    serve("pending", "free");
    await waitFor(() =>
      expect(asked.filter((url) => url.split("?")[0]!.endsWith("/api/billing"))).toHaveLength(2),
    );
    expect(asked.filter((url) => url.includes("/api/billing/reconcile"))).toHaveLength(1);
    const settled = asked.findIndex((url) => url.includes("/api/billing/reconcile"));
    const reads = asked.flatMap((url, at) => (url.split("?")[0]!.endsWith("/api/billing") ? [at] : []));
    expect(reads[0]).toBeLessThan(settled);
    expect(reads[1]).toBeGreaterThan(settled);
  });

  it("still reads the panel when the provider cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/billing/reconcile")) {
          return { ok: false, status: 502, json: async () => ({ error: "nope" }) };
        }
        const body = url.includes("/api/billing")
          ? {
              configured: false, mode: "live", publicKey: null,
              plan: null,
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
    expect(await screen.findByText(/Status: pending/i)).toBeInTheDocument();
  });
});
