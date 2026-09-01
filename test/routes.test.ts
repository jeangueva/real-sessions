import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completeInterview, post, startHarness, type Harness } from "./support/http.js";

/**
 * The HTTP surface.
 *
 * These cover what unit tests structurally cannot: that a route is reachable at
 * the path and method the client uses, that it sits on the correct side of the
 * authentication gate, that it returns the status the client branches on, and
 * that the plan gates hold against a request rather than only in the type.
 */
let api: Harness;

beforeEach(async () => {
  api = await startHarness();
});

afterEach(async () => {
  await api.stop();
});

describe("the authentication gate", () => {
  it("refuses a protected route without an identity", async () => {
    const response = await api.call("/api/history");
    expect(response.status).toBe(401);
  });

  it("lets the public routes through in front of it", async () => {
    // These are reached before anyone has a cookie. /voice/config in
    // particular was behind the gate at first and 401'd on the first call of
    // every session.
    expect((await api.call("/api/voice/config")).status).toBe(200);
    expect((await api.call("/api/auth/me")).status).toBe(200);
    expect(
      (await api.call("/api/early-access", post({ email: "a@b.com", role: "PM" })))
        .status,
    ).toBe(202);
  });

  it("issues an identity that later requests carry", async () => {
    expect((await api.call("/api/auth", post({}))).status).toBe(201);
    expect((await api.call("/api/history")).status).toBe(200);
  });

  it("reports an unknown route rather than falling through", async () => {
    await api.authenticate();
    expect((await api.call("/api/nope")).status).toBe(404);
  });
});

