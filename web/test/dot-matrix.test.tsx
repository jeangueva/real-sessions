import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DotMatrix } from "../src/design-system/dot-matrix";

/**
 * A loader is the one component whose whole job is to be understood while
 * nothing else is on screen — including by someone who cannot see it.
 */
describe("the dot matrix", () => {
  it("says what the wait is for, out loud", () => {
    render(<DotMatrix label="Leyendo tu entrevista" />);
    const status = screen.getByRole("status");
    // An animation announces nothing on its own, and "loading" announces
    // almost as little.
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Leyendo tu entrevista");
  });

  it("draws the grid it was asked for", () => {
    const { container } = render(<DotMatrix size={4} label="…" />);
    // The dots are decoration: the grid is hidden from assistive technology
    // so it is not read as sixteen empty elements before the sentence.
    const grid = container.querySelector("[aria-hidden]");
    expect(grid).not.toBeNull();
    expect(grid!.children).toHaveLength(16);
  });

  it("adds a second layer per dot only when bloom is on", () => {
    const plain = render(<DotMatrix size={2} label="…" />).container;
    expect(plain.querySelectorAll("span > span")).toHaveLength(4);
    const lit = render(<DotMatrix size={2} bloom label="…" />).container;
    expect(lit.querySelectorAll("span > span")).toHaveLength(8);
  });
});
