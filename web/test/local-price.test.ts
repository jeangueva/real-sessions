import { describe, expect, it } from "vitest";
import { convert, currencyFor } from "../src/lib/local-price";

describe("currencyFor", () => {
  it("reads the region from the browser language", () => {
    expect(currencyFor(["es-AR", "es"], "UTC")).toBe("ARS");
    expect(currencyFor(["es-ES"], undefined)).toBe("EUR");
    expect(currencyFor(["pt-BR"], undefined)).toBe("BRL");
  });

  it("falls back to the timezone when the language has no region", () => {
    expect(currencyFor(["es"], "America/Bogota")).toBe("COP");
    expect(currencyFor(["en"], "Europe/Madrid")).toBe("EUR");
  });

  it("gives up rather than guess", () => {
    expect(currencyFor(["es"], "Atlantic/Reykjavik")).toBeNull();
    expect(currencyFor([], undefined)).toBeNull();
  });
});

describe("convert", () => {
  const rates = { base: "PEN", values: { PEN: 1, ARS: 440, EUR: 0.25 }, asOf: "2026-10-04T00:00:00Z" };

  it("converts the charged amount into the reader's currency", () => {
    expect(convert(287, "PEN", "ARS", rates)).toBeCloseTo(126280);
    expect(convert(287, "PEN", "EUR", rates)).toBeCloseTo(71.75);
  });

  it("shows nothing for a reader who already pays in soles", () => {
    expect(convert(287, "PEN", "PEN", rates)).toBeNull();
  });

  it("shows nothing without a rate, or with rates from another base", () => {
    expect(convert(287, "PEN", "ARS", null)).toBeNull();
    expect(convert(287, "PEN", "XYZ", rates)).toBeNull();
    expect(convert(287, "USD", "ARS", rates)).toBeNull();
  });
});
