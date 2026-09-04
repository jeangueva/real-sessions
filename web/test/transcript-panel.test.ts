import { describe, expect, it } from "vitest";
import { speakerLabel } from "../src/platform/TranscriptPanel";

/**
 * Who said what.
 *
 * A transcript read back a week later is worthless if the attribution is
 * ambiguous, and this is the one piece of that which is pure logic — the rest
 * is layout.
 */

describe("speakerLabel", () => {
  it("names the interviewer the way they introduced themselves", () => {
    // The opening turn says "I'm Marcus", so the transcript says Marcus. A
    // full name here would read as a third party who never spoke.
    expect(speakerLabel("interviewer", "Marcus Hale")).toBe("Interviewer (Marcus)");
    expect(speakerLabel("interviewer", "Diane Kovac")).toBe("Interviewer (Diane)");
  });

  it("falls back to the bare role before the persona has arrived", () => {
    // The first turn can start streaming before the session event lands.
    expect(speakerLabel("interviewer", null)).toBe("Interviewer");
    expect(speakerLabel("interviewer", "")).toBe("Interviewer");
    expect(speakerLabel("interviewer", "   ")).toBe("Interviewer");
  });

  it("calls the candidate you, not their own name", () => {
    // Reading someone's name back at them in their own transcript is oddly
    // formal, and the account already knows who they are.
    expect(speakerLabel("candidate", "Marcus Hale")).toBe("You");
    expect(speakerLabel("candidate", null)).toBe("You");
  });

  it("takes the first word of a name however it is spaced", () => {
    expect(speakerLabel("interviewer", "  Ruth   Adeyemi ")).toBe("Interviewer (Ruth)");
  });
});
