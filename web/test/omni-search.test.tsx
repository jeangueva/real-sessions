import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { OmniSearch } from "@/platform/OmniSearch";
import type { SearchItem } from "@/lib/search";

const ITEMS: SearchItem[] = [
  { id: "founder", kind: "scenario", title: "Say no to a founder", subtitle: "Work", to: "/app/training/professional?id=founder-no" },
  { id: "stripe", kind: "interview", title: "Stripe", subtitle: "Interview", to: "/app/practice", state: { company: "Stripe" } },
];

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search + JSON.stringify(location.state ?? null)}</p>;
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <OmniSearch items={ITEMS} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OmniSearch", () => {
  it("suggests matches as you type and always offers to make one for you last", () => {
    renderSearch();
    const field = screen.getByRole("combobox", { name: "Search Mockio" });
    fireEvent.change(field, { target: { value: "founder" } });
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Say no to a founder");
    expect(options[1]).toHaveTextContent("Rehearse “founder”");
  });

  it("keeps the make-one-for-you option when nothing matches, and opens it with Enter", () => {
    renderSearch();
    const field = screen.getByRole("combobox", { name: "Search Mockio" });
    fireEvent.change(field, { target: { value: "pedir un aumento" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(screen.getByTestId("where")).toHaveTextContent("/app/training/custom?q=pedir%20un%20aumento");
  });

  it("moves through the options with the arrow keys and carries the item's state", () => {
    renderSearch();
    const field = screen.getByRole("combobox", { name: "Search Mockio" });
    fireEvent.change(field, { target: { value: "stripe" } });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(field, { key: "ArrowUp" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(screen.getByTestId("where")).toHaveTextContent('/app/practice{"company":"Stripe"}');
  });

  it("closes the list with Escape", () => {
    renderSearch();
    const field = screen.getByRole("combobox", { name: "Search Mockio" });
    fireEvent.change(field, { target: { value: "s" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
