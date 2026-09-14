/**
 * The web app restates the backend evaluation schema by hand because it cannot
 * import across its package boundary. This type-only test notices a drift
 * before it becomes blank dashboard panels; tsc checks the assertion, not the
 * test runtime.
 */
import { describe, expectTypeOf, it } from "vitest";
import type { Evaluation as BackendEvaluation } from "../src/schema.js";
import type { Evaluation as WebEvaluation } from "../web/src/lib/evaluation";

describe("the evaluation contract", () => {
  it("keeps the web type aligned with the backend schema", () => {
    expectTypeOf<WebEvaluation>().toEqualTypeOf<BackendEvaluation>();
  });
});
