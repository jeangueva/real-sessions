import { describe, expect, it } from "vitest";
import { supportsEffort, vendorFor } from "../src/providers/index.js";

describe("vendorFor", () => {
  it("routes by model id prefix", () => {
    expect(vendorFor("claude-haiku-4-5")).toBe("anthropic");
    expect(vendorFor("gemini-3.1-flash-lite")).toBe("gemini");
  });

  it("routes qwen and OpenRouter ids", () => {
    expect(vendorFor("qwen3.5-flash")).toBe("qwen");
    expect(vendorFor("deepseek/deepseek-chat")).toBe("openrouter");
    expect(vendorFor("anthropic/claude-haiku-4.5")).toBe("openrouter");
  });

  it("refuses an unrecognized model instead of guessing a vendor", () => {
    expect(() => vendorFor("gpt-5-nano")).toThrow(/Unknown model/);
  });
});

describe("supportsEffort", () => {
  it("omits effort on models that reject the field", () => {
    expect(supportsEffort("claude-haiku-4-5")).toBe(false);
    expect(supportsEffort("claude-sonnet-4-5")).toBe(false);
  });

  it("allows effort on models that support it", () => {
    expect(supportsEffort("claude-sonnet-5")).toBe(true);
    expect(supportsEffort("claude-opus-5")).toBe(true);
  });
});

describe("empty-response scoring", () => {
  // Regression: the first live benchmark scored a model that returned nothing
  // as a perfect run, because every rule is vacuously true for "".
  it("treats an empty turn as a failure, not a pass", async () => {
    const { checkTurn } = await import("../examples/persona-harness.js");
    const empty = checkTurn(
      { text: "", isComplete: false, turnNumber: 1, stopReason: "length" },
      "normal answer",
    );
    expect(empty.every((check) => check.ok)).toBe(false);
    expect(empty.find((c) => c.name === "said something")?.ok).toBe(false);
    expect(empty.find((c) => c.name === "not truncated")?.ok).toBe(false);

    const real = checkTurn(
      { text: "What did you measure?", isComplete: false, turnNumber: 1, stopReason: "stop" },
      "normal answer",
    );
    expect(real.every((check) => check.ok)).toBe(true);
  });
});

describe("cheapest-passing selection", () => {
  // Regression: the summary called the first passing model "cheapest",
  // which named the most expensive one when args were not in price order.
  it("picks by measured cost, not argument order", () => {
    const rows = [
      { model: "expensive", costUsd: 0.0028, failures: [] as unknown[], error: undefined },
      { model: "cheap", costUsd: 0.0002, failures: [] as unknown[], error: undefined },
    ];
    const cheapest = rows
      .filter((r) => !r.error && r.failures.length === 0)
      .sort((a, b) => (a.costUsd ?? Infinity) - (b.costUsd ?? Infinity))
      .at(0);
    expect(cheapest?.model).toBe("cheap");
  });
});
