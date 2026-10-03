import { describe, expect, it, vi } from "vitest";
import axe from "axe-core";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { stubApi } from "./support/render";
import { SignIn } from "../src/platform/SignIn";
import { Pricing } from "../src/components/Pricing";
import { Applications } from "../src/platform/Applications";
import { Billing } from "../src/platform/Billing";

/**
 * WCAG, checked by a machine on the real markup.
 *
 * `contrast.test.ts` already does colour by arithmetic on the tokens, which
 * catches the palette but nothing about structure: a button with no accessible
 * name, a field with no label, a heading level skipped, a landmark missing.
 * Those are the failures that make a screen unusable with a screen reader and
 * invisible to anybody testing by looking.
 *
 * Run against rendered screens rather than a checklist, and failing the build
 * rather than producing a report, for the reason every other rule in this
 * suite does: a report is read once and a test is read every time.
 *
 * AA is the bar. AAA is not a target for a whole interface — it demands 7:1
 * on body text, which no cream-on-dark palette reaches without becoming pure
 * white on pure black — so the honest claim is AA, enforced, rather than AAA,
 * aspired to.
 *
 * What this actually checks, measured rather than assumed: aria-hidden-focus,
 * autocomplete-valid, button-name, duplicate-id-aria,
 * form-field-multiple-labels, label, link-name and nested-interactive. Colour
 * contrast comes back *incomplete* here, because happy-dom has no layout and
 * therefore no computed colours — that half is covered by `contrast.test.ts`,
 * which does the arithmetic on the tokens themselves and is stricter than a
 * rendered check would be.
 *
 * So: structure here, colour there, and neither claims the other's ground.
 */
const RULES = {
  runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
};

async function violations(markup: HTMLElement) {
  const results = await axe.run(markup, RULES);
  /**
   * Incomplete results are reported, not swallowed — except contrast.
   *
   * "Incomplete" means axe could not decide, which in a jsdom-shaped
   * environment is usually "I cannot see the pixels". Ignoring the whole
   * category would quietly hide real doubts; ignoring only the one rule that
   * is covered better elsewhere does not.
   */
  const unsure = results.incomplete.filter((entry) => entry.id !== "color-contrast");
  return [...results.violations, ...unsure].map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    where: violation.nodes.map((node) => node.html.slice(0, 90)),
  }));
}

describe("the sign-in screen", () => {
  it("has no WCAG A or AA violations", async () => {
    stubApi({
      "/api/auth/config": { google: null },
      "/api/auth/me": { kind: "user", email: "", emailVerified: false },
    });
    const { container } = render(
      <MemoryRouter initialEntries={["/signin"]}>
        <SignIn />
      </MemoryRouter>,
    );
    expect(await violations(container)).toEqual([]);
  });
});

describe("the pricing section", () => {
  it("has no WCAG A or AA violations", async () => {
    stubApi({
      "/api/pricing": {
        plan: { amount: 29.9, currency: "PEN" },
        offer: {
          monthly: { amount: 29.9, currency: "PEN", cycle: "monthly" },
          yearly: { amount: 287, currency: "PEN", cycle: "yearly" },
          savingPercent: 20,
        },
      },
    });
    const { container } = render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>,
    );
    expect(await violations(container)).toEqual([]);
  });
});

describe("the applications screen", () => {
  it("has no WCAG A or AA violations", async () => {
    stubApi({
      "/api/plan": {
        plan: "premium",
        capabilities: { trackApplications: true },
        reviewer: false,
      },
      "/api/applications": {
        applications: [
          {
            id: "a1",
            company: "Nubank",
            role: "Growth PM",
            posting: null,
            status: "applied",
            createdAt: "2026-09-20T10:00:00.000Z",
            updatedAt: "2026-09-20T10:00:00.000Z",
            sessions: 3,
            bestScore: 71,
          },
        ],
      },
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
    });
    const { container, findByText } = render(
      <MemoryRouter initialEntries={["/app/applications"]}>
        <Applications />
      </MemoryRouter>,
    );
    await findByText(/Growth PM/);
    expect(await violations(container)).toEqual([]);
  });
});

describe("the billing panel", () => {
  it("has no WCAG A or AA violations", async () => {
    stubApi({
      "/api/billing/reconcile": { plan: "free" },
      "/api/billing": {
        configured: true,
        mode: "live",
        publicKey: null,
        plan: { amount: 29.9, currency: "PEN" },
        subscription: null,
      },
      "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
      "/api/auth/me": { kind: "user", email: "a@b.com", emailVerified: true },
    });
    const { container, findByText } = render(
      <MemoryRouter initialEntries={["/app/settings"]}>
        <Billing />
      </MemoryRouter>,
    );
    // The promotion field is part of what is being checked.
    await findByText(/Have a promotion code/i);
    expect(await violations(container)).toEqual([]);
  });
});
