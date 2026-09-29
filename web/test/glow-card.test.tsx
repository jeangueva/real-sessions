import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlowCard } from "../src/design-system/glow-card";

/**
 * The lit area is dark on every theme, which is the whole reason the header
 * is two strings rather than a free `ReactNode`: anything a caller wrote
 * there would reach for `text-cream-bright` like every other heading in this
 * codebase, and that ink is near-black on the light theme.
 */
describe("the glow card", () => {
  it("draws the header itself, so it cannot be given the wrong ink", () => {
    render(<GlowCard eyebrow="Plan pago" title="Practica con tu CV" />);
    const title = screen.getByRole("heading", { name: "Practica con tu CV" });
    // Light in both themes, because the ground under it is dark in both.
    expect(title.className).toContain("#ece9d8");
    expect(title.className).not.toContain("text-cream");
  });

  it("hides the lit area from assistive technology when it says nothing", () => {
    const { container } = render(
      <GlowCard>
        <p>El cuerpo</p>
      </GlowCard>,
    );
    // Drifting shapes and a turning ring carry no meaning; announced, they
    // are noise in front of the content.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText("El cuerpo")).toBeInTheDocument();
  });
});
