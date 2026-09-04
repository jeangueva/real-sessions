import { describe, expect, it } from "vitest";
import {
  buildChoices,
  describeSession,
  matchScore,
  sessionLabel,
} from "../src/platform/SetupSearch";
import type { Persona, SessionSummary, Sector } from "../src/lib/api";

/**
 * The one field that both configures an interview and finds an old one.
 *
 * What is worth pinning: that the first suggestion is not random, and that a
 * past session outranks a bare option. Repeating a configuration exactly is
 * the only way two scores compare — a rerun against a different interviewer
 * measures the interviewer — so that ranking is the feature, not a detail.
 */

const session = (over: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "s1",
  company: "Stripe",
  sectorId: "fintech",
  role: "Backend Engineer",
  stage: "Behavioral",
  mode: "practice",
  personaId: "skeptic",
  startedAt: "2026-08-12T10:00:00.000Z",
  completedAt: "2026-08-12T10:12:00.000Z",
  score: 68,
  vocabularyScore: 7,
  structureScore: 6,
  metrics: null,
  ...over,
});

const SECTORS: Sector[] = [
  { id: "fintech", label: "Fintech", metrics: "authorisation rates" } as Sector,
];

const PERSONAS: Persona[] = [
  {
    id: "skeptic",
    label: "The skeptic",
    name: "Diane Kovac",
    title: "Director of Engineering",
    initials: "DK",
    summary: "Wants evidence.",
    behaviour: "",
    voice: { model: "aura-2-saturn-en", fallback: { rate: 1, pitch: 1, prefer: [] } },
  },
];

const base = {
  sessions: [] as SessionSummary[],
  companies: ["Stripe", "Amazon", "Airbnb"],
  roles: ["Backend Engineer", "Senior Product Designer", "Data Analyst"],
  stages: ["Behavioral", "System design"],
  sectors: SECTORS,
  personas: PERSONAS,
};

describe("matchScore", () => {
  it("ranks a whole-string match above a prefix above a word start", () => {
    expect(matchScore("Stripe", "stripe")).toBeGreaterThan(matchScore("Stripe", "str"));
    expect(matchScore("Stripe", "str")).toBeGreaterThan(
      matchScore("Senior Product Designer", "product"),
    );
  });

  it("finds a word in the middle of a phrase", () => {
    expect(matchScore("Senior Product Designer", "designer")).toBeGreaterThan(0);
  });

  it("scores a substring that starts mid-word lowest, but still matches", () => {
    const midWord = matchScore("Stripe", "rip");
    expect(midWord).toBeGreaterThan(0);
    expect(midWord).toBeLessThan(matchScore("Stripe", "str"));
  });

  it("is zero for no match, and non-zero for an empty query", () => {
    expect(matchScore("Stripe", "zzz")).toBe(0);
    // An empty query lists everything rather than nothing — an empty dropdown
    // on focus reads as broken.
    expect(matchScore("Stripe", "")).toBeGreaterThan(0);
  });
});

describe("buildChoices", () => {
  it("offers the matching company", () => {
    const choices = buildChoices({ ...base, query: "stri" });
    expect(choices[0]).toEqual({ kind: "company", label: "Stripe" });
  });

  it("puts a past session above an equally good plain option", () => {
    // Both the role and the session label start with "backend". The session
    // wins the tie, because rerunning one is what this field is for.
    const choices = buildChoices({ ...base, sessions: [session()], query: "backend" });
    expect(choices[0]!.kind).toBe("session");
  });

  it("still lets an exact match on an option win", () => {
    // Typing a role in full is an unambiguous request for that role, and a
    // session that merely contains it should not outrank it.
    const choices = buildChoices({
      ...base,
      sessions: [session()],
      query: "backend engineer",
    });
    expect(choices[0]).toEqual({ kind: "role", label: "Backend Engineer" });
  });

  it("searches a session by company, role and stage together", () => {
    const past = [session()];
    for (const query of ["stripe", "backend", "behavioral"]) {
      const choices = buildChoices({ ...base, sessions: past, query });
      expect(choices.some((c) => c.kind === "session"), query).toBe(true);
    }
  });

  it("finds interviewers by name", () => {
    const choices = buildChoices({ ...base, query: "diane" });
    expect(choices[0]).toMatchObject({ kind: "persona", id: "skeptic" });
  });

  it("returns everything it has for an empty query, capped", () => {
    const choices = buildChoices({ ...base, query: "", limit: 4 });
    expect(choices).toHaveLength(4);
  });

  it("returns nothing when nothing matches", () => {
    expect(buildChoices({ ...base, query: "zzzzz" })).toEqual([]);
  });

  it("carries the whole past configuration, not just its label", () => {
    // The interviewer is the field most easily lost in a rerun, and losing it
    // makes the two scores incomparable.
    const choices = buildChoices({ ...base, sessions: [session()], query: "stripe" });
    const found = choices.find((c) => c.kind === "session");
    expect(found).toBeDefined();
    if (found?.kind === "session") {
      expect(found.session.personaId).toBe("skeptic");
      expect(found.session.mode).toBe("practice");
      expect(found.session.sectorId).toBe("fintech");
    }
  });
});

describe("session labels", () => {
  it("names a session by what makes it repeatable", () => {
    expect(sessionLabel(session())).toBe("Backend Engineer · Stripe · Behavioral");
  });

  it("does not print the free-plan placeholder back at anyone", () => {
    const generic = "a well-regarded technology company";
    const free = session({ company: generic });
    expect(sessionLabel(free, generic)).toBe(
      "Backend Engineer · General role · Behavioral",
    );
    expect(sessionLabel(free, generic)).not.toContain(generic);
  });

  it("describes it by what tells two attempts apart", () => {
    const text = describeSession(session());
    expect(text).toContain("Practice");
    expect(text).toContain("68%");
  });

  it("says so when a session was never scored", () => {
    // Blank would read as zero, which is a much worse thing to tell someone.
    expect(describeSession(session({ score: null }))).toContain("not scored");
  });
});
