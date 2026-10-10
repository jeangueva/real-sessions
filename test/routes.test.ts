import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
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

  it("sends the protective headers on every response", async () => {
    // Framing and MIME sniffing are cheap to rule out and easy to forget on a
    // route added later, so this checks a public route and an unknown one.
    for (const response of [await api.call("/api/voice/config"), await api.call("/api/nope")]) {
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toBe("frame-ancestors 'none'");
      expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    }
  });

  /**
   * `/api/auth` used to hand an anonymous identity to anyone who asked, and
   * every protected route accepted it. It answers 410 now — a message rather
   * than a 404, so a client still running the old flow is told to sign in
   * instead of being handed the single-page app's HTML where it expected
   * JSON.
   */
  it("no longer hands out an identity to whoever asks", async () => {
    expect((await api.call("/api/auth", post({}))).status).toBe(410);
    // And without one, a protected route refuses rather than inventing a caller.
    expect((await api.call("/api/history")).status).toBe(401);
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

  it("keeps the employer asked for on the free plan, since preparing is free", async () => {
    api.provider.reply("Opener.");
    const body = await api.json<{
      context: { companyName: string; generic: boolean; targetRole: string };
    }>(
      "/api/sessions",
      post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Stripe",
        interviewStage: "Behavioral",
      }),
    );
    expect(body.context.companyName).toBe("Stripe");
    expect(body.context.generic).toBe(false);
    expect(body.context.targetRole).toBe("Growth PM");
  });

  it("reports the real employer on the paid plan", async () => {
    await api.makePremium();
    api.provider.reply("Opener.");
    const body = await api.json<{ context: { companyName: string; generic: boolean } }>(
      "/api/sessions",
      post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Stripe",
        interviewStage: "Behavioral",
      }),
    );
    expect(body.context.companyName).toBe("Stripe");
    expect(body.context.generic).toBe(false);
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

  it("keeps the employer, the metrics and the next steps: preparing is free", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({ candidateName: "X", targetRole: "Growth PM", companyName: "Nubank", interviewStage: "Behavioral" }),
    );
    api.provider.reply("Done. [INTERVIEW_COMPLETE]");
    await api.call(`/api/sessions/${started.sessionId}/answers`, post({ answer: "A." }));
    const result = await api.json<{ withheld: { metrics: boolean; nextSteps: boolean } }>(
      `/api/sessions/${started.sessionId}/evaluation`,
      post({}),
    );
    expect(result.withheld).toEqual({ metrics: false, nextSteps: false });
    const history = await api.json<{ sessions: { company: string }[] }>("/api/history");
    expect(history.sessions[0]!.company).toBe("Nubank");
  });

  it("allows live coaching and a CV upload", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({ candidateName: "X", targetRole: "Growth PM", companyName: "Nubank", interviewStage: "Behavioral" }),
    );
    await api.call(`/api/sessions/${started.sessionId}/answers`, post({ answer: "A." }));
    expect((await api.call(`/api/sessions/${started.sessionId}/coach`, post({}))).status).not.toBe(402);
    const form = new FormData();
    form.append("file", new File(["a CV, at length"], "cv.txt", { type: "text/plain" }));
    expect((await api.call("/api/context/document", { method: "POST", body: form })).status).not.toBe(402);
  });

  it("refuses a scene from the job itself with a 402: that is the paid plan", async () => {
    const response = await api.call(
      "/api/sessions",
      post({ candidateName: "X", targetRole: "Growth PM", companyName: "Nubank", interviewStage: "Client status call", stages: ["client-call"] }),
    );
    expect(response.status).toBe(402);
    expect(((await response.json()) as { code: string }).code).toBe("paidOnly");
  });

  it("runs a scene from the job itself on the paid plan, as a colleague rather than an interviewer", async () => {
    await api.makePremium();
    api.provider.reply("Hi, where are we on the project?");
    const response = await api.call(
      "/api/sessions",
      post({ candidateName: "X", targetRole: "Growth PM", companyName: "Nubank", interviewStage: "Client status call", stages: ["client-call"] }),
    );
    expect(response.status).toBe(201);
    const prompt = api.provider.prompts.at(-1) ?? "";
    expect(prompt).toContain("This is not a job interview");
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

  it("does not upgrade an account whose address is unconfirmed", async () => {
    const address = "unconfirmed-grant@b.com";
    await api.call("/api/early-access", post({ email: address, role: "PM" }));
    await api.authenticate();
    await api.call(
      "/api/accounts",
      post({ email: address, password: "a long enough passphrase" }),
    );

    // The grant is proof of control over the inbox, not knowledge of its address.
    const plan = await api.json<{ plan: string }>("/api/plan");
    expect(plan.plan).toBe("free");
  });

  it("upgrades the account once its address is confirmed", async () => {
    const address = "confirmed-grant@b.com";
    await api.call("/api/early-access", post({ email: address, role: "PM" }));
    await api.authenticate();
    await api.call(
      "/api/accounts",
      post({ email: address, password: "a long enough passphrase" }),
    );

    const token = api.mailer.tokenFor(address);
    expect(token).toBeTruthy();
    const verified = await api.call("/api/auth/verify", post({ token }));
    expect(verified.status).toBe(200);
    expect((await verified.json()) as { earlyAccess: boolean }).toMatchObject({
      earlyAccess: true,
    });

    const plan = await api.json<{ plan: string }>("/api/plan");
    expect(plan.plan).toBe("premium");
  });

  it("does not grant the same address twice", async () => {
    const address = "single-grant@b.com";
    await api.call("/api/early-access", post({ email: address, role: "PM" }));
    await api.authenticate();
    await api.call(
      "/api/accounts",
      post({ email: address, password: "a long enough passphrase" }),
    );
    await api.call("/api/auth/verify", post({ token: api.mailer.tokenFor(address) }));
    expect((await api.json<{ plan: string }>("/api/plan")).plan).toBe("premium");

    api.forget();
    await api.authenticate();
    // Accounts are unique by address, so a second identity cannot claim it.
    expect(
      (await api.call(
        "/api/accounts",
        post({ email: address, password: "another long enough passphrase" }),
      )).status,
    ).toBe(409);
  });

  it("mails the address when its free months start", async () => {
    const address = "unlocked-mail@b.com";
    const started = () =>
      api.mailer.sent.some(
        (message) => message.to === address && /free months have started/i.test(message.subject),
      );
    await api.call("/api/early-access", post({ email: address, role: "PM" }));
    await api.authenticate();
    await api.call(
      "/api/accounts",
      post({ email: address, password: "a long enough passphrase" }),
    );
    expect(started()).toBe(false);

    await api.call("/api/auth/verify", post({ token: api.mailer.tokenFor(address) }));
    expect(started()).toBe(true);
  });

  describe("closing", () => {
    afterEach(() => {
      delete process.env.REALSESSIONS_EARLY_ACCESS_CLOSES_AT;
    });

    it("reports an offer with no end when no date is configured", async () => {
      const state = await api.json<{ open: boolean; closesAt: string | null; months: number }>(
        "/api/early-access",
      );
      expect(state).toMatchObject({ open: true, closesAt: null, months: 6 });
    });

    it("tells the landing page when it closes, and takes addresses until then", async () => {
      const closesAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      process.env.REALSESSIONS_EARLY_ACCESS_CLOSES_AT = closesAt;

      const state = await api.json<{ open: boolean; closesAt: string | null }>("/api/early-access");
      expect(state).toMatchObject({ open: true, closesAt });
      expect(
        (await api.call("/api/early-access", post({ email: "before@b.com", role: "PM" }))).status,
      ).toBe(202);
    });

    it("stops recording addresses once it has closed", async () => {
      // The countdown is only honest if the server refuses at the same moment.
      process.env.REALSESSIONS_EARLY_ACCESS_CLOSES_AT = new Date(Date.now() - 1000).toISOString();
      expect((await api.json<{ open: boolean }>("/api/early-access")).open).toBe(false);

      const refused = await api.call(
        "/api/early-access",
        post({ email: "late@b.com", role: "PM" }),
      );
      expect(refused.status).toBe(410);
      expect(api.mailer.sent.some((message) => message.to === "late@b.com")).toBe(false);

      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "late@b.com", password: "a long enough passphrase" }),
      );
      await api.call("/api/auth/verify", post({ token: api.mailer.tokenFor("late@b.com") }));
      expect((await api.json<{ plan: string }>("/api/plan")).plan).toBe("free");
    });
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

describe("billing", () => {
  /**
   * A clean slate, because `env.ts` loads the developer's own `.env`.
   *
   * The two tests below assert what an unconfigured deployment answers, and
   * they were passing by accident: nobody's `.env` happened to set
   * `MERCADOPAGO_MODE`. The moment one did, they failed on that machine and
   * stayed green in CI — a test that reports the state of the person running
   * it rather than the state of the code. Every test that wants credentials
   * sets its own below.
   */
  beforeEach(() => {
    for (const key of [
      "MERCADOPAGO_ACCESS_TOKEN",
      "MERCADOPAGO_PUBLIC_KEY",
      "MERCADOPAGO_MODE",
      "MERCADOPAGO_LIVE",
      "MERCADOPAGO_AMOUNT",
      "MERCADOPAGO_CURRENCY",
    ]) {
      delete process.env[key];
    }
    return api.authenticate();
  });

  it("reports itself unconfigured rather than half-working", async () => {
    // No access token and no price on this deployment. The client uses this to
    // hide the upgrade button instead of offering a checkout that 500s.
    const body = await api.json<{ configured: boolean; subscription: unknown }>(
      "/api/billing",
    );
    expect(body.configured).toBe(false);
    expect(body.subscription).toBeNull();
  });

  it("refuses a checkout when payments are not set up", async () => {
    const response = await api.call("/api/billing/checkout", post({}));
    expect(response.status).toBe(503);
  });

  it("refuses a checkout until the deployment says which credentials it holds", async () => {
    // Fully configured, priced, and still refused: Mercado Pago issues
    // APP_USR- credentials for the sandbox and for production alike, so
    // nobody — including this server — can tell from the token whether a
    // click would take money.
    const before = { ...process.env };
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-123456789";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";
    delete process.env.MERCADOPAGO_MODE;
    delete process.env.MERCADOPAGO_LIVE;
    try {
      const response = await api.call("/api/billing/checkout", post({}));
      expect(response.status).toBe(503);
      expect(((await response.json()) as { error: string }).error).toContain(
        "MERCADOPAGO_MODE",
      );

      // And the UI is told, so it hides the button rather than offering one
      // that fails.
      const state = await api.json<{ configured: boolean }>("/api/billing");
      expect(state.configured).toBe(false);
    } finally {
      process.env = before;
    }
  });

  it("reports itself configured, and says it is a sandbox, once the mode is set", async () => {
    const before = { ...process.env };
    process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-123456789";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";
    process.env.MERCADOPAGO_MODE = "test";
    try {
      const state = await api.json<{ configured: boolean; mode: string }>("/api/billing");
      expect(state.configured).toBe(true);
      // The page needs this: a sandbox and the real thing are otherwise
      // indistinguishable to whoever is looking at the screen.
      expect(state.mode).toBe("test");
    } finally {
      process.env = before;
    }
  });

  it("has nothing to cancel before anyone subscribes", async () => {
    expect((await api.call("/api/billing/cancel", post({}))).status).toBe(404);
  });

  it("puts the payer on the paid plan without waiting for a webhook", async () => {
    /**
     * The card is authorized, the money is taken, and the entitlement used to
     * be granted only when Mercado Pago's notification arrived. A webhook
     * signed with the wrong secret, or one that never reached the service,
     * left a paying customer on the free plan with nothing to point at.
     */
    const before = { ...process.env };
    const realFetch = globalThis.fetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
    process.env.MERCADOPAGO_MODE = "test";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";

    // Mercado Pago echoes back the external_reference it was given, which is
    // how a notification finds its way to an owner. The stub does the same.
    let reference = "";
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
      if (init?.method === "POST" && typeof init.body === "string") {
        reference = String(JSON.parse(init.body).external_reference ?? "");
      }
      const body = {
        id: "mp-live-1",
        status: "authorized",
        external_reference: reference,
        next_payment_date: "2027-01-01T00:00:00.000Z",
      };
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "payer@b.com", password: "a long enough passphrase" }),
      );

      const paid = await api.call("/api/billing/subscribe", post({ cardTokenId: "tok-1" }));
      expect(paid.status).toBe(201);

      // No webhook has been delivered at this point.
      expect((await api.json<{ plan: string }>("/api/plan")).plan).toBe("premium");
    } finally {
      globalThis.fetch = realFetch;
      process.env = before;
    }
  });

  it("settles a hosted checkout when the panel asks, without a webhook", async () => {
    /**
     * The redirect flow leaves a `pending` row and walks the payer to Mercado
     * Pago. Only the webhook turned that into a paid plan — so a notification
     * that was late, lost or refused left someone who had paid looking at
     * "you are on the free plan". Reading the billing panel now asks the
     * provider whenever our own row has not settled.
     */
    const before = { ...process.env };
    const realFetch = globalThis.fetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
    process.env.MERCADOPAGO_MODE = "test";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";

    let reference = "";
    // The checkout is opened as pending, which is what the provider really
    // answers there; every read afterwards finds it authorized, as it would
    // be once the payer finishes paying.
    let opened = false;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
      if (init?.method === "POST" && typeof init.body === "string") {
        reference = String(JSON.parse(init.body).external_reference ?? "");
      }
      const creating = init?.method === "POST";
      if (creating) opened = true;
      const body = {
        id: "mp-hosted-1",
        status: creating ? "pending" : "authorized",
        external_reference: reference,
        init_point: "https://www.mercadopago.com/checkout/mp-hosted-1",
        next_payment_date: "2027-01-01T00:00:00.000Z",
      };
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "redirected@b.com", password: "a long enough passphrase" }),
      );

      const started = await api.call("/api/billing/checkout", post({}));
      expect(started.status).toBe(201);
      expect(opened).toBe(true);

      // What the payer's browser does when Mercado Pago sends them back: the
      // panel settles first, then reads.
      const settled = await api.call("/api/billing/reconcile", post({}));
      expect(settled.status).toBe(200);
      expect(((await settled.json()) as { plan: string }).plan).toBe("premium");

      const state = await api.json<{ subscription: { status: string } | null }>(
        "/api/billing",
      );
      expect(state.subscription?.status).toBe("authorized");
      expect((await api.json<{ plan: string }>("/api/plan")).plan).toBe("premium");
    } finally {
      globalThis.fetch = realFetch;
      process.env = before;
    }
  });

  it("keeps serving the billing panel when the provider is unreachable", async () => {
    // A panel that fails to render because Mercado Pago is down is a worse
    // answer than one showing a status a few minutes stale.
    const before = { ...process.env };
    const realFetch = globalThis.fetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
    process.env.MERCADOPAGO_MODE = "test";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";

    let calls = 0;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
      calls += 1;
      if (calls === 1) {
        const body = {
          id: "mp-hosted-2",
          status: "pending",
          external_reference: "",
          init_point: "https://www.mercadopago.com/checkout/mp-hosted-2",
        };
        return {
          ok: true, status: 200,
          json: async () => body,
          text: async () => JSON.stringify(body),
        } as unknown as Response;
      }
      throw new Error("provider unreachable");
    }) as typeof fetch;

    try {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "stranded@b.com", password: "a long enough passphrase" }),
      );
      expect((await api.call("/api/billing/checkout", post({}))).status).toBe(201);

      // Settling says plainly that it could not reach the provider…
      expect((await api.call("/api/billing/reconcile", post({}))).status).toBe(502);
      const attempted = calls;

      // …and the read behind it is untouched by that, because it no longer
      // talks to the provider at all. That is what lets the panel draw a
      // stale row instead of nothing while Mercado Pago is down.
      const response = await api.call("/api/billing");
      expect(response.status).toBe(200);
      const state = (await response.json()) as { subscription: { status: string } | null };
      expect(state.subscription?.status).toBe("pending");
      // The read cost nothing upstream. Before the refactor it would have
      // reached the provider itself, and this number would have moved.
      expect(calls).toBe(attempted);
    } finally {
      globalThis.fetch = realFetch;
      process.env = before;
    }
  });

  it("sends the payer back to the tab that settles their subscription", async () => {
    /**
     * Settings opens on Appearance without a fragment, and the panel that
     * asks the provider whether a payment landed only mounts on the plan tab.
     * Returned to a bare `/app/settings`, a payer would land on the wrong
     * tab, nothing would ask anything, and they would sit on `pending` with
     * the money gone until a webhook that may never arrive.
     */
    const before = { ...process.env };
    const realFetch = globalThis.fetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
    process.env.MERCADOPAGO_MODE = "test";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";
    process.env.REALSESSIONS_SITE_URL = "https://www.getmockio.com";

    let sent: Record<string, unknown> = {};
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
      if (typeof init?.body === "string") sent = JSON.parse(init.body);
      const body = {
        id: "mp-back-1",
        status: "pending",
        init_point: "https://www.mercadopago.com/checkout/mp-back-1",
      };
      return {
        ok: true, status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "returning@b.com", password: "a long enough passphrase" }),
      );
      expect((await api.call("/api/billing/checkout", post({}))).status).toBe(201);
      expect(sent["back_url"]).toBe("https://www.getmockio.com/app/settings#plan");
    } finally {
      globalThis.fetch = realFetch;
      process.env = before;
    }
  });

  it("does not ask the provider about a subscription it cannot change", async () => {
    // `cancelled` is terminal. Reconciling it would put a round-trip on every
    // load of the plan panel, for someone who left months ago, that can never
    // change the answer.
    const before = { ...process.env };
    const realFetch = globalThis.fetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
    process.env.MERCADOPAGO_MODE = "test";
    process.env.MERCADOPAGO_AMOUNT = "9";
    process.env.MERCADOPAGO_CURRENCY = "ARS";

    let calls = 0;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
      calls += 1;
      const creating = init?.method === "POST" && url.endsWith("/preapproval");
      const body = {
        id: "mp-gone-1",
        status: creating ? "pending" : "cancelled",
        init_point: "https://www.mercadopago.com/checkout/mp-gone-1",
      };
      return {
        ok: true, status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: "departed@b.com", password: "a long enough passphrase" }),
      );
      expect((await api.call("/api/billing/checkout", post({}))).status).toBe(201);
      // Settle once: pending becomes cancelled at the provider.
      expect((await api.call("/api/billing/reconcile", post({}))).status).toBe(200);
      const after = calls;
      // Every load from here on must cost nothing upstream.
      expect((await api.call("/api/billing/reconcile", post({}))).status).toBe(200);
      expect((await api.call("/api/billing/reconcile", post({}))).status).toBe(200);
      expect(calls).toBe(after);
    } finally {
      globalThis.fetch = realFetch;
      process.env = before;
    }
  });

  describe("the provider's own reason for a refusal", () => {
    /**
     * Two conditions guard it, and the point is that they have to agree.
     *
     * The reason is what makes a sandbox debuggable — a wrong test card, a
     * currency the account cannot take, credentials from two applications all
     * arrive as "declined" without it. It is also a list of which cards the
     * provider refused and why, which is worth having to someone working
     * through stolen ones. A single environment variable standing between
     * those two readings is one typo in a dashboard.
     */
    const realFetch = globalThis.fetch;
    const refuse = () => {
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = String(input);
        if (!url.includes("api.mercadopago.com")) return realFetch(input, init);
        const body = { message: "back_url is required" };
        return {
          ok: false, status: 400,
          json: async () => body,
          text: async () => JSON.stringify(body),
        } as unknown as Response;
      }) as typeof fetch;
    };

    const attempt = async () => {
      await api.authenticate();
      await api.call(
        "/api/accounts",
        post({ email: `refused${Math.random().toString(36).slice(2)}@b.com`, password: "a long enough passphrase" }),
      );
      const response = await api.call("/api/billing/subscribe", post({ cardTokenId: "tok-1" }));
      return (await response.json()) as { error: string; detail?: string };
    };

    it("explains itself in a sandbox that is not the public site", async () => {
      const before = { ...process.env };
      refuse();
      process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
      process.env.MERCADOPAGO_MODE = "test";
      process.env.MERCADOPAGO_AMOUNT = "9";
      process.env.MERCADOPAGO_CURRENCY = "ARS";
      process.env.REALSESSIONS_SITE_URL = "http://localhost:5173";
      try {
        expect((await attempt()).detail).toContain("back_url is required");
      } finally {
        globalThis.fetch = realFetch;
        process.env = before;
      }
    });

    it("says nothing extra once the mode is live", async () => {
      const before = { ...process.env };
      refuse();
      process.env.MERCADOPAGO_ACCESS_TOKEN = "APP_USR-123456789";
      process.env.MERCADOPAGO_MODE = "live";
      process.env.MERCADOPAGO_AMOUNT = "9";
      process.env.MERCADOPAGO_CURRENCY = "ARS";
      process.env.REALSESSIONS_SITE_URL = "http://localhost:5173";
      try {
        expect((await attempt()).detail).toBeUndefined();
      } finally {
        globalThis.fetch = realFetch;
        process.env = before;
      }
    });

    it("says nothing extra on the public site, whatever the mode claims", async () => {
      // The second lock. A deployment left in test mode by mistake still
      // must not hand the provider's wording to a real candidate.
      const before = { ...process.env };
      refuse();
      process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
      process.env.MERCADOPAGO_MODE = "test";
      process.env.MERCADOPAGO_AMOUNT = "9";
      process.env.MERCADOPAGO_CURRENCY = "ARS";
      process.env.REALSESSIONS_SITE_URL = "https://www.getmockio.com";
      try {
        expect((await attempt()).detail).toBeUndefined();
      } finally {
        globalThis.fetch = realFetch;
        process.env = before;
      }
    });
  });

  describe("the webhook", () => {
    const url = "/api/billing/webhook?data.id=mp-123&type=preapproval";

    it("acknowledges a notification for a subscription that does not exist", async () => {
      /**
       * Mercado Pago's own "test this URL" button sends id 123456. Answering
       * 500 told it to try again — forever, for an id that can never resolve.
       */
      const before = { ...process.env };
      const realFetch = globalThis.fetch;
      process.env.MERCADOPAGO_ACCESS_TOKEN = "TEST-123456789";
      process.env.MERCADOPAGO_MODE = "test";
      process.env.MERCADOPAGO_WEBHOOK_SECRET = "hook-secret";
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const target = String(input);
        if (!target.includes("api.mercadopago.com")) return realFetch(input, init);
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Preapproval not found" }),
          text: async () => "not found",
        } as unknown as Response;
      }) as typeof fetch;

      try {
        const ts = Math.floor(Date.now() / 1000);
        const manifest = `id:123456;request-id:req-1;ts:${ts};`;
        const v1 = createHmac("sha256", "hook-secret").update(manifest).digest("hex");
        const response = await api.call(
          "/api/billing/webhook?data.id=123456&type=subscription_preapproval",
          {
            ...post({ type: "subscription_preapproval", data: { id: "123456" } }),
            headers: {
              "content-type": "application/json",
              "x-request-id": "req-1",
              "x-signature": `ts=${ts},v1=${v1}`,
            },
          },
        );
        expect(response.status).toBe(200);
      } finally {
        globalThis.fetch = realFetch;
        process.env = before;
      }
    });

    it("rejects a notification with no signature", async () => {
      // It is public by necessity — Mercado Pago has no cookie — so the
      // signature is the whole authentication.
      const response = await api.call(url, post({}));
      expect(response.status).toBe(401);
    });

    it("rejects one signed with the wrong secret", async () => {
      const ts = Math.floor(Date.now() / 1000);
      const manifest = `id:mp-123;request-id:req-1;ts:${ts};`;
      const v1 = createHmac("sha256", "wrong-secret").update(manifest).digest("hex");

      const response = await api.call(url, {
        ...post({ data: { id: "mp-123" } }),
        headers: {
          "Content-Type": "application/json",
          "x-signature": `ts=${ts},v1=${v1}`,
          "x-request-id": "req-1",
        },
      });
      expect(response.status).toBe(401);
    });

    it("never reaches the plan without a valid signature", async () => {
      await api.call(url, post({ data: { id: "mp-123", status: "authorized" } }));
      // The body claimed an authorized subscription. Believing it would be a
      // free upgrade for anyone who can POST.
      const plan = await api.json<{ plan: string }>("/api/plan");
      expect(plan.plan).toBe("free");
    });
  });
});

