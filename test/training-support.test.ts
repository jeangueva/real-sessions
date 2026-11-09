import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { post, startHarness, type Harness } from "./support/http.js";
import { supportConfig } from "../src/support.js";

describe("voluntary support config", () => {
  it("offers $1, $2, $5, $8, $10 and custom amounts with one-time and monthly frequencies", () => {
    const cfg = supportConfig({ REALSESSIONS_SUPPORT_URL: "https://ko-fi.com/mockio" });
    expect(cfg).toEqual({
      url: "https://ko-fi.com/mockio",
      currency: "USD",
      amounts: [1, 2, 5, 8, 10],
      frequencies: ["one-time", "monthly"],
      custom: true,
    });
  });

  it("refuses non-https URLs and embedded credentials", () => {
    expect(supportConfig({ REALSESSIONS_SUPPORT_URL: "http://ko-fi.com/mockio" }).url).toBeNull();
    expect(supportConfig({ REALSESSIONS_SUPPORT_URL: "https://user:pass@ko-fi.com/mockio" }).url).toBeNull();
    expect(supportConfig({}).url).toBeNull();
  });
});

describe("training and support HTTP routes", () => {
  let api: Harness;

  beforeEach(async () => {
    api = await startHarness();
  });

  afterEach(async () => {
    await api.stop();
  });

  it("serves /api/support publicly without requiring authentication", async () => {
    const res = await api.call("/api/support");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { amounts: number[]; frequencies: string[]; custom: boolean };
    expect(body.amounts).toEqual([1, 2, 5, 8, 10]);
    expect(body.frequencies).toEqual(["one-time", "monthly"]);
    expect(body.custom).toBe(true);
  });

  it("serves the education and professional catalogue to authenticated learners", async () => {
    await api.authenticate();
    const catalogue = await api.json<{
      scenarios: Array<{ id: string; domain: string; personal?: boolean }>;
      cultures: Array<{ id: string }>;
      intuition: Array<{ id: string; kind: string; options: string[] }>;
    }>("/api/training/catalogue");

    expect(catalogue.scenarios.some((s) => s.domain === "education")).toBe(true);
    expect(catalogue.scenarios.some((s) => s.domain === "professional" && !s.personal)).toBe(true);
    expect(catalogue.scenarios.some((s) => s.domain === "professional" && s.personal)).toBe(true);
    expect(catalogue.cultures.map((c) => c.id)).toEqual(["neutral", "latam", "north-america"]);
    expect(catalogue.intuition.length).toBeGreaterThanOrEqual(6);
  });

  it("runs a multi-turn conversation rehearsal and returns coaching feedback", async () => {
    await api.authenticate();
    api.provider.reply("Let us ship the whole release on Friday anyway.");
    const started = await api.call(
      "/api/training/conversations",
      post({ scenarioId: "founder-no", culture: "latam", language: "es" }),
    );
    expect(started.status).toBe(201);
    const state1 = (await started.json()) as {
      token: string;
      messages: Array<{ role: string; text: string }>;
      answers: number;
    };
    expect(state1.messages).toHaveLength(1);
    expect(state1.answers).toBe(0);

    api.provider.reply("What smaller option could we ship safely by Friday?");
    const answered = await api.call(
      "/api/training/conversations/answer",
      post({
        token: state1.token,
        answer: "Podemos activar el flujo nuevo solo para cuentas internas mientras estabilizamos los pagos.",
      }),
    );
    expect(answered.status).toBe(200);
    const state2 = (await answered.json()) as { token: string; answers: number };
    expect(state2.answers).toBe(1);

    api.provider.reply(
      JSON.stringify({
        summary: "Planteaste un límite claro y ofreciste una alternativa reversible.",
        strengths: ["Explicaste el riesgo de estabilidad sin confrontar."],
        improvements: ["Confirma quién comunicará el alcance reducido al resto del equipo."],
        suggestedReply: "Activemos primero el piloto interno este viernes y midamos errores hasta el martes.",
        nextPractice: "Practica mantener el límite si la contraparte insiste por segunda vez.",
      }),
    );
    const fb = await api.call(
      "/api/training/conversations/feedback",
      post({ token: state2.token }),
    );
    expect(fb.status).toBe(200);
    const fbBody = (await fb.json()) as { feedback: { summary: string; strengths: string[] } };
    expect(fbBody.feedback.summary).toContain("límite claro");
    expect(fbBody.feedback.strengths).toHaveLength(1);
  });

  it("drafts a scenario from the learner's own words and rehearses the confirmed version", async () => {
    await api.authenticate();
    api.provider.reply(
      JSON.stringify({
        allowed: true,
        scenario: {
          domain: "professional",
          title: "Pedir un aumento",
          role: "Una jefa que valora tu trabajo pero tiene el presupuesto cerrado",
          brief: "Llevas dos años en el puesto y asumiste más responsabilidades. Tu jefa dice que el presupuesto ya está aprobado.",
          goal: "Presentar evidencia concreta y acordar una fecha para revisar el salario.",
        },
      }),
    );
    const drafted = await api.call(
      "/api/training/custom/draft",
      post({ request: "pedirle un aumento a mi jefa", language: "es" }),
    );
    expect(drafted.status).toBe(200);
    const { scenario } = (await drafted.json()) as { scenario: { title: string; role: string } };
    expect(scenario.title).toBe("Pedir un aumento");

    // The learner edits the draft before rehearsing it; the edit is what the
    // partner plays.
    const confirmed = { ...scenario, role: "Una gerente de área con poco tiempo" };
    api.provider.reply("Tengo cinco minutos, ¿de qué querías hablar?");
    const started = await api.call(
      "/api/training/conversations",
      post({ custom: confirmed, culture: "latam", language: "es" }),
    );
    expect(started.status).toBe(201);
    const state = (await started.json()) as { token: string; messages: unknown[] };
    expect(state.messages).toHaveLength(1);
    expect(api.provider.prompts.at(-1)).toContain("Una gerente de área con poco tiempo");
    expect(api.provider.prompts.at(-1)).toContain("written by the learner");

    api.provider.reply("¿Y qué evidencia tienes?");
    const answered = await api.call(
      "/api/training/conversations/answer",
      post({ token: state.token, answer: "Quiero hablar de mi salario." }),
    );
    expect(answered.status).toBe(200);
    expect(api.provider.prompts.at(-1)).toContain("Una gerente de área con poco tiempo");
  });

  it("keeps a described scenario in the workspace it was asked from", async () => {
    await api.authenticate();
    api.provider.reply(
      JSON.stringify({
        allowed: true,
        scenario: {
          domain: "professional",
          title: "Pedir más tiempo",
          role: "Un asesor exigente con poco tiempo",
          brief: "Faltan seis semanas para la entrega y el capítulo 3 no está listo.",
          goal: "Acordar una nueva fecha realista para el capítulo 3.",
        },
      }),
    );
    const res = await api.call(
      "/api/training/custom/draft",
      post({ request: "pedirle a mi asesor más tiempo", language: "es", domain: "education" }),
    );
    expect(res.status).toBe(200);
    const { scenario } = (await res.json()) as { scenario: { domain: string } };
    expect(scenario.domain).toBe("education");
    expect(api.provider.prompts.at(-1)).toContain('"education"');
  });

  it("explains when a described scenario cannot be rehearsed", async () => {
    await api.authenticate();
    api.provider.reply(JSON.stringify({ allowed: false, reason: "Harassment." }));
    const res = await api.call(
      "/api/training/custom/draft",
      post({ request: "asustar a mi vecino para que se mude", language: "es" }),
    );
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toContain("no se puede ensayar");
  });

  it("refuses a rehearsal that names both a catalogue scenario and a custom one", async () => {
    await api.authenticate();
    const res = await api.call(
      "/api/training/conversations",
      post({
        scenarioId: "founder-no",
        custom: { domain: "professional", title: "Otro", role: "Alguien distinto", brief: "Una situación cualquiera.", goal: "Un objetivo cualquiera." },
        language: "es",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("reveals the historical outcome after committing a product/design intuition judgment", async () => {
    await api.authenticate();
    const res = await api.call(
      "/api/training/intuition/reveal",
      post({
        caseId: "case-d",
        choice: 0,
        confidence: 80,
        reasoning: "Mandatory registration before payment blocks first-time buyers at the highest-intent step.",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      recommended: number;
      reveal: { name: string; outcome: string; url: string };
    };
    expect(body.recommended).toBe(0);
    expect(body.reveal.name).toContain("300 Million Button");
    expect(body.reveal.url).toMatch(/^https:\/\//);
  });
});
