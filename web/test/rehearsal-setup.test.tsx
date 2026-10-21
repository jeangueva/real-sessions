import { useState } from "react";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Rehearse } from "@/platform/Thesis";
import * as api from "@/lib/api";
import { renderScreen } from "./support/render";
import { catalogue, career, response, thesis } from "./fixtures/rehearsal";

vi.mock("@/lib/api", async (original) => ({
  ...await original<typeof api>(), fetchThesis: vi.fn(), fetchCareers: vi.fn(), saveCareer: vi.fn(),
}));
vi.mock("@/lib/audio-level", async (original) => ({ ...await original<typeof import("@/lib/audio-level")>(), resumeAudio: vi.fn() }));
vi.mock("@/lib/voice", async (original) => ({ ...await original<typeof import("@/lib/voice")>(), primeVoiceUnlock: vi.fn() }));
function Setup() {
  const [current, setCurrent] = useState(thesis);
  const location = useLocation();
  return <><Rehearse thesis={current} onChange={setCurrent} /><output data-testid="destination">{JSON.stringify(location.state)}</output></>;
}
beforeEach(() => {
  vi.mocked(api.fetchThesis).mockResolvedValue(response);
  vi.mocked(api.fetchCareers).mockResolvedValue(catalogue);
  localStorage.clear();
});

describe("rehearsal setup", () => {
  it("shows the career selector and assigned panel outside advanced settings", async () => {
    renderScreen(<Setup />);
    const select = await screen.findByRole("combobox", { name: "Jury by degree / field" });
    await waitFor(() => expect(select).toBeEnabled());
    expect(select.closest("details")).toBeNull();
    const jury = screen.getByRole("list", { name: "Your assigned jury" });
    expect(within(jury).getByText("Dra. Vidal")).toBeVisible();
    expect(within(jury).getByText("Metodóloga en sistemas")).toBeVisible();
    expect(within(jury).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Rehearse my defence" })).toBeEnabled();
  });

  it("updates the displayed jury when the selected career is saved", async () => {
    vi.mocked(api.saveCareer).mockResolvedValue({ thesis: { ...thesis, careerOverride: "law" }, career: { ...career, family: "law", source: "override" } });
    renderScreen(<Setup />);
    const select = screen.getByRole("combobox", { name: "Jury by degree / field" });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.change(select, { target: { value: "law" } });
    expect(await screen.findByText("Especialista en derecho")).toBeVisible();
    expect(api.saveCareer).toHaveBeenCalledWith("law");
    fireEvent.click(screen.getByRole("button", { name: "Rehearse my defence" }));
    const destination = JSON.parse(screen.getByTestId("destination").textContent!);
    expect(destination.defense.jurors.especialista.role).toBe("Especialista en derecho");
  });

  it("reports a failed save and keeps the previous jury", async () => {
    vi.mocked(api.saveCareer).mockRejectedValue(new Error("offline"));
    renderScreen(<Setup />);
    const select = screen.getByRole("combobox", { name: "Jury by degree / field" });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.change(select, { target: { value: "law" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(select).toHaveValue("");
    expect(screen.getByText("Especialista en sistemas")).toBeVisible();
  });

  it("shows one juror for express and preserves the start action while loading", async () => {
    renderScreen(<Setup />);
    expect(screen.getByRole("button", { name: "Rehearse my defence" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Rehearse my defence" })).toBeEnabled());
    fireEvent.click(screen.getByRole("radio", { name: /^Express/ }));
    expect(within(screen.getByRole("list", { name: "Your assigned jury" })).getAllByRole("listitem")).toHaveLength(1);
  });
});