describe("the review queue over HTTP", () => {
  const contributions = () => api.contributions;
  beforeEach(() => api.authenticate());

  it("is invisible to someone who is not a reviewer", async () => {
    // 404, not 403: whether this deployment even has a queue is not something
    // to confirm to everyone who asks.
    expect((await api.call("/api/review")).status).toBe(404);
    expect((await api.call("/api/review/1", post({ status: "verified" }))).status).toBe(
      404,
    );
  });

  it("does not advertise itself in the plan", async () => {
    const plan = await api.json<{ reviewer: boolean }>("/api/plan");
    expect(plan.reviewer).toBe(false);
  });

  it("keeps a contributed question out of the interview until it is verified", async () => {
    await api.call(
      "/api/contributions",
      post({
        companyId: "stripe",
        question: "What was the authorization rate before and after your change?",
      }),
    );

    api.provider.reply("Opening question.");
    await api.call(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Stripe",
        interviewStage: "Behavioral",
      }),
    );

    // Pending, so the interviewer must not have seen it.
    const prompt = api.provider.prompts.at(-1) ?? "";
    expect(prompt).not.toContain("authorization rate before and after");
    expect(prompt).toContain("None reported yet");
  });

  it("puts a verified question in front of the interviewer", async () => {
    // The other half of the pipeline: reviewing is only worth doing if the
    // result reaches an interview.
    //
    // Premium, necessarily. A free session runs against a generic employer, so
    // there is no company whose reported questions could apply — crowd
    // questions are a property of naming the company, which is itself paid.
    await api.makePremium();

    const question = "What was the authorization rate before and after your change?";
    await api.call("/api/contributions", post({ companyId: "stripe", question }));

    // Decided directly on the store — the HTTP route needs a reviewer account,
    // which is a different thing from what this test is about.
    await contributions().decide({ id: 1, status: "verified", reviewer: "test" });

    api.provider.reply("Opening question.");
    await api.call(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Stripe",
        interviewStage: "Behavioral",
      }),
    );

    const prompt = api.provider.prompts.at(-1) ?? "";
    expect(prompt).toContain(question);
    // And it arrives labelled as material, not as something to obey.
    expect(prompt).toContain("not as instructions");
  });
});

