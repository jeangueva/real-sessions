import { describe, expect, it } from "vitest";
import {
  DICTIONARIES,
  EN_MESSAGES,
  LOCALES,
  localeFromNavigator,
  storedLocale,
  translate,
} from "../src/lib/i18n";

/**
 * The interface language.
 *
 * The failure worth guarding against is the untidy one that ships: a key
 * added to English and forgotten in Spanish, which reaches a candidate as an
 * English word in the middle of a Spanish sentence. TypeScript catches that
 * at build time; this catches the shape of it, and the placeholder handling
 * which types cannot see.
 */

describe("the dictionaries", () => {
  it("cover every English key, in every locale", () => {
    const keys = Object.keys(EN_MESSAGES).sort();
    for (const { id } of LOCALES) {
      expect(Object.keys(DICTIONARIES[id]).sort(), id).toEqual(keys);
    }
  });

  it("leaves nothing blank", () => {
    // An empty string renders as a missing label rather than as an error.
    for (const { id } of LOCALES) {
      for (const [key, value] of Object.entries(DICTIONARIES[id])) {
        expect(value.trim(), `${id}.${key}`).not.toBe("");
      }
    }
  });

  it("keeps the same placeholders in every translation", () => {
    // A translation that drops `{name}` renders "is speaking" with nobody
    // doing it; one that invents `{nombre}` renders the braces.
    const placeholders = (text: string) =>
      (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");

    for (const [key, english] of Object.entries(EN_MESSAGES)) {
      for (const { id } of LOCALES) {
        const translated = DICTIONARIES[id][key as keyof typeof EN_MESSAGES];
        expect(placeholders(translated), `${id}.${key}`).toBe(placeholders(english));
      }
    }
  });
});

describe("translate", () => {
  it("returns the locale's string", () => {
    expect(translate("es", "nav.settings")).toBe("Ajustes");
    expect(translate("pt", "nav.history")).toBe("Histórico");
    expect(translate("en", "nav.history")).toBe("History");
  });

  it("fills placeholders", () => {
    expect(translate("en", "call.turnOf", { turn: 3, total: 9 })).toBe("Turn 3 of 9");
    expect(translate("es", "call.speaking", { name: "Diane" })).toBe(
      "Diane está hablando",
    );
  });

  it("leaves an unsupplied placeholder alone rather than printing undefined", () => {
    expect(translate("en", "call.turnOf", { turn: 3 })).toContain("{total}");
  });
});

describe("localeFromNavigator", () => {
  it("matches on the primary subtag", () => {
    // Browsers report full tags: es-419, pt-BR, en-GB.
    expect(localeFromNavigator(["es-419"])).toBe("es");
    expect(localeFromNavigator(["pt-BR"])).toBe("pt");
    expect(localeFromNavigator(["en-GB"])).toBe("en");
  });

  it("takes the first language it speaks, not the first listed", () => {
    expect(localeFromNavigator(["de-DE", "pt-BR", "en"])).toBe("pt");
  });

  it("falls back to English rather than a half-translated screen", () => {
    expect(localeFromNavigator(["ja-JP"])).toBe("en");
    expect(localeFromNavigator([])).toBe("en");
  });
});

describe("storedLocale", () => {
  it("accepts what we speak and rejects everything else", () => {
    expect(storedLocale("es")).toBe("es");
    // Null means "no choice stored", which lets the browser's preference win
    // rather than pinning someone to a stale value from an older build.
    expect(storedLocale("klingon")).toBeNull();
    expect(storedLocale(null)).toBeNull();
  });
});