describe("running an interview", () => {
  beforeEach(() => api.authenticate());

  it("starts one and returns the opening turn", async () => {
    api.provider.reply("Hi Mariana. Tell me about a hard tradeoff.");
    const body = await api.json<{ sessionId: string; turn: { text: string } }>(
      "/api/sessions",
      post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
      }),
    );
    expect(body.sessionId).toBeTruthy();
    expect(body.turn.text).toContain("hard tradeoff");
  });

  it("rejects a payload missing the fields the prompt needs", async () => {
    const response = await api.call("/api/sessions", post({ candidateName: "X" }));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toContain("targetRole");
  });

  it("streams when the client asks for events", async () => {
    api.provider.reply("Streamed opener.");
    const response = await api.call("/api/sessions", {
      ...post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
      }),
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    });

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    // The session id has to arrive before the turn, so a mid-stream failure
    // still leaves the client able to resume.
    expect(body.indexOf("event: session")).toBeLessThan(body.indexOf("event: turn"));
    expect(body).toContain("Streamed opener.");
  });

  it("hides another identity's session behind a 404", async () => {
    const sessionId = await completeInterview(api);

    api.forget();
    await api.authenticate();

    // "Forbidden" would confirm the id exists. The route answers "not found",
    // and the same holds for the answers and evaluation routes.
    expect((await api.call(`/api/history/${sessionId}`)).status).toBe(404);
    expect(
      (await api.call(`/api/sessions/${sessionId}/answers`, post({ answer: "hi" })))
        .status,
    ).toBe(404);
    expect((await api.json<{ sessions: unknown[] }>("/api/history")).sessions).toEqual([]);
  });

  it("refuses an answer for a session that never existed", async () => {
    const response = await api.call(
      "/api/sessions/00000000-0000-4000-8000-000000000000/answers",
      post({ answer: "hello" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("evaluation and history", () => {
  beforeEach(() => api.authenticate());

  it("scores a finished interview and records it", async () => {
    await completeInterview(api);
    const history = await api.json<{ sessions: { score: number }[] }>("/api/history");
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0]!.score).toBe(62);
  });

  it("awards xp and badges for it", async () => {
    await completeInterview(api);
    const profile = await api.json<{ xp: number; level: number; badges: unknown[] }>(
      "/api/profile",
    );
    expect(profile.xp).toBeGreaterThan(0);
    expect(profile.level).toBeGreaterThanOrEqual(1);
    expect(profile.badges.length).toBeGreaterThan(0);
  });

  it("serves the progress series oldest first", async () => {
    await completeInterview(api);
    const progress = await api.json<{ sessions: unknown[]; axes: unknown[] }>(
      "/api/progress",
    );
    // The list view is newest first and the chart is a timeline; they are
    // deliberately different endpoints.
    expect(progress.sessions).toHaveLength(1);
    expect(progress.axes).toHaveLength(1);
  });
});

describe("the free plan, enforced over HTTP", () => {
  beforeEach(() => api.authenticate());

  it("replaces the employer with a generic one", async () => {
    await completeInterview(api);
    const history = await api.json<{ sessions: { company: string }[] }>("/api/history");
    expect(history.sessions[0]!.company).not.toBe("Nubank");
  });

  it("does not let the sector in through the industry field", async () => {
    // The hole this closed: gating the company name alone left `industry`
    // readable from the request, and the interview came back sector-grounded.
    api.provider.reply("Opening question.");
    await api.call(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Nubank",
        industry: "Fintech",
        companyCulture: "Customer love",
        interviewStage: "Behavioral",
      }),
    );
    const prompt = api.provider.prompts.at(-1) ?? "";
    expect(prompt).not.toContain("Fintech");
    expect(prompt).not.toContain("Nubank");
  });

  it("withholds the measured metrics and the next steps", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
      }),
    );
    api.provider.reply("Done. [INTERVIEW_COMPLETE]");
    await api.call(`/api/sessions/${started.sessionId}/answers`, post({ answer: "A." }));

    const result = await api.json<{
      metrics: unknown;
      evaluation: { actionable_next_steps: string[]; overall_score_percentage: number };
      withheld: { metrics: boolean; nextSteps: boolean };
      xp: { gained: number };
    }>(`/api/sessions/${started.sessionId}/evaluation`, post({}));

    expect(result.metrics).toBeNull();
    expect(result.evaluation.actionable_next_steps).toEqual([]);
    expect(result.withheld).toEqual({ metrics: true, nextSteps: true });
    // The honest half survives: score, and the engagement loop.
    expect(result.evaluation.overall_score_percentage).toBe(62);
    expect(result.xp.gained).toBeGreaterThan(0);
  });

  it("withholds them again when the same record is read back from history", async () => {
    const sessionId = await completeInterview(api);
    const detail = await api.json<{
      session: { metrics: unknown; withheld: { metrics: boolean } };
    }>(`/api/history/${sessionId}`);
    expect(detail.session.metrics).toBeNull();
    expect(detail.session.withheld.metrics).toBe(true);
  });

  it("refuses coaching with a 402 naming the feature", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
      }),
    );
    await api.call(`/api/sessions/${started.sessionId}/answers`, post({ answer: "A." }));

    const response = await api.call(`/api/sessions/${started.sessionId}/coach`, post({}));
    expect(response.status).toBe(402);
    // The client branches on this to show the right upsell.
    expect(((await response.json()) as { feature: string }).feature).toBe("liveCoaching");
  });

  it("refuses a CV upload for the same reason", async () => {
    const form = new FormData();
    form.append("file", new File(["a CV, at length"], "cv.txt", { type: "text/plain" }));
    const response = await api.call("/api/context/document", {
      method: "POST",
      body: form,
    });
    expect(response.status).toBe(402);
  });
});

describe("preferences", () => {
  beforeEach(() => api.authenticate());

  it("round-trips, and echoes back what it clamped", async () => {
    const saved = await api.json<{ preferences: { interviewLength: number } }>(
      "/api/preferences",
      { ...post({ interviewLength: 99, defaultRole: "Backend Engineer" }), method: "PUT" },
    );
    // Echoed rather than accepted silently, so the form shows the clamping.
    expect(saved.preferences.interviewLength).toBe(7);

    const read = await api.json<{ preferences: { defaultRole: string } }>(
      "/api/preferences",
    );
    expect(read.preferences.defaultRole).toBe("Backend Engineer");
  });
});