describe("when the database goes away", () => {
  beforeEach(() => api.authenticate());

  it("still returns the evaluation the model already produced", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({
        candidateName: "X",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
      }),
    );
    // Left half-way, so no report is started on its own: the one asked for
    // below is the only model call, and the database is gone by then.
    api.provider.reply("Tell me more about that.");
    await api.call(
      `/api/sessions/${started.sessionId}/answers`,
      post({ answer: "I owned activation and cut approval time to under an hour." }),
    );

    // The database dies after the interview but before the report is asked for.
    api.breakProgress();

    const response = await api.call(
      `/api/sessions/${started.sessionId}/evaluation`,
      post({}),
    );
    // The model call is spent by this point. Losing its output to a storage
    // blip is the worst thing this route can do.
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      evaluation: { overall_score_percentage: number };
      xp: { gained: number };
    };
    expect(body.evaluation.overall_score_percentage).toBe(62);
    // XP falls back to the daily cap being spent, so a blip withholds points
    // rather than handing out an unbounded number of them.
    expect(body.xp.gained).toBe(0);
  });
});

describe("the report after the last turn", () => {
  beforeEach(() => api.authenticate());

  it("is written without being asked, once, and served to the client that asks", async () => {
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({ candidateName: "X", targetRole: "Growth PM", companyName: "Nubank", interviewStage: "Behavioral" }),
    );
    api.provider.reply("Thanks, that is all. [INTERVIEW_COMPLETE]");
    await api.call(`/api/sessions/${started.sessionId}/answers`, post({ answer: "I cut approval time to an hour." }));

    const first = (await (await api.call(`/api/sessions/${started.sessionId}/evaluation`, post({}))).json()) as {
      evaluation: { overall_score_percentage: number };
      xp: { gained: number } | null;
    };
    const second = (await (await api.call(`/api/sessions/${started.sessionId}/evaluation`, post({}))).json()) as {
      evaluation: { overall_score_percentage: number };
      xp: { gained: number } | null;
    };
    expect(first.evaluation.overall_score_percentage).toBe(second.evaluation.overall_score_percentage);
    // The same result, not a second scoring: XP is granted once.
    expect(second.xp?.gained ?? 0).toBe(first.xp?.gained ?? 0);
  });
});

