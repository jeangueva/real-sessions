import { describe, expect, it } from "vitest";
import { azureVoiceFor } from "../src/voice/azure-tts.js";
import { juryVoiceFor } from "../src/languages.js";

describe("a jury with its country's accent", () => {
  it("gives each of the eight countries its own Azure voices, three people per panel", () => {
    for (const country of ["PE", "AR", "CL", "CO", "EC", "BO", "UY", "PA"]) {
      const chair = azureVoiceFor("measured", country)!;
      const methodologist = azureVoiceFor("skeptic", country)!;
      const specialist = azureVoiceFor("systems", country)!;
      expect(chair.locale).toBe(`es-${country}`);
      expect(methodologist.name).not.toBe(chair.name);
      // Same voice as the chair, spoken differently.
      expect(specialist.name).toBe(chair.name);
      expect(specialist.pitch).toBeDefined();
    }
    expect(azureVoiceFor("measured", "BR")).toBeNull();
  });

  it("uses Aura's own Argentine and Colombian voices where Azure is not set up", () => {
    expect(juryVoiceFor("skeptic", "AR")).toBe("aura-2-antonia-es");
    expect(juryVoiceFor("skeptic", "CO")).toBe("aura-2-gloria-es");
    expect(juryVoiceFor("measured", "PE")).toBe("aura-2-javier-es");
  });
});
