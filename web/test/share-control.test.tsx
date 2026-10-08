import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FeedbackReport } from "../src/platform/FeedbackReport";

/**
 * The share control on a stored report.
 *
 * Two things are worth holding down. A free account must be told what the
 * control is rather than shown nothing — an absent button teaches nobody that
 * the feature exists. And the link has to reach the clipboard on the same
 * click that creates it, because the only confirmation a copy can give is the
 * label changing, and a second click to copy is a click people do not make.
 */
const HISTORY_ID = "11111111-2222-3333-4444-555555555555";

const SESSION = {
  id: HISTORY_ID,
  company: "Nubank",
  sectorId: "fintech",
  role: "Growth PM",
  stage: "Behavioral",
  mode: "practice",
  personaId: "skeptic",
  level: "b2",
  startedAt: "2026-09-20T14:40:00.000Z",
  completedAt: "2026-09-20T15:00:00.000Z",
  score: 78,
  vocabularyScore: 7,
  structureScore: 6,
  shareToken: null,
  metrics: null,
  withheld: { metrics: false, nextSteps: false },
  turns: [],
  evaluation: {
    overall_score_percentage: 78,
    strengths: ["Owned a number."],
    areas_for_improvement: ["No result on the second answer."],
    vocabulary_feedback: {
      score_out_of_10: 7,
      good_usage: ["churn"],
      missed_opportunities_or_errors: ["responsible of → responsible for"],
    },
    structure_feedback: { score_out_of_10: 6, feedback_text: "Result was implied." },
    actionable_next_steps: ["Close with the number."],
  },
};

let written: string[] = [];
let posted: string[] = [];

function serve(shareReport: boolean) {
  written = [];
  posted = [];
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: {
      writeText: async (value: string) => {
        written.push(value);
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method && init.method !== "GET") posted.push(`${init.method} ${url}`);
      const body = url.includes("/share")
        ? { shared: { token: "tok3n", url: "https://getmockio.com/r/tok3n" } }
        : url.includes("/api/plan")
          ? { plan: shareReport ? "premium" : "free", capabilities: { shareReport }, reviewer: false }
          : url.includes("/api/history/")
            ? { session: SESSION }
            : { kind: "user", email: "someone@example.com" };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
  render(
    <MemoryRouter initialEntries={[{ pathname: "/app/feedback", state: { historyId: HISTORY_ID } }]}>
      <FeedbackReport />
    </MemoryRouter>,
  );
}

describe("sharing a report from the report screen", () => {
  it("copies the link on the same click that creates it", async () => {
    serve(true);
    // One "Share" button opens the menu; the report link is one of its items.
    fireEvent.click(await screen.findByRole("button", { name: /^share$/i }));
    const button = await screen.findByRole("menuitem", { name: /share this report/i });
    fireEvent.click(button);
    await waitFor(() => expect(written).toEqual(["https://getmockio.com/r/tok3n"]));
    expect(posted).toEqual([`POST /api/history/${HISTORY_ID}/share`]);
    // The label is the only confirmation a copy can give.
    expect(await screen.findByRole("menuitem", { name: /link copied/i })).toBeTruthy();
  });

  it("tells a free account what the control is instead of hiding it", async () => {
    serve(false);
    fireEvent.click(await screen.findByRole("button", { name: /^share$/i }));
    expect(await screen.findByText(/paid plan/i)).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: /share this report/i })).toBeNull();
  });
});
