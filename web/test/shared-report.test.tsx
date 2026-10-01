import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SharedReport } from "../src/platform/SharedReport";

/**
 * The one screen in this app that renders for somebody with no account.
 *
 * Which is the whole thing worth testing: it must not reach for a session, a
 * plan, or an identity. Every one of those calls would 401 for the reader this
 * page exists for, and the page has to be whole without them.
 */
const REPORT = {
  company: "Nubank",
  role: "Growth PM",
  stage: "Behavioral",
  completedAt: "2026-09-20T15:00:00.000Z",
  score: 78,
  evaluation: {
    overall_score_percentage: 78,
    strengths: ["Owned a number and defended it."],
    areas_for_improvement: ["The second answer never reached a result."],
    vocabulary_feedback: {
      score_out_of_10: 7,
      good_usage: ["churn", "onboarding"],
      missed_opportunities_or_errors: ["\"I was responsible of\" → \"responsible for\""],
    },
    structure_feedback: {
      score_out_of_10: 6,
      feedback_text: "Situation and action were clear; the result was implied.",
    },
    actionable_next_steps: ["Close every answer with the number it moved."],
  },
  metrics: null,
};

/** Paths the page asked for, in order. */
let asked: string[] = [];

function serve(response: { ok: boolean; body?: unknown }) {
  asked = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      asked.push(String(input));
      return {
        ok: response.ok,
        status: response.ok ? 200 : 404,
        json: async () => response.body ?? {},
      };
    }),
  );
  render(
    <MemoryRouter initialEntries={["/r/tok3n"]}>
      <Routes>
        <Route path="/r/:token" element={<SharedReport />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("a shared report", () => {
  it("shows the report to a reader with no identity", async () => {
    serve({ ok: true, body: { report: REPORT } });
    expect(await screen.findByText("78")).toBeTruthy();
    expect(screen.getByText(/Owned a number/)).toBeTruthy();
    expect(screen.getByText(/responsible for/)).toBeTruthy();
  });

  it("asks only for the shared endpoint", async () => {
    serve({ ok: true, body: { report: REPORT } });
    await screen.findByText("78");
    // A call to /api/plan, /api/auth/me or /api/history here would 401 for
    // the person this page is for, and the page would render half-empty.
    expect(asked).toEqual(["/api/shared/tok3n"]);
  });

  it("says nothing about why a link does not resolve", async () => {
    serve({ ok: false });
    // Revoked and fabricated look identical from here, which is what makes
    // revoking worth anything.
    await waitFor(() => expect(screen.getByRole("heading")).toBeTruthy());
    expect(screen.getByRole("heading").textContent).toMatch(/not available|no está disponible/i);
  });
});
