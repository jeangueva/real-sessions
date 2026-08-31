import { describe, expect, it } from "vitest";
import { formatSessionDate } from "../src/lib/format";

describe("formatSessionDate", () => {
  it("renders English month names regardless of browser locale", () => {
    // The bug this replaces: a Spanish-locale browser rendered "31 ago" beside
    // English copy, which reads as "31 ago" rather than "31 August".
    expect(formatSessionDate("2026-08-31T10:00:00.000Z")).toMatch(/^Aug 31/);
    expect(formatSessionDate("2026-01-05T10:00:00.000Z")).toMatch(/^Jan 5/);
  });

  it("omits the year for this year and includes it for others", () => {
    const thisYear = new Date();
    thisYear.setMonth(5, 15);
    expect(formatSessionDate(thisYear.toISOString())).not.toMatch(/\d{4}/);
    // An old session without a year is ambiguous, not concise.
    expect(formatSessionDate("2019-06-15T10:00:00.000Z")).toContain("2019");
  });

  it("returns empty rather than 'Invalid Date' for junk", () => {
    expect(formatSessionDate("not a date")).toBe("");
    expect(formatSessionDate("")).toBe("");
  });
});
