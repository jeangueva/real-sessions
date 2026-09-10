import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import {
  ResendEmailSender,
  accountDeletedEmail,
  passwordChangedEmail,
  paymentFailedEmail,
  resetEmail,
  subscriptionEndedEmail,
  subscriptionMail,
  subscriptionStartedEmail,
  verifyEmail,
} from "../src/email.js";

/**
 * Drives the sender against a real HTTP server, so the request it actually
 * puts on the wire is asserted rather than assumed. Without a provider key,
 * this is the closest verification available — and it catches the shape
 * mistakes that would otherwise surface as silent non-delivery.
 */
interface Captured {
  method: string;
  auth: string | undefined;
  contentType: string | undefined;
  body: Record<string, unknown>;
}

let server: Server;
let url: string;
let captured: Captured[] = [];
let respond: (attempt: number) => { status: number; body: string };

beforeEach(async () => {
  captured = [];
  respond = () => ({ status: 200, body: '{"id":"sent"}' });

  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      captured.push({
        method: req.method ?? "",
        auth: req.headers.authorization,
        contentType: req.headers["content-type"],
        body: JSON.parse(Buffer.concat(chunks).toString() || "{}"),
      });
      const reply = respond(captured.length - 1);
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(reply.body);
    });
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/emails`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("ResendEmailSender", () => {
  it("sends the request shape the provider expects", async () => {
    const sender = new ResendEmailSender("secret-key", "Mockio <no-reply@x.com>", url);
    await sender.send(resetEmail("mariana@example.com", "https://x.com/reset?token=abc"));

    expect(captured).toHaveLength(1);
    const request = captured[0]!;
    expect(request.method).toBe("POST");
    expect(request.auth).toBe("Bearer secret-key");
    expect(request.contentType).toContain("application/json");
    // `to` is an array in Resend's API — a bare string is silently rejected.
    expect(request.body["to"]).toEqual(["mariana@example.com"]);
    expect(request.body["from"]).toBe("Mockio <no-reply@x.com>");
    expect(String(request.body["subject"])).toMatch(/Reset your/);
    expect(String(request.body["text"])).toContain("https://x.com/reset?token=abc");
  });

  it("retries once on a transient failure", async () => {
    respond = (attempt) =>
      attempt === 0
        ? { status: 429, body: '{"message":"rate limited"}' }
        : { status: 200, body: '{"id":"sent"}' };

    const sender = new ResendEmailSender("k", "a@b.com", url);
    await sender.send(verifyEmail("nina@example.com", "https://x.com/verify?token=t"));

    // A rate limit should not cost someone their only confirmation link.
    expect(captured).toHaveLength(2);
  });

  it("does not retry a rejected request", async () => {
    respond = () => ({ status: 422, body: '{"message":"domain not verified"}' });
    const sender = new ResendEmailSender("k", "a@b.com", url);

    await expect(
      sender.send(resetEmail("a@b.com", "https://x.com/r")),
    ).rejects.toThrow(/422/);
    // Retrying a request the provider will never accept just doubles the delay.
    expect(captured).toHaveLength(1);
  });

  it("never puts the API key in the error it throws", async () => {
    respond = () => ({ status: 500, body: '{"message":"boom"}' });
    const sender = new ResendEmailSender("super-secret-key", "a@b.com", url);

    await expect(sender.send(resetEmail("a@b.com", "https://x.com/r"))).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining("super-secret-key"),
      }) as Error,
    );
  });

  it("reports the recipient so an operator can answer 'did it go out'", async () => {
    respond = () => ({ status: 500, body: "{}" });
    const sender = new ResendEmailSender("k", "a@b.com", url);
    await expect(
      sender.send(resetEmail("mariana@example.com", "https://x.com/r")),
    ).rejects.toThrow(/mariana@example.com/);
  });

  it("fails rather than hanging when the provider is unreachable", async () => {
    // Port 1 is reserved and refuses immediately.
    const sender = new ResendEmailSender("k", "a@b.com", "http://127.0.0.1:1/emails");
    await expect(sender.send(resetEmail("a@b.com", "https://x.com/r"))).rejects.toThrow(
      /failed/,
    );
  });
});


/**
 * The transactional mail, checked for the things that make it useful.
 *
 * Not the prose — that is a judgement call — but the facts a reader has to act
 * on: which address it went to, what it says happened, and whether the date
 * they need is in it. A mail about money that omits the date access ends is a
 * mail that generates a support message.
 */
describe("the money and security mail", () => {
  const WHEN = new Date("2026-11-30T12:00:00.000Z");

  it("states the amount and the renewal date on a new subscription", () => {
    const mail = subscriptionStartedEmail("a@b.com", {
      amount: 29.9,
      currency: "PEN",
      renewsOn: WHEN,
    });
    expect(mail.to).toBe("a@b.com");
    expect(mail.text).toContain("29.9 PEN");
    expect(mail.text).toContain("2026-11-30");
  });

  it("falls back to saying it renews when the provider gave no date", () => {
    const mail = subscriptionStartedEmail("a@b.com", {
      amount: 29.9,
      currency: "PEN",
      renewsOn: null,
    });
    expect(mail.text).toMatch(/renews monthly/i);
    // Never the word "Invalid Date", which is what a naive format produces.
    expect(mail.text).not.toMatch(/invalid/i);
  });

  it("survives a date the provider sent as nonsense", () => {
    // `new Date("not a date")` is a Date whose time is NaN, and it reaches
    // here from the provider rather than from us.
    const mail = paymentFailedEmail("a@b.com", {
      accessUntil: new Date("not a date"),
    });
    expect(mail.text).not.toMatch(/invalid|nan/i);
  });

  it("tells a failed payment how long access lasts and how to fix it", () => {
    const mail = paymentFailedEmail("a@b.com", { accessUntil: WHEN });
    expect(mail.subject).toMatch(/could not charge/i);
    expect(mail.text).toContain("2026-11-30");
    expect(mail.text).toMatch(/card/i);
  });

  it("tells a cancellation that the history stays", () => {
    const mail = subscriptionEndedEmail("a@b.com", { accessUntil: WHEN });
    expect(mail.text).toContain("2026-11-30");
    expect(mail.text).toMatch(/progress|history/i);
  });

  it("gives a password change somewhere to report it", () => {
    const mail = passwordChangedEmail("a@b.com");
    expect(mail.text).toMatch(/signed out/i);
    // The whole point: a recipient who did not do this needs a next step.
    expect(mail.text).toContain("hola@getmockio.com");
  });

  it("says a deletion cannot be undone", () => {
    const mail = accountDeletedEmail("a@b.com");
    expect(mail.text).toMatch(/cannot be undone/i);
    expect(mail.text).toContain("hola@getmockio.com");
  });

  it("addresses every one of them to the account", () => {
    const all = [
      subscriptionStartedEmail("x@y.z", { amount: 1, currency: "PEN", renewsOn: null }),
      paymentFailedEmail("x@y.z", { accessUntil: null }),
      subscriptionEndedEmail("x@y.z", { accessUntil: null }),
      passwordChangedEmail("x@y.z"),
      accountDeletedEmail("x@y.z"),
    ];
    for (const mail of all) {
      expect(mail.to).toBe("x@y.z");
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text.length).toBeGreaterThan(0);
    }
  });
});


/**
 * The rule that decides whether a customer hears from us at all.
 *
 * Mercado Pago retries a notification until it gets a 200, so the difference
 * between "fires on the current status" and "fires on a change" is the
 * difference between one mail and one mail per retry.
 */
describe("which subscription transitions owe a mail", () => {
  const PLAN = { amount: 29.9, currency: "PEN" };
  const call = (
    previous: "pending" | "authorized" | "paused" | "cancelled" | null,
    next: "pending" | "authorized" | "paused" | "cancelled",
  ) =>
    subscriptionMail({
      email: "a@b.com",
      previous,
      next,
      accessUntil: new Date("2026-11-30T00:00:00.000Z"),
      plan: PLAN,
    });

  it("says nothing when the status did not change", () => {
    // This is the provider retrying. Every one of these must be silent.
    for (const status of ["pending", "authorized", "paused", "cancelled"] as const) {
      expect(call(status, status), status).toBeNull();
    }
  });

  it("welcomes a first authorization, which has no previous row", () => {
    expect(call(null, "authorized")?.subject).toMatch(/active/i);
    expect(call("pending", "authorized")?.subject).toMatch(/active/i);
  });

  it("reports a pause as the failed charge it is", () => {
    expect(call("authorized", "paused")?.subject).toMatch(/could not charge/i);
  });

  it("reports a cancellation from either state it can come from", () => {
    expect(call("authorized", "cancelled")?.subject).toMatch(/ended/i);
    expect(call("paused", "cancelled")?.subject).toMatch(/ended/i);
  });

  it("stays quiet about a subscription that has not started", () => {
    // `pending` is where a subscription is created, before the customer has
    // done anything worth telling them about.
    expect(call(null, "pending")).toBeNull();
    expect(call("cancelled", "pending")).toBeNull();
  });

  it("would rather say nothing than invent an amount", () => {
    const mail = subscriptionMail({
      email: "a@b.com",
      previous: null,
      next: "authorized",
      accessUntil: null,
      plan: null,
    });
    expect(mail).toBeNull();
  });

  it("recovers when a card starts working again", () => {
    // paused → authorized is a customer who fixed their card. They get the
    // confirmation, not silence.
    expect(call("paused", "authorized")?.subject).toMatch(/active/i);
  });
});
