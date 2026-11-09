import { afterEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "@/platform/AppShell";
import { SPACE_KEY } from "@/lib/spaces";
import { stubApi } from "./support/render";

afterEach(() => localStorage.removeItem(SPACE_KEY));

function renderShell(path: string) {
  stubApi({
    "/api/auth/me": { kind: "user", email: "ana@example.com", emailVerified: true },
    "/api/plan": { plan: "free", capabilities: {}, reviewer: false },
    "/api/preferences": { preferences: { candidateName: "Ana" } },
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app" element={<AppShell />}>
          <Route path="*" element={<p>screen</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("app navigation", () => {
  it("keeps Education to three sections and shows the thesis's screens as tabs inside it", async () => {
    renderShell("/app/tesis/diagnostico");
    const bar = (await screen.findAllByRole("navigation", { name: "Sections" }))[0]!;
    expect(within(bar).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "My thesis",
      "Academic scenarios",
    ]);
    expect(within(bar).getByRole("link", { name: "My thesis" })).toHaveAttribute("aria-current", "page");

    const tabs = screen.getByRole("navigation", { name: "My thesis" });
    expect(within(tabs).getAllByRole("link")).toHaveLength(6);
    expect(within(tabs).getByRole("link", { name: /Diagnosis/ })).toHaveAttribute("aria-current", "page");
  });

  it("groups the interview screens under Interviews in Professional", async () => {
    renderShell("/app/applications");
    const bar = (await screen.findAllByRole("navigation", { name: "Sections" }))[0]!;
    expect(within(bar).getByRole("link", { name: "Interviews" })).toHaveAttribute("aria-current", "page");
    const tabs = screen.getByRole("navigation", { name: "Interviews" });
    expect(within(tabs).getAllByRole("link")).toHaveLength(3);
  });

  it("shows no tabs on a screen that is not part of a group", async () => {
    renderShell("/app/training/education");
    await screen.findAllByRole("navigation", { name: "Sections" });
    expect(screen.queryByRole("navigation", { name: "My thesis" })).not.toBeInTheDocument();
  });
});
