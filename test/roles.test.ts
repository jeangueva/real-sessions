import { describe, expect, it } from "vitest";
import { AREAS, ROLES, findRole, interviewerTitle } from "../src/roles.js";
import { stagesFor } from "../src/stages.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { PERSONAS } from "../src/personas.js";

describe("the role catalogue", () => {
  it("puts every role in an area that exists", () => {
    const areas = new Set(AREAS.map((area) => area.id));
    for (const role of ROLES) expect(areas.has(role.area), role.id).toBe(true);
  });

  it("offers at least three roles in every area", () => {
    for (const area of AREAS) {
      expect(ROLES.filter((role) => role.area === area.id).length, area.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("never repeats an id or a label", () => {
    expect(new Set(ROLES.map((role) => role.id)).size).toBe(ROLES.length);
    expect(new Set(ROLES.map((role) => role.label.toLowerCase())).size).toBe(ROLES.length);
  });

  it("keeps the original six exactly, because history and questions point at them", () => {
    for (const [id, label] of [
      ["product-designer", "Senior Product Designer"],
      ["backend-engineer", "Backend Engineer"],
      ["frontend-engineer", "Frontend Engineer"],
      ["growth-pm", "Growth PM"],
      ["data-analyst", "Data Analyst"],
      ["engineering-manager", "Engineering Manager"],
    ]) {
      expect(findRole(label)?.id).toBe(id);
    }
  });

  it("gives every role a round that tests the work, not only the shared ones", () => {
    const shared = new Set(["recruiter-screen", "behavioral", "values", "salary-negotiation", "async-standup"]);
    for (const role of ROLES) {
      const skill = stagesFor(role.id).filter((stage) => !shared.has(stage.id));
      expect(skill.length, role.id).toBeGreaterThan(0);
    }
  });

  it("keeps system design away from the non-technical areas", () => {
    for (const id of ["accountant", "legal-counsel", "account-executive", "ux-designer"]) {
      expect(stagesFor(id).map((stage) => stage.id), id).not.toContain("system-design");
    }
  });
});

describe("interviewerTitle", () => {
  it("leaves engineering titles alone", () => {
    expect(interviewerTitle("Director of Engineering", "backend-engineer")).toBe("Director of Engineering");
  });

  it("gives the interviewer a title from the candidate's own area", () => {
    expect(interviewerTitle("Director of Engineering", "accountant")).toBe("Finance Director");
    expect(interviewerTitle("Engineering Manager", "UX Designer")).toBe("Design Manager");
  });

  it("keeps titles every area shares", () => {
    expect(interviewerTitle("Talent Partner", "legal-counsel")).toBe("Talent Partner");
    expect(interviewerTitle("Co-founder", "recruiter")).toBe("Co-founder");
  });

  it("never leaves an engineering title in a non-engineering area", () => {
    const engineering = ["Engineering Manager", "Director of Engineering", "Principal Architect"];
    for (const role of ROLES.filter((entry) => entry.area !== "engineering")) {
      for (const persona of PERSONAS) {
        const title = interviewerTitle(persona.title, role.id);
        expect(engineering, `${role.id} / ${persona.id}`).not.toContain(title);
      }
    }
  });

  it("is the title the interviewer introduces themselves with", () => {
    const prompt = buildInterviewerPrompt(
      {
        candidateName: "Ana",
        targetRole: "Accountant",
        companyName: "Globant",
        industry: "Technology",
        companyCulture: "Precise and numbers-driven.",
        interviewStage: "behavioral",
      } as Parameters<typeof buildInterviewerPrompt>[0],
      { personaId: "skeptic" },
    );
    expect(prompt).toContain("Finance Director");
    expect(prompt).not.toContain("Director of Engineering");
  });
});
