import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderScreen, stubApi } from "./support/render";
import { PublicLanding } from "@/components/PublicLanding";
import { TrainingConversations } from "@/platform/TrainingConversations";
import { IntuitionTrainer } from "@/platform/IntuitionTrainer";

const SAMPLE_CATALOGUE = {
  scenarios: [
    {
      id: "group-project",
      domain: "education",
      title: "An uneven group project",
      role: "A classmate who has missed two milestones",
      brief: "The presentation is next week.",
      goal: "Name observable facts and agree on owners.",
    },
    {
      id: "founder-no",
      domain: "professional",
      title: "Say no to a founder",
      role: "A founder asking for a launch commitment",
      brief: "A founder wants a major new feature this Friday.",
      goal: "Set a clear boundary and offer a reversible option.",
    },
    {
      id: "family-money",
      domain: "professional",
      personal: true,
      title: "A family request for money",
      role: "A relative asking for recurring financial help",
      brief: "You cannot sustain the amount requested.",
      goal: "Acknowledge the relationship and state your limit.",
    },
  ],
  cultures: [
    { id: "neutral", label: "No regional context", detail: "Ask about individual preferences." },
    { id: "latam", label: "Latin America", detail: "The setting is Latin America." },
    { id: "north-america", label: "North America", detail: "The setting is North America." },
  ],
  intuition: [
    {
      id: "case-d",
      kind: "hypotheses",
      title: "Checkout registration friction",
      prompt: "Shoppers abandon checkout when asked to register before paying.",
      options: [
        "Replace mandatory registration with guest checkout",
        "Add password validation hints",
        "Send a discount email 24 hours later",
      ],
    },
  ],
};

describe("PublicLanding", () => {
  it("communicates Education, Professional, 100% free access and voluntary support options", async () => {
    stubApi({ "/api/support": { url: "https://ko-fi.com/mockio" } });
    renderScreen(<PublicLanding />, "/");

    expect(screen.getByRole("heading", { name: "Education" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Professional" })).toBeInTheDocument();
    expect(screen.getByText(/HardTalk Tech · Stakeholder Lab/i)).toBeInTheDocument();
    expect(screen.getByText(/HardTalk Latam & NA/i)).toBeInTheDocument();
    expect(screen.getByText(/Product & design intuition with reality feedback/i)).toBeInTheDocument();
    expect(screen.getByText(/100% free to practice\. Optional to support\./i)).toBeInTheDocument();

    for (const amount of ["$1", "$2", "$5", "$8", "$10", "Custom"]) {
      expect(screen.getByRole("button", { name: amount })).toBeInTheDocument();
    }
    expect(await screen.findByRole("link", { name: /Open support page/i })).toHaveAttribute(
      "href",
      "https://ko-fi.com/mockio",
    );
  });
});

describe("TrainingConversations", () => {
  it("filters professional scenarios between Tech and Personal and runs a rehearsal", async () => {
    stubApi({
      "/api/training/catalogue": SAMPLE_CATALOGUE,
      "/api/training/conversations/feedback": {
        feedback: {
          summary: "Clear boundary and reversible alternative.",
          strengths: ["Named the stability risk directly."],
          improvements: ["Confirm the Friday follow-up owner."],
          suggestedReply: "Let us ship the internal pilot Friday and review metrics Monday.",
          nextPractice: "Practice holding the line on a second pushback.",
        },
      },
      "/api/training/conversations/answer": {
        token: "tok-2",
        messages: [
          { role: "assistant", text: "We need this feature live on Friday." },
          { role: "user", text: "We can ship an internal pilot Friday while fixing reliability." },
          { role: "assistant", text: "Alright, let us scope that pilot." },
        ],
        answers: 1,
        maxAnswers: 8,
        complete: false,
      },
      "/api/training/conversations": {
        token: "tok-1",
        messages: [{ role: "assistant", text: "We need this feature live on Friday." }],
        answers: 0,
        maxAnswers: 8,
        complete: false,
      },
    });

    renderScreen(<TrainingConversations domain="professional" />, "/app/training/professional");

    expect(await screen.findByRole("heading", { name: /Say no to a founder/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /A family request for money/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Start rehearsal/i }));
    expect(await screen.findByText(/We need this feature live on Friday\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Your response/i), {
      target: { value: "We can ship an internal pilot Friday while fixing reliability." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send response/i }));
    expect(await screen.findByText(/Alright, let us scope that pilot\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Get coaching feedback/i }));
    expect(await screen.findByText(/Clear boundary and reversible alternative\./i)).toBeInTheDocument();
  });
});

describe("IntuitionTrainer", () => {
  it("commits a choice, confidence and reasoning before revealing the historical case", async () => {
    stubApi({
      "/api/training/catalogue": SAMPLE_CATALOGUE,
      "/api/training/intuition/reveal": {
        judgment: {
          caseId: "case-d",
          choice: 0,
          confidence: 70,
          reasoning: "Mandatory registration creates friction right before payment.",
        },
        recommended: 0,
        rationale: "Remove unrequested commitment before payment.",
        reveal: {
          name: "UIE / Jared Spool — The $300 Million Button (2009)",
          outcome: "Guest checkout increased purchasing customers by 45%.",
          source: "UIE usability case study",
          url: "https://articles.centercentre.com/three_hundred_million_button/",
        },
        reflection: "Compare your reasoning with the evidence.",
        presentation: "Anonymized educational reconstruction.",
      },
    });

    renderScreen(<IntuitionTrainer />, "/app/intuition");

    expect(await screen.findByRole("heading", { name: /Checkout registration friction/i, level: 2 })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Replace mandatory registration with guest checkout/i));
    fireEvent.change(screen.getByLabelText(/Why this option\?/i), {
      target: { value: "Mandatory registration creates friction right before payment." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Commit judgment and reveal outcome/i }));

    expect(await screen.findByText(/The \$300 Million Button/i)).toBeInTheDocument();
    expect(screen.getByText(/Guest checkout increased purchasing customers by 45%\./i)).toBeInTheDocument();
  });
});
