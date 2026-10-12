import { describe, expect, it } from "vitest";
import { createDefenseQuestionStore, universityKey } from "../src/defense-questions.js";

describe("the bank of real defence questions", () => {
  it("treats one university written three ways as one", () => {
    expect(universityKey("Universidad Nacional Mayor de San Marcos ")).toBe(universityKey("universidad nacional mayor de SAN MARCOS"));
    expect(universityKey("Pontifícia Universidade Católica")).toBe("pontificia universidade catolica");
  });

  it("keeps a question from every panel until a reviewer verifies it", async () => {
    const store = createDefenseQuestionStore(null);
    const saved = await store.submit("ana", {
      university: "Universidad de Lima",
      country: "PE",
      field: "Marketing",
      questions: ["¿Por qué no usó un muestreo probabilístico?", "¿Qué aporta su tesis a la literatura?"],
    });
    expect(saved).toBe(2);
    const key = universityKey("universidad de lima");
    expect(await store.verified(key)).toHaveLength(0);
    const [first] = await store.pending(10);
    await store.decide({ id: first!.id, status: "verified", reviewer: "r@x.test" });
    expect((await store.verified(key)).map((q) => q.question)).toEqual(["¿Por qué no usó un muestreo probabilístico?"]);
    expect(await store.countVerified(key)).toBe(1);
  });
});
