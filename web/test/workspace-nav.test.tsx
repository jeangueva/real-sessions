import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { WorkspaceNav } from "@/platform/WorkspaceNav";
import { SPACE_KEY } from "@/lib/spaces";
import { renderScreen } from "./support/render";

afterEach(() => localStorage.removeItem(SPACE_KEY));

describe("workspace navigation", () => {
  it("keeps career tools behind the workspace disclosure", () => {
    renderScreen(<WorkspaceNav space="defense" />, "/app");
    expect(screen.getByRole("link", { name: "Thesis defence" })).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("link", { name: "Professional" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Workspaces" }));
    expect(screen.getByRole("link", { name: "Professional" })).toHaveAttribute("href", "/app/practice");
  });

  it("changes the settings context without leaving settings", () => {
    renderScreen(<WorkspaceNav space="defense" />, "/app/settings");
    fireEvent.click(screen.getByRole("button", { name: "Workspaces" }));
    const career = screen.getByRole("link", { name: "Professional" });
    expect(career).toHaveAttribute("href", "/app/settings");
    fireEvent.click(career);
    expect(localStorage.getItem(SPACE_KEY)).toBe("career");
    expect(screen.getByRole("button", { name: "Workspaces" })).toHaveAttribute("aria-expanded", "false");
  });

  it("identifies the active career space and lets users return to their thesis", () => {
    renderScreen(<WorkspaceNav space="career" />, "/app/practice");
    expect(screen.getByRole("link", { name: "Professional" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "Workspaces" }));
    expect(screen.getByRole("link", { name: "Thesis defence" })).toHaveAttribute("href", "/app");
  });

  it("dismisses on Escape with focus restored, and on outside pointer presses", () => {
    renderScreen(<WorkspaceNav space="defense" />, "/app");
    const trigger = screen.getByRole("button", { name: "Workspaces" });
    fireEvent.click(trigger);
    screen.getByRole("link", { name: "Professional" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
