import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { ResendEmailSender, resetEmail, verifyEmail } from "../src/email.js";

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
    const sender = new ResendEmailSender("secret-key", "Real Sessions <no-reply@x.com>", url);
    await sender.send(resetEmail("mariana@example.com", "https://x.com/reset?token=abc"));

    expect(captured).toHaveLength(1);
    const request = captured[0]!;
    expect(request.method).toBe("POST");
    expect(request.auth).toBe("Bearer secret-key");
    expect(request.contentType).toContain("application/json");
    // `to` is an array in Resend's API — a bare string is silently rejected.
    expect(request.body["to"]).toEqual(["mariana@example.com"]);
    expect(request.body["from"]).toBe("Real Sessions <no-reply@x.com>");
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
