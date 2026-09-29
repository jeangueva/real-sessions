import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Accordion } from "../src/design-system/accordion";

/**
 * The four departures from the component this was ported from.
 *
 * Each one was a real defect in the original, and each is the kind that a
 * screenshot shows as working: the accordion opens and closes either way.
 */
const ENTRIES = [
  { question: "¿Cuánto dura una entrevista?", answer: "Siete turnos, unos diez minutos." },
  { question: "¿Puedo practicar sin cuenta?", answer: "Sí, tres por mes." },
];

describe("the accordion", () => {
  it("opens nothing until asked", () => {
    render(<Accordion entries={ENTRIES} />);
    // The original opened its second row on first paint — an answer to a
    // question nobody had asked yet.
    for (const entry of ENTRIES) {
      expect(screen.getByRole("button", { name: entry.question })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    }
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("tells assistive technology what it is doing", () => {
    render(<Accordion entries={ENTRIES} />);
    const trigger = screen.getByRole("button", { name: ENTRIES[0]!.question });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // The panel is named by its own question, so a screen reader announces
    // which answer it landed in rather than "region".
    expect(screen.getByRole("region", { name: ENTRIES[0]!.question })).toHaveTextContent(
      ENTRIES[0]!.answer,
    );
    expect(trigger.getAttribute("aria-controls")).toBe(
      screen.getByRole("region", { name: ENTRIES[0]!.question }).id,
    );
  });

  it("keeps one answer open at a time", () => {
    render(<Accordion entries={ENTRIES} />);
    fireEvent.click(screen.getByRole("button", { name: ENTRIES[0]!.question }));
    fireEvent.click(screen.getByRole("button", { name: ENTRIES[1]!.question }));
    expect(screen.getByRole("button", { name: ENTRIES[0]!.question })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("does not close when the reader touches the rest of the page", () => {
    render(
      <div>
        <Accordion entries={ENTRIES} />
        <button type="button">Algo más en la página</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: ENTRIES[0]!.question });
    fireEvent.click(trigger);
    // The original listened on `document` for mousedown and collapsed
    // everything: an answer vanished the moment the reader reached for a
    // scrollbar, a link, or their own selection.
    const elsewhere = screen.getByRole("button", { name: "Algo más en la página" });
    fireEvent.mouseDown(elsewhere);
    fireEvent.click(elsewhere);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("lets the answer be selected without closing it", () => {
    render(<Accordion entries={ENTRIES} />);
    const trigger = screen.getByRole("button", { name: ENTRIES[0]!.question });
    fireEvent.click(trigger);
    // The answer carried an onClick that shut the row, so selecting a
    // sentence to re-read it closed the sentence.
    fireEvent.click(screen.getByText(ENTRIES[0]!.answer));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
