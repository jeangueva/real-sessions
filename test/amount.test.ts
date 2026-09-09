import { describe, expect, it } from "vitest";
import { readAmount } from "../src/billing/mercadopago.js";

/**
 * Reading a price out of the environment.
 *
 * This exists because of a real outage-shaped failure: the operator set
 * `MERCADOPAGO_AMOUNT=29,90` — which is how a price is written in Peru — and
 * the checkout reported itself unconfigured. Nothing logged, nothing threw,
 * the upgrade button simply never appeared. `Number("29,90")` is `NaN`.
 */

describe("readAmount", () => {
  it("reads a plain number", () => {
    expect(readAmount("29")).toBe(29);
    expect(readAmount("29.90")).toBe(29.9);
  });

  it("accepts the decimal comma this market writes prices with", () => {
    expect(readAmount("29,90")).toBe(29.9);
    expect(readAmount("52,5")).toBe(52.5);
  });

  it("tolerates surrounding whitespace, which pasting leaves behind", () => {
    expect(readAmount("  29.90 ")).toBe(29.9);
    expect(readAmount(" 29,90")).toBe(29.9);
  });

  it("refuses a thousands separator rather than guessing", () => {
    // "1,000" is one thousand in some places and one in others. A billing
    // amount is the last place to resolve that by preference — better to
    // reject it and have the operator write it unambiguously.
    expect(readAmount("1,000")).toBeNull();
    expect(readAmount("1,000.50")).toBeNull();
  });

  it("refuses anything that is not just a number", () => {
    // A currency symbol is the other thing an operator reaches for.
    expect(readAmount("S/ 29.90")).toBeNull();
    expect(readAmount("29.90 PEN")).toBeNull();
    expect(readAmount("free")).toBeNull();
  });

  it("refuses zero, negatives and nothing at all", () => {
    // A zero price would open a checkout that charges nothing, which is worse
    // than no checkout.
    expect(readAmount("0")).toBeNull();
    expect(readAmount("-5")).toBeNull();
    expect(readAmount("")).toBeNull();
    expect(readAmount("   ")).toBeNull();
    expect(readAmount(undefined)).toBeNull();
  });
});
