import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { stubApi } from "./support/render";
import { SessionSetup } from "../src/platform/SessionSetup";

/**
 * Arriving at the setup screen from a tracked application.
 *
 * The property that matters is that the posting is not asked for twice. Two
 * places to paste one advertisement is how the two copies end up different,
 * and the second rehearsal for a job then uses different material than the
 * first — which makes the two scores incomparable, and comparing them is the
 * entire reason applications exist.
 */
const ARRIVED = {
  applicationId: "a1",
  company: "Nubank",
  role: "Growth PM",
};

function serve(state: unknown) {
  // The shared stub, because it answers with a real Response — a hand-rolled
  // object without headers throws inside the client before the screen renders,
  // which looks exactly like a broken component.
  stubApi({
    "/api/plan": {
      plan: "premium",
      capabilities: { targetCompany: true, trackApplications: true, choosePersona: true },
      reviewer: false,
    },
    "/api/catalogue": {
      // Every array the screen reads. `sectors` in particular is read with a
      // bare `.find`, so omitting it throws during render rather than
      // degrading — which is worth knowing about the screen, not just about
      // this stub.
      sectors: [],
      companies: [],
      personas: [],
      genericCompany: "a company",
      roles: [{ id: "growth-pm", label: "Growth PM", focus: "activation" }],
      stages: [{ id: "behavioral", label: "Behavioral" }],
      stagesByRole: [
        { roleId: "growth-pm", stages: [{ id: "behavioral", label: "Behavioral" }] },
      ],
      maxCombinedStages: 3,
      languages: [{ id: "en", label: "English", bcp47: "en-US" }],
      levels: [{ id: "b2", label: "B2" }],
    },
    "/api/history": { sessions: [], withheld: 0, levelUp: null },
    "/api/preferences": { preferences: {} },
    "/api/auth/me": { kind: "user", email: "someone@example.com", emailVerified: true },
  });
  render(
    <MemoryRouter initialEntries={[{ pathname: "/app", state }]}>
      <SessionSetup />
    </MemoryRouter>,
  );
}

describe("starting an interview from an application", () => {
  it("says where the posting is coming from instead of asking again", async () => {
    serve(ARRIVED);
    expect(await screen.findByText(/application to Nubank/i)).toBeTruthy();
    // The textarea is gone: the posting lives on the application now.
    expect(screen.queryByText(/Paste the job posting/i)).toBeNull();
  });

  it("asks for a posting when nobody arrived from an application", async () => {
    serve(null);
    // The paid plan still gets the textarea on its own — this is the path
    // somebody takes without tracking the job at all.
    expect(await screen.findByText(/Paste the job posting/i)).toBeTruthy();
    expect(screen.queryByText(/application to/i)).toBeNull();
  });

  /**
   * Not covered here: letting go of the application when the company is
   * changed away.
   *
   * The behaviour exists — the session payload only carries `applicationId`
   * while the company and role still match, so picking a different employer
   * detaches it rather than filing the rehearsal against a job it no longer
   * names. Driving it from a test means opening a collapsed filter row and
   * clicking through a segmented control, which tests the filter UI more than
   * it tests this, so it is verified by reading rather than by assertion.
   */
});
