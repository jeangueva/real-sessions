import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Progress } from "../src/platform/Progress";

/**
 * The way in.
 *
 * The card itself was built two commits ago and was reachable only from the
 * sidebar. A feature whose whole purpose is distribution has to be offered
 * where the feeling is — on the screen somebody opens to look at what they
 * have done — or it is weight on a nav bar.
 */
function serve() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.includes("/api/progress")
        ? { sessions: [], axes: [], axisNames: [] }
        : url.includes("/api/profile")
          ? { xp: 120, level: 2, xpIntoLevel: 20, xpForNextLevel: 100, badges: [], catalogue: [] }
          : url.includes("/api/leaderboard")
            ? { rows: [] }
            : url.includes("/api/history")
              ? { sessions: [], withheld: 0, levelUp: null }
              : { kind: "user", email: "someone@example.com" };
      return { ok: true, status: 200, json: async () => body };
    }),
  );
  render(
    <MemoryRouter initialEntries={["/app/progress"]}>
      <Progress />
    </MemoryRouter>,
  );
}

describe("getting to the progress card", () => {
  it("offers it from the progress screen", async () => {
    serve();
    const link = await screen.findByRole("link", { name: /share your progress/i });
    expect(link.getAttribute("href")).toBe("/app/share");
  });
});
