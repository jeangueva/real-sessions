import { describe, expect, it } from "vitest";
import { googleVoiceFor } from "../src/voice/google-tts.js";

describe("Google voices", () => {
  it("gives the three Brazilian examiners three different voices", () => {
    const names = ["measured", "skeptic", "systems"].map((id) => googleVoiceFor(id, "pt")?.name);
    expect(new Set(names).size).toBe(3);
    expect(googleVoiceFor("measured", "pt")?.languageCode).toBe("pt-BR");
  });

  it("is only for the languages the main provider lacks", () => {
    expect(googleVoiceFor("measured", "es")).toBeNull();
    expect(googleVoiceFor("measured", "en")).toBeNull();
  });
});
