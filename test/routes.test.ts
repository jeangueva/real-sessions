import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
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

  it("reports the generic employer it actually ran, not the one asked for", async () => {
    // The free plan replaces the company server-side. Returning the requested
    // name would let the interview screen tell a free candidate they had just
    // rehearsed against Stripe.
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
    expect(body.context.companyName).not.toBe("Stripe");
    expect(body.context.generic).toBe(true);
    // The role survives — that is the whole of what a free session targets.
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
  beforeEach(() => api.authenticate());

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
    api.provider.reply("Done. [INTERVIEW_COMPLETE]");
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
