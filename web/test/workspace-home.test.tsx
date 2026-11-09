import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderScreen, stubApi } from "./support/render";
import { WorkspaceHome } from "@/platform/WorkspaceHome";
import { indexFor } from "@/platform/useHomeCatalogue";
import { customPath, type SearchItem } from "@/lib/search";

const CATALOGUE = {
  scenarios: [
    { id: "oral-exam-question", domain: "education", title: "Clarify an ambiguous oral exam question", role: "An examiner", brief: "A broad question.", goal: "Answer it." },
    { id: "advisor-scope", domain: "education", title: "Negotiate thesis scope with your advisor", role: "An advisor", brief: "Six weeks left.", goal: "Protect the date." },
    { id: "founder-no", domain: "professional", title: "Say no to a founder", role: "A founder", brief: "Launch on Friday.", goal: "Hold the line." },
    { id: "family-money", domain: "professional", personal: true, title: "A family request for money", role: "A relative", brief: "Recurring help.", goal: "Set a limit." },
  ],
  cultures: [],
  intuition: [{ id: "case-d", kind: "hypotheses", title: "Sign-up friction before checkout", prompt: "Buyers abandon at sign-up.", options: ["a", "b", "c"] }],
};

function stub() {
  stubApi({
    "/api/training/catalogue": CATALOGUE,
    "/api/catalogue": { roles: [{ id: "pm", label: "Product Manager", focus: "discovery" }], companies: [] },
  });
}

describe("workspace home", () => {
  it("shows only the academic world in Education", async () => {
    stub();
    renderScreen(<WorkspaceHome space="defense" />, "/app/education");
    expect(await screen.findByRole("heading", { name: "Academic scenarios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your thesis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Most popular" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Work conversations" })).not.toBeInTheDocument();
    expect(screen.queryByText("Say no to a founder")).not.toBeInTheDocument();
    expect(screen.queryByText("Product Manager")).not.toBeInTheDocument();
  });

  it("shows only the working world in Professional", async () => {
    stub();
    renderScreen(<WorkspaceHome space="career" />, "/app/professional");
    expect(await screen.findByRole("heading", { name: "Work conversations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Most popular" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your thesis" })).not.toBeInTheDocument();
    expect(screen.queryByText("Negotiate thesis scope with your advisor")).not.toBeInTheDocument();
  });

  it("offers to make one for you right under the search, in the open workspace", async () => {
    stub();
    renderScreen(<WorkspaceHome space="defense" />, "/app/education");
    await screen.findByRole("heading", { name: "Academic scenarios" });
    expect(screen.getByRole("link", { name: "Make one for you" })).toHaveAttribute(
      "href",
      "/app/training/custom?domain=education",
    );
  });

  it("rotates featured items in a carousel that can be paused", async () => {
    stub();
    renderScreen(<WorkspaceHome space="career" />, "/app/professional");
    await screen.findByRole("heading", { name: "Work conversations" });
    expect(screen.getAllByRole("button", { name: /Go to featured item/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Pause featured" })).toBeInTheDocument();
  });
});

describe("workspace search scope", () => {
  const items: SearchItem[] = [
    { id: "a", kind: "scenario", title: "Thesis", subtitle: "", to: "/a", space: "defense" },
    { id: "b", kind: "scenario", title: "Founder", subtitle: "", to: "/b", space: "career" },
    { id: "c", kind: "section", title: "Settings", subtitle: "", to: "/c" },
  ];

  it("keeps each workspace's items and the shared screens", () => {
    expect(indexFor(items, "defense").map((item) => item.id)).toEqual(["a", "c"]);
    expect(indexFor(items, "career").map((item) => item.id)).toEqual(["b", "c"]);
  });

  it("sends a made-to-measure rehearsal to the workspace it was asked from", () => {
    expect(customPath("pedir más tiempo", "defense")).toBe("/app/training/custom?q=pedir%20m%C3%A1s%20tiempo&domain=education");
    expect(customPath("", "career")).toBe("/app/training/custom?domain=professional");
  });
});
