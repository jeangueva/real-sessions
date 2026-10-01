import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Applications } from "../src/platform/Applications";

/**
 * The applications screen.
 *
 * Two behaviours carry it. The paywall has to be a paywall rather than an
 * error, because a free account hitting a 402 on load would otherwise read
 * "Could not load your applications" and conclude the product is broken. And
 * the status has to move in the row: a dropdown that waits for a round trip
 * before its label changes stops feeling like a dropdown and starts feeling
 * like a form.
 */
const ROW = {
  id: "a1",
  company: "Nubank",
  role: "Growth PM",
  posting: "Own activation end to end.",
  status: "applied" as const,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  sessions: 3,
  bestScore: 71,
};

let sent: string[] = [];

function serve({ allowed, rows = [ROW] }: { allowed: boolean; rows?: unknown[] }) {
  sent = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method && init.method !== "GET") sent.push(`${init.method} ${url}`);
      if (url.includes("/api/plan")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            plan: allowed ? "premium" : "free",
            capabilities: { trackApplications: allowed },
            reviewer: false,
          }),
        };
      }
      if (url.includes("/api/applications") && (!init?.method || init.method === "GET")) {
        return allowed
          ? { ok: true, status: 200, json: async () => ({ applications: rows }) }
          : {
              ok: false,
              status: 402,
              json: async () => ({ error: "Tracking applications is on the paid plan." }),
            };
      }
      return { ok: true, status: 200, json: async () => ({ application: ROW }) };
    }),
  );
  render(
    <MemoryRouter initialEntries={["/app/applications"]}>
      <Applications />
    </MemoryRouter>,
  );
}

describe("the applications screen", () => {
  it("shows the rehearsals and the best score for a job", async () => {
    serve({ allowed: true });
    expect(await screen.findByText(/Growth PM · Nubank/)).toBeTruthy();
    // The one sentence a spreadsheet could not hold.
    expect(screen.getByText(/3 practised · best 71%/)).toBeTruthy();
  });

  it("says nothing was scored rather than showing a zero", async () => {
    serve({ allowed: true, rows: [{ ...ROW, sessions: 1, bestScore: null }] });
    expect(await screen.findByText(/1 practised · best —/)).toBeTruthy();
  });

  it("moves the status in the row, without waiting for the server", async () => {
    serve({ allowed: true });
    const select = (await screen.findByLabelText(/status/i)) as HTMLSelectElement;
    expect(select.value).toBe("applied");
    fireEvent.change(select, { target: { value: "offer" } });
    // The label is already the new one; the request follows.
    expect(select.value).toBe("offer");
    await waitFor(() => expect(sent).toEqual(["PATCH /api/applications/a1"]));
  });

  it("shows a paywall rather than an error on the free plan", async () => {
    serve({ allowed: false });
    expect(await screen.findByText(/on the paid plan/i)).toBeTruthy();
    // A 402 rendered as a failure would tell a free account the product is
    // broken, which is the worst possible reading of a paywall.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("carries the application into the setup screen", async () => {
    serve({ allowed: true });
    const link = await screen.findByRole("link", { name: /practise for this/i });
    expect(link.getAttribute("href")).toBe("/app");
  });
});
