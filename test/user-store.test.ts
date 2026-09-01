import { describe, expect, it } from "vitest";
import {
  createUserStore,
  readPreferences,
  DEFAULT_PREFERENCES,
} from "../src/user-store.js";

describe("preferences", () => {
  it("returns defaults for an identity that has never set any", async () => {
    const users = createUserStore(null);
    expect(await users.getPreferences("nobody")).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips what was stored", async () => {
    const users = createUserStore(null);
    const next = {
      ...DEFAULT_PREFERENCES,
      defaultRole: "Backend Engineer",
      defaultSector: "devtools",
      defaultMode: "real" as const,
    };
    await users.setPreferences("owner", next);
    expect(await users.getPreferences("owner")).toEqual(next);
  });

  it("fills in a field added after the record was written", async () => {
    const users = createUserStore(null);
    // Simulates a record from before defaultSector and defaultMode existed.
    await users.setPreferences("owner", {
      defaultRole: "Growth PM",
      defaultCompany: "Stripe",
      interviewLength: 7,
    } as never);
    const read = await users.getPreferences("owner");
    expect(read.defaultSector).toBe(DEFAULT_PREFERENCES.defaultSector);
    expect(read.defaultMode).toBe(DEFAULT_PREFERENCES.defaultMode);
  });
});

describe("readPreferences", () => {
  it("clamps interview length to what the prompt supports", () => {
    expect(readPreferences({ interviewLength: 99 }).interviewLength).toBe(7);
    expect(readPreferences({ interviewLength: 1 }).interviewLength).toBe(5);
  });

  it("falls back to defaults for junk input", () => {
    expect(readPreferences({ interviewLength: "soon", defaultRole: 42 })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it("caps free text so a client cannot store an essay", () => {
    const long = "x".repeat(500);
    expect(readPreferences({ defaultRole: long }).defaultRole).toHaveLength(120);
    expect(readPreferences({ defaultCompany: long }).defaultCompany).toHaveLength(80);
  });

  it("keeps an empty sector, which means no filter rather than no value", () => {
    // Unlike a blank role, this one is not replaced by a default.
    expect(readPreferences({ defaultSector: "" }).defaultSector).toBe("");
  });

  it("only accepts a mode it knows", () => {
    expect(readPreferences({ defaultMode: "real" }).defaultMode).toBe("real");
    expect(readPreferences({ defaultMode: "hardcore" }).defaultMode).toBe("practice");
  });
});