describe("contributions", () => {
  beforeEach(() => api.authenticate());

  it("stores one as pending", async () => {
    const body = await api.json<{ stored: boolean; message: string }>(
      "/api/contributions",
      post({
        companyId: "stripe",
        question: "Walk me through a tradeoff you defended with a number.",
      }),
    );
    expect(body.stored).toBe(true);
    // The promise on the button is that a person checks it first.
    expect(body.message).toContain("review");
  });

  it("rejects a company outside the catalogue", async () => {
    const response = await api.call(
      "/api/contributions",
      post({ companyId: "not-a-company", question: "A long enough question here." }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a fragment and an essay", async () => {
    const short = await api.call(
      "/api/contributions",
      post({ companyId: "stripe", question: "why?" }),
    );
    expect(short.status).toBe(400);

    const long = await api.call(
      "/api/contributions",
      post({ companyId: "stripe", question: "x".repeat(500) }),
    );
    expect(long.status).toBe(400);
  });

  it("does not store the same question twice from one contributor", async () => {
    const question = "Tell me about a time you shipped without complete data.";
    await api.call("/api/contributions", post({ companyId: "stripe", question }));
    const again = await api.json<{ stored: boolean }>(
      "/api/contributions",
      post({ companyId: "stripe", question }),
    );
    expect(again.stored).toBe(false);
  });
});

describe("early access", () => {
  it("answers the same way whether or not the address is new", async () => {
    const first = await api.json<{ message: string }>(
      "/api/early-access",
      post({ email: "a@b.com", role: "PM", company: "Nubank" }),
    );
    const second = await api.json<{ message: string }>(
      "/api/early-access",
      post({ email: "a@b.com", role: "PM", company: "Nubank" }),
    );
    // A distinct "already registered" would turn an open endpoint into a way
    // to test whether someone signed up.
    expect(second.message).toBe(first.message);
  });

  it("needs an address and a role", async () => {
    expect(
      (await api.call("/api/early-access", post({ role: "PM" }))).status,
    ).toBe(400);
    expect(
      (await api.call("/api/early-access", post({ email: "a@b.com" }))).status,
    ).toBe(400);
  });

  it("upgrades the account that signs up with that address", async () => {
    await api.call("/api/early-access", post({ email: "grant@b.com", role: "PM" }));
    await api.authenticate();

    const created = await api.json<{ earlyAccess: boolean }>(
      "/api/accounts",
      post({ email: "grant@b.com", password: "a long enough passphrase" }),
    );
    expect(created.earlyAccess).toBe(true);

    const plan = await api.json<{ plan: string }>("/api/plan");
    expect(plan.plan).toBe("premium");
  });
});

describe("the catalogue", () => {
  beforeEach(() => api.authenticate());

  it("serves the sectors, companies and personas the pickers need", async () => {
    const body = await api.json<{
      sectors: unknown[];
      companies: unknown[];
      personas: unknown[];
    }>("/api/catalogue");
    expect(body.sectors.length).toBeGreaterThan(0);
    expect(body.companies.length).toBeGreaterThan(0);
    expect(body.personas.length).toBeGreaterThan(0);
  });
});

describe("the two profiles", () => {
  beforeEach(() => api.authenticate());

  it("keeps the gamification profile and the CV on separate paths", async () => {
    // Both lived at /api/profile once. The first match won, so the XP route
    // was unreachable and the Progress screen read the wrong shape.
    const player = await api.json<{ xp: number; badges: unknown[] }>("/api/profile");
    expect(player.xp).toBeTypeOf("number");
    expect(Array.isArray(player.badges)).toBe(true);

    const context = await api.json<{ profile: { brief: string | null } }>("/api/context");
    expect(context.profile).toHaveProperty("brief");
    expect(context.profile).not.toHaveProperty("xp");
  });
});