describe("the interviewer's voice", () => {
  const realFetch = globalThis.fetch;
  const KEY = process.env.DEEPGRAM_API_KEY;

  /**
   * Intercepts Deepgram only.
   *
   * The harness itself talks to the server over `fetch`, so a blanket stub
   * would break every call in this block. Everything that is not Deepgram is
   * handed straight back to the real implementation.
   */
  function stubDeepgram(reply: { ok: boolean; body?: Uint8Array } = { ok: true }) {
    const seen: string[] = [];
    globalThis.fetch = (async (
      input: Parameters<typeof fetch>[0],
      init?: RequestInit,
    ) => {
      const url = String(input);
      if (!url.includes("api.deepgram.com")) return realFetch(input, init);
      seen.push(url);
      return {
        ok: reply.ok,
        status: reply.ok ? 200 : 500,
        arrayBuffer: async () => (reply.body ?? new Uint8Array([7, 7, 7])).buffer,
        text: async () => "",
      } as unknown as Response;
    }) as typeof fetch;
    return seen;
  }

  beforeEach(() => {
    process.env.DEEPGRAM_API_KEY = "test-key";
    return api.authenticate();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    if (KEY === undefined) delete process.env.DEEPGRAM_API_KEY;
    else process.env.DEEPGRAM_API_KEY = KEY;
  });

  it("returns audio for a phrase", async () => {
    stubDeepgram({ ok: true, body: new Uint8Array([1, 2, 3, 4]) });
    const response = await api.call(
      "/api/voice/speak",
      post({ text: "Tell me about a tradeoff.", personaId: "skeptic" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  it("maps the persona to its voice on the server", async () => {
    // The client never names a model. If it could, the account's key would be
    // pointed wherever a caller liked.
    const seen = stubDeepgram();
    await api.call(
      "/api/voice/speak",
      post({ text: "Hello.", personaId: "systems", model: "aura-2-thalia-en" }),
    );
    expect(seen[0]).toContain("aura-2-draco-en");
    expect(seen[0]).not.toContain("aura-2-thalia-en");
  });

  it("falls back to the default interviewer for an unknown persona", async () => {
    const seen = stubDeepgram();
    const response = await api.call(
      "/api/voice/speak",
      post({ text: "Hello.", personaId: "nobody" }),
    );
    expect(response.status).toBe(200);
    expect(seen[0]).toContain("aura-2-orion-en");
  });

  it("refuses an empty phrase", async () => {
    const seen = stubDeepgram();
    expect((await api.call("/api/voice/speak", post({ text: "  " }))).status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it("refuses a phrase past the cap without calling the provider", async () => {
    const seen = stubDeepgram();
    const response = await api.call(
      "/api/voice/speak",
      post({ text: "a".repeat(5000) }),
    );
    expect(response.status).toBe(400);
    expect(seen).toHaveLength(0);
  });

  it("answers 502 when the provider fails, so the client can fall back", async () => {
    stubDeepgram({ ok: false });
    const response = await api.call("/api/voice/speak", post({ text: "Hello." }));
    expect(response.status).toBe(502);
    // The provider's own message can carry account detail and stays server-side.
    expect(await response.text()).not.toContain("deepgram");
  });

  it("answers 503 when no key is configured", async () => {
    delete process.env.DEEPGRAM_API_KEY;
    const response = await api.call("/api/voice/speak", post({ text: "Hello." }));
    expect(response.status).toBe(503);
  });

  it("sits behind the authentication gate", async () => {
    // The server is a module singleton, so a second harness cannot listen.
    // Dropping the cookie is how an anonymous caller is expressed here.
    api.forget();
    const response = await api.call("/api/voice/speak", post({ text: "Hi." }));
    expect(response.status).toBe(401);
  });

  it("reports whether a real voice is available", async () => {
    const body = await api.json<{ live: boolean; speech: boolean }>(
      "/api/voice/config",
    );
    expect(body.speech).toBe(true);
  });
});

describe("sharing a report", () => {
  it("lets a free account share the whole report", async () => {
    // Sharing is how a stranger first hears of the product, so it is on
    // both plans — and since the report is free now, so is all of it.
    await api.authenticate();
    const id = await completeInterview(api);
    const response = await api.call(`/api/history/${id}/share`, post({}));
    expect(response.status).toBe(200);
    const { shared } = (await response.json()) as { shared: { token: string } };

    api.forget();
    const { report } = await api.json<{
      report: { metrics: unknown; evaluation: { actionable_next_steps: unknown[] } | null };
    }>(`/api/shared/${shared.token}`);
    expect(report.evaluation).toBeTruthy();
    expect(report.evaluation?.actionable_next_steps.length).toBeGreaterThan(0);
  });

  it("gives a premium owner's link the whole report", async () => {
    await api.authenticate();
    await api.makePremium();
    const id = await completeInterview(api);
    const { shared } = await api.json<{ shared: { token: string } }>(
      `/api/history/${id}/share`,
      post({}),
    );
    api.forget();
    const { report } = await api.json<{
      report: { evaluation: { actionable_next_steps: unknown[] } | null };
    }>(`/api/shared/${shared.token}`);
    expect(report.evaluation?.actionable_next_steps.length).toBeGreaterThan(0);
  });

  it("serves a shared report to a caller with no identity at all", async () => {
    await api.authenticate();
    await api.makePremium();
    const id = await completeInterview(api);
    const { shared } = await api.json<{ shared: { token: string; url: string } }>(
      `/api/history/${id}/share`,
      post({}),
    );
    expect(shared.url).toContain(`/r/${shared.token}`);

    // The whole point: a reader who has never been here.
    api.forget();
    const response = await api.call(`/api/shared/${shared.token}`);
    expect(response.status).toBe(200);
    const { report } = (await response.json()) as { report: Record<string, unknown> };
    expect(report.company).toBe("Nubank");
    expect(report.evaluation).toBeTruthy();
  });

  it("gives a stranger the report and nothing else", async () => {
    await api.authenticate();
    await api.makePremium();
    const id = await completeInterview(api);
    const { shared } = await api.json<{ shared: { token: string } }>(
      `/api/history/${id}/share`,
      post({}),
    );
    api.forget();
    const { report } = await api.json<{ report: Record<string, unknown> }>(
      `/api/shared/${shared.token}`,
    );
    // The guard on `publicReport` being a whitelist. If a field is ever added
    // to the session and reaches this without being written down there, this
    // is what fails.
    expect(Object.keys(report).sort()).toEqual(
      ["company", "completedAt", "evaluation", "metrics", "role", "score", "stage"],
    );
    // Named individually too, because the list above is only as good as its
    // author and these three are the ones that would actually hurt.
    expect(report).not.toHaveProperty("ownerId");
    expect(report).not.toHaveProperty("turns");
    expect(report).not.toHaveProperty("id");
  });

  it("stops serving the report once the link is revoked", async () => {
    await api.authenticate();
    await api.makePremium();
    const id = await completeInterview(api);
    const { shared } = await api.json<{ shared: { token: string } }>(
      `/api/history/${id}/share`,
      post({}),
    );
    expect((await api.call(`/api/history/${id}/share`, { method: "DELETE" })).status).toBe(200);
    api.forget();
    expect((await api.call(`/api/shared/${shared.token}`)).status).toBe(404);
  });

  it("answers a fabricated token the same way as a revoked one", async () => {
    const response = await api.call("/api/shared/not-a-real-token");
    expect(response.status).toBe(404);
  });

  it("will not let one account share another's session", async () => {
    await api.authenticate();
    await api.makePremium();
    const id = await completeInterview(api);

    api.forget();
    await api.authenticate();
    await api.makePremium();
    const response = await api.call(`/api/history/${id}/share`, post({}));
    expect(response.status).toBe(404);
  });
});

describe("tracking applications", () => {
  async function paid() {
    await api.authenticate();
    await api.makePremium();
  }

  async function create(body: Record<string, unknown> = {}) {
    return api.json<{ application: { id: string; status: string; posting: string | null } }>(
      "/api/applications",
      post({ company: "Nubank", role: "Growth PM", ...body }),
    );
  }

  it("is open on the free plan: tracking a search is part of preparing", async () => {
    await api.authenticate();
    expect((await api.call("/api/applications")).status).toBe(200);
  });

  it("keeps a posting and moves the row through its states", async () => {
    await paid();
    const { application } = await create({
      posting: "We need a PM who has owned activation.",
    });
    expect(application.status).toBe("interested");
    expect(application.posting).toContain("owned activation");

    const moved = await api.json<{ application: { status: string } }>(
      `/api/applications/${application.id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "interviewing" }) },
    );
    expect(moved.application.status).toBe("interviewing");
  });

  it("answers a status it does not know with a 400, not a 500", async () => {
    await paid();
    const { application } = await create();
    // The column has a CHECK constraint, so an unchecked value would surface
    // as a database error rather than as the bad request it is.
    const response = await api.call(`/api/applications/${application.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ghosted" }),
    });
    expect(response.status).toBe(400);
  });

  it("requires a company and a role", async () => {
    await paid();
    const response = await api.call("/api/applications", post({ company: "  ", role: "" }));
    expect(response.status).toBe(400);
  });

  it("counts a rehearsal against the application it was started for", async () => {
    await paid();
    const { application } = await create({ posting: "Own activation end to end." });

    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
        applicationId: application.id,
      }),
    );
    expect(started.sessionId).toBeTruthy();

    const { applications } = await api.json<{
      applications: { id: string; sessions: number; bestScore: number | null }[];
    }>("/api/applications");
    const [row] = applications;
    expect(row?.id).toBe(application.id);
    expect(row?.sessions).toBe(1);
    // Started, not finished: nothing to score yet.
    expect(row?.bestScore).toBeNull();
  });

  it("ignores an application id belonging to somebody else", async () => {
    await paid();
    const { application } = await create();

    api.forget();
    await paid();
    // The stranger's interview still runs — it simply rehearses for nothing,
    // rather than failing or quietly reading somebody else's posting.
    const started = await api.json<{ sessionId: string }>(
      "/api/sessions",
      post({
        candidateName: "Mariana",
        targetRole: "Growth PM",
        companyName: "Nubank",
        interviewStage: "Behavioral",
        applicationId: application.id,
      }),
    );
    expect(started.sessionId).toBeTruthy();
    expect((await api.json<{ applications: unknown[] }>("/api/applications")).applications).toEqual([]);
  });

  it("does not put the paywall in front of deleting", async () => {
    // A free account cannot create one, so there is nothing of theirs to
    // delete — but the gate must not be what stops them, because somebody
    // whose subscription lapsed still has rows they wrote and must be able to
    // take them down. Ungated on purpose, the same way revoking a share is.
    await api.authenticate();
    const response = await api.call(`/api/applications/${randomUUID()}`, {
      method: "DELETE",
    });
    expect(response.status).not.toBe(402);
    expect(response.status).toBe(200);
  });
});

describe("choosing how often to be charged", () => {
  it("refuses a cycle it does not know rather than guessing", async () => {
    await api.authenticate();
    const response = await api.call(
      "/api/billing/checkout",
      post({ cycle: "fortnightly" }),
    );
    /**
     * Of the two ways to guess, both are unacceptable: "yearly" read as
     * monthly charges a twelfth of what somebody agreed to, and the reverse
     * charges twelve times. So nothing is read as anything.
     */
    expect(response.status).toBe(400);
  });

  it("still takes a payment from a client that says nothing about cycles", async () => {
    await api.authenticate();
    // Absent means monthly, so an older page keeps working.
    const response = await api.call("/api/billing/subscribe", post({ cardTokenId: "" }));
    // Whatever it fails on next — a missing token, or payments being off in
    // this harness — it is not the cycle. That is the whole assertion.
    const body = (await response.json()) as { error?: string };
    expect(body.error ?? "").not.toMatch(/billing cycle/i);
  });
});

describe("promotion codes", () => {
  const CODE = "EARLY100";
  const ADDRESS = "promo-user@example.com";
  const PASSPHRASE = "a long enough passphrase";

  beforeEach(() => {
    process.env.REALSESSIONS_PROMO_CODES = `${CODE}:30:100`;
  });
  afterEach(() => {
    delete process.env.REALSESSIONS_PROMO_CODES;
  });

  /** An account whose address has been proved, which the route requires. */
  async function verified() {
    await api.call("/api/accounts", post({ email: ADDRESS, password: PASSPHRASE }));
    await api.call("/api/auth/verify", post({ token: api.mailer.tokenFor(ADDRESS) }));
  }

  it("will not take a code from an unconfirmed address", async () => {
    await api.call("/api/accounts", post({ email: ADDRESS, password: PASSPHRASE }));
    const response = await api.call("/api/billing/promo", post({ code: CODE }));
    /**
     * Otherwise one person makes a hundred throwaway accounts and takes every
     * seat of a hundred-seat promotion, and the people it was meant for find
     * it sold out.
     */
    expect(response.status).toBe(403);
  });

  it("grants the paid plan to somebody who confirmed theirs", async () => {
    await verified();
    await api.plans.definePromo({ code: CODE, grantDays: 30, cap: 100, expiresAt: null });

    const response = await api.call("/api/billing/promo", post({ code: "  early100 " }));
    // Typed in lower case with a stray space, as people do.
    expect(response.status).toBe(200);
    expect((await api.json<{ plan: string }>("/api/plan")).plan).toBe("premium");
  });

  it("says a code is unknown rather than pretending it worked", async () => {
    await verified();
    const response = await api.call("/api/billing/promo", post({ code: "NOPE" }));
    expect(response.status).toBe(404);
  });

  it("tells somebody who already used it, in those words", async () => {
    await verified();
    await api.plans.definePromo({ code: CODE, grantDays: 30, cap: 100, expiresAt: null });
    await api.call("/api/billing/promo", post({ code: CODE }));

    const again = await api.call("/api/billing/promo", post({ code: CODE }));
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ reason: "taken" });
  });

  it("says a sold-out code is sold out, not invalid", async () => {
    await verified();
    await api.plans.definePromo({ code: CODE, grantDays: 30, cap: 1, expiresAt: null });
    await api.plans.redeemPromo(CODE, "somebody-else");

    const response = await api.call("/api/billing/promo", post({ code: CODE }));
    // "Not valid" would send them hunting for a typo that is not there.
    expect(await response.json()).toMatchObject({ reason: "full" });
  });
});
