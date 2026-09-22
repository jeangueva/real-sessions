import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderScreen, stubApi } from "./support/render";
import { Billing } from "@/platform/Billing";
import { Review } from "@/platform/Review";
import { ConfirmEmail } from "@/platform/ConfirmEmail";
import { EarlyAccess } from "@/components/EarlyAccess";
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
  it("says payments are off rather than showing a button that cannot work", async () => {
    stubApi({
      "/api/billing": { configured: false, plan: null, subscription: null },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
    });
    renderScreen(<Billing />);

    await screen.findByText(/payments are not switched on/i);
    expect(screen.queryByRole("button", { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it("offers an account to a guest instead of a checkout that would be refused", async () => {
    // Mercado Pago needs a payer email; a guest has none and the server says
    // so. Finding that out after clicking would be the worse way to learn it.
    stubApi({
      "/api/billing": {
        configured: true,
        plan: { amount: 9000, currency: "ARS" },
        subscription: null,
        publicKey: "TEST-key",
      },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
      "/api/auth/me": { kind: "guest", email: null },
    });
    renderScreen(<Billing />);

    await screen.findByText(/subscribing needs an account/i);
    expect(screen.queryByRole("button", { name: /9000 ARS/i })).not.toBeInTheDocument();
  });

  it("shows the price it will actually charge", async () => {
    stubApi({
      "/api/billing": {
        configured: true,
        plan: { amount: 9000, currency: "ARS" },
        subscription: null,
      },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
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
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
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
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
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
  it("sends someone who wants the paid plan to where they can pay", () => {
    // The landing page no longer carries the early-access form, so this is the
    // only way off it and onto the paid plan.
    stubApi({ "/api/pricing": { plan: null } });
    renderScreen(<Pricing />);

    const subscribe = screen.getByRole("link", { name: /subscribe/i });
    expect(subscribe).toHaveAttribute("href", "/app/settings");
  });

  it("shows the price the checkout will actually charge", async () => {
    // "$9" was written into the page while Mercado Pago billed 29.90 soles.
    // The number a reader decides on has to be the one they are asked for.
    stubApi({ "/api/pricing": { plan: { amount: 29.9, currency: "PEN" } } });
    renderScreen(<Pricing />);

    await screen.findByText(/29[.,]90/);
    expect(screen.queryByText(/\$9(?!\d)/)).not.toBeInTheDocument();
  });

  it("shows no price at all rather than a wrong one when payments are off", async () => {
    stubApi({ "/api/pricing": { plan: null } });
    renderScreen(<Pricing />);

    await screen.findByRole("link", { name: /subscribe/i });
    expect(screen.queryByText(/\$9(?!\d)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/29[.,]90/)).not.toBeInTheDocument();
  });

  it("does not sell as paid what the free plan actually includes", () => {
    stubApi({ "/api/pricing": { plan: null } });
    // The copy and the entitlements drifted apart once already: the page
    // advertised measured metrics and badges as premium while the server gave
    // both to everyone.
    renderScreen(<Pricing />);

    const free = screen.getByText("Free").closest("div")?.parentElement;
    expect(free?.textContent).toContain("XP, levels and badges");

    const premium = screen.getByText(/Premium|Pagado|paid/i).closest("div")?.parentElement;
    expect(premium?.textContent).not.toContain("badges and league");
  });
});

describe("ConfirmEmail", () => {
  it("says the free months are unlocked when this confirmation claimed them", async () => {
    // The grant is claimed in the same request that proves the address, which
    // makes this the first moment it can be said without revealing the list.
    stubApi({ "/api/auth/verify": { ok: true, earlyAccess: true } });
    renderScreen(<ConfirmEmail />, "/verify?token=abc");

    await screen.findByText(/your email is confirmed/i);
    expect(
      screen.getByText(/six months of the paid plan are unlocked/i),
    ).toBeInTheDocument();
  });

  it("says nothing about early access when there was no grant", async () => {
    stubApi({ "/api/auth/verify": { ok: true, earlyAccess: false } });
    renderScreen(<ConfirmEmail />, "/verify?token=abc");

    await screen.findByText(/your email is confirmed/i);
    expect(screen.queryByText(/unlocked/i)).not.toBeInTheDocument();
  });
});

describe("EarlyAccess", () => {
  const SECOND = 1000;
  const inOneDayTwoHoursThreeMinutes = () =>
    new Date(Date.now() + (26 * 3600 + 3 * 60 + 30) * SECOND).toISOString();

  it("counts down to the real closing moment and keeps the form open", async () => {
    stubApi({
      "/api/early-access": { open: true, closesAt: inOneDayTwoHoursThreeMinutes(), months: 6 },
    });
    renderScreen(<EarlyAccess />);

    const timer = await screen.findByRole("timer");
    expect(timer.getAttribute("aria-label")).toMatch(/closes in 1 days, 2 hours, 3 min/i);
    expect(screen.getByRole("button", { name: /claim six months/i })).toBeInTheDocument();
  });

  it("replaces the form once the offer has closed", async () => {
    stubApi({ "/api/early-access": { open: false, closesAt: "2026-01-01T00:00:00.000Z", months: 6 } });
    renderScreen(<EarlyAccess />);

    await screen.findByText(/early access has closed/i);
    expect(screen.queryByRole("button", { name: /claim six months/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("shows no countdown when there is no date to count to", async () => {
    // An invented deadline would be the one thing worse than none.
    stubApi({ "/api/early-access": { open: true, closesAt: null, months: 6 } });
    renderScreen(<EarlyAccess />);

    await screen.findByRole("button", { name: /claim six months/i });
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
