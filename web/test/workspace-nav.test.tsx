import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { WorkspaceNav } from "@/platform/WorkspaceNav";
import { SPACE_KEY } from "@/lib/spaces";
import { renderScreen } from "./support/render";

afterEach(() => localStorage.removeItem(SPACE_KEY));

describe("workspace navigation", () => {
  it("shows both Education and Professional workspaces side by side", () => {
    renderScreen(<WorkspaceNav space="defense" />, "/app/education");
    const edu = screen.getByRole("link", { name: "Education" });
    const pro = screen.getByRole("link", { name: "Professional" });
    expect(edu).toHaveAttribute("href", "/app/education");
    expect(edu).toHaveAttribute("aria-current", "page");
    expect(pro).toHaveAttribute("href", "/app/professional");
    expect(pro).not.toHaveAttribute("aria-current");
  });

  it("changes the settings workspace context without leaving settings", () => {
    renderScreen(<WorkspaceNav space="defense" />, "/app/settings");
    const career = screen.getByRole("link", { name: "Professional" });
    expect(career).toHaveAttribute("href", "/app/settings");
    fireEvent.click(career);
    expect(localStorage.getItem(SPACE_KEY)).toBe("career");
  });

  it("identifies the active Professional workspace and links back to Education", () => {
    renderScreen(<WorkspaceNav space="career" />, "/app/professional");
    expect(screen.getByRole("link", { name: "Professional" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Education" })).toHaveAttribute("href", "/app/education");
  });
});
