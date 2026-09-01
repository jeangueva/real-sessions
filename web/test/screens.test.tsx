import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderScreen, stubApi } from "./support/render";
import { Billing } from "@/platform/Billing";
import { Review } from "@/platform/Review";
import { Pricing } from "@/components/Pricing";

/**
 * The screens whose job is to tell the truth about state.
 *
 * These are chosen for where a silent render bug is expensive: a paywall that
 * shows the wrong plan, a checkout offered when payments are off, a review
 * queue that renders a contribution as markup. The rest of the UI is layout,
 * where a regression is visible the moment anyone opens it.
 */

describe("Billing", () => {
  it("offers early access rather than a button that cannot work", async () => {
    stubApi({
      "/api/billing": { configured: false, plan: null, subscription: null },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
    });
    renderScreen(<Billing />);

    await screen.findByText(/payments are not switched on/i);
    expect(screen.getByRole("link", { name: /six months free/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it("shows the price it will actually charge", async () => {
    stubApi({
      "/api/billing": {
        configured: true,
        plan: { amount: 9000, currency: "ARS" },
        subscription: null,
      },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
    });
    renderScreen(<Billing />);

    // The amount and currency come from the server, because Mercado Pago
    // charges in the seller's currency and the client must not guess.
    await screen.findByRole("button", { name: /9000 ARS/i });
  });

  it("says a cancelled subscription still has time left on it", async () => {
    stubApi({
      "/api/billing": {
        configured: true,
        plan: { amount: 9, currency: "BRL" },
        subscription: {
          externalId: "mp-1",
          status: "cancelled",
          periodEnd: "2027-03-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      },
      "/api/plan": { plan: "premium", capabilities: {}, reviewer: false },
    });
    renderScreen(<Billing />);

    // They paid for the period; cutting them off early would be theft and
    // saying nothing would look like a bug.
    await screen.findByText(/you keep the paid plan until/i);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("names a failing payment instead of showing the plan as fine", async () => {
    stubApi({
      "/api/billing": {
        configured: true,
        plan: { amount: 9, currency: "BRL" },
        subscription: {
          externalId: "mp-1",
          status: "paused",
          periodEnd: null,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
    });
    renderScreen(<Billing />);

    await screen.findByText(/payment did not go through/i);
  });
});

describe("Review", () => {
  const entry = {
    id: 1,
    companyId: "stripe",
    stage: "Behavioral",
    role: null,
    question: "Walk me through a tradeoff you defended with a number.",
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  it("shows the queue with the company named", async () => {
    stubApi({
      "/api/review": {
        queue: [entry],
        depth: 1,
        companies: [{ id: "stripe", name: "Stripe" }],
      },
    });
    renderScreen(<Review />);

    await screen.findByText(entry.question);
    expect(screen.getByText(/Stripe/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
  });

  it("renders a contributed question as text, never as markup", async () => {
    // The one string on any screen written by a stranger. React escapes it,
    // and this is the test that says so on purpose rather than by accident.
    const hostile = '<img src=x onerror="alert(1)"> and </script>';
    stubApi({
      "/api/review": {
        queue: [{ ...entry, question: hostile }],
        depth: 1,
        companies: [{ id: "stripe", name: "Stripe" }],
      },
    });
    const { container } = renderScreen(<Review />);

    await screen.findByText(hostile);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });

  it("reads as empty rather than crashing on an unexpected body", async () => {
    // A 200 with the wrong shape — a proxy answering with its own body, or a
    // client and server briefly out of step across a deploy. This used to
    // leave `queue` undefined and throw on `.length`, so an oddity that should
    // have been recoverable became a blank screen.
    stubApi({ "/api/review": { error: "no" } });
    renderScreen(<Review />);

    await screen.findByText(/the queue is empty/i);
  });

  it("says the queue is empty when it is", async () => {
    stubApi({ "/api/review": { queue: [], depth: 0, companies: [] } });
    renderScreen(<Review />);

    await screen.findByText(/the queue is empty/i);
    expect(screen.getByText(/nothing waiting/i)).toBeInTheDocument();
  });
});

describe("Pricing", () => {
  it("does not sell as paid what the free plan actually includes", () => {
    // The copy and the entitlements drifted apart once already: the page
    // advertised measured metrics and badges as premium while the server gave
    // both to everyone.
    renderScreen(<Pricing />);

    const free = screen.getByText("Free").closest("div")?.parentElement;
    expect(free?.textContent).toContain("XP, levels and badges");

    const premium = screen.getByText(/9/).closest("div")?.parentElement;
    expect(premium?.textContent).not.toContain("badges and league");
  });
});
