/**
 * Outbound email.
 *
 * No provider is configured here, so the default writes to the log instead of
 * sending. That keeps the reset flow fully exercisable — everything except the
 * final hop is real — and a provider (Resend, SES, Postmark) is one class.
 *
 * The console sender must never be the default in production: a reset link
 * printed to a log file is a reset link anyone with log access can use.
 */
import process from "node:process";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  readonly kind: string;
  send(message: EmailMessage): Promise<void>;
}

/** Transient failures worth one retry; anything else is a bad request. */
function isTransient(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Resend (https://resend.com). Chosen for the simplest surface of the common
 * providers: one POST with a bearer token. Swapping to SES, Postmark, or
 * Mailgun means another class implementing `EmailSender`, nothing else.
 */
export class ResendEmailSender implements EmailSender {
  readonly kind = "resend";

  constructor(
    private readonly apiKey: string,
    /** Must be an address on a domain verified with the provider. */
    private readonly from: string,
    private readonly endpoint = "https://api.resend.com/emails",
  ) {}

  async send(message: EmailMessage): Promise<void> {
    let lastError = "";

    // One retry: a rate limit or a blip should not cost someone their reset
    // link, but a queue belongs outside the request path, not in a loop here.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500));

      let response: Response;
      try {
        response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: this.from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
          }),
          // A hanging provider must not hang a sign-up.
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        continue;
      }

      if (response.ok) return;

      // Body first, then discard: it can contain the submitted address, and
      // an errored provider response is not something to log wholesale.
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      lastError = `${response.status} ${detail}`;
      if (!isTransient(response.status)) break;
    }

    // Never interpolate the key. The recipient is logged because operators
    // need to answer "did my reset mail go out"; the body is not.
    throw new Error(`Email delivery to ${message.to} failed: ${lastError}`);
  }
}

class ConsoleEmailSender implements EmailSender {
  readonly kind = "console";
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `\n[techshadow] email not sent — no provider configured.\n` +
        `  to:      ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  ${message.text.split("\n").join("\n  ")}\n`,
    );
  }
}

export function createEmailSender(): EmailSender {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (apiKey && from) return new ResendEmailSender(apiKey, from);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set RESEND_API_KEY and EMAIL_FROM. Without them, password reset would " +
        "print reset links to the log instead of sending them, so production " +
        "start is refused.",
    );
  }

  if (apiKey || from) {
    // Half-configured is a likelier deployment mistake than deliberately
    // running without email, so it gets its own warning.
    console.warn(
      "[techshadow] Email provider half-configured — both RESEND_API_KEY and " +
        "EMAIL_FROM are required. Falling back to console output.",
    );
  }
  return new ConsoleEmailSender();
}

export function verifyEmail(email: string, url: string): EmailMessage {
  return {
    to: email,
    subject: "Confirm your email for TechShadow 360",
    text:
      `Confirm this address so we can reach you about your account.\n\n` +
      `${url}\n\n` +
      `The link works once and expires in 24 hours. ` +
      `If you did not sign up, ignore this and the account stays unusable.`,
  };
}

export function resetEmail(email: string, url: string): EmailMessage {
  return {
    to: email,
    subject: "Reset your TechShadow 360 password",
    text:
      `Someone asked to reset the password for this account.\n\n` +
      `${url}\n\n` +
      `The link works once and expires in 30 minutes. ` +
      `If this wasn't you, nothing has changed and you can ignore this.`,
  };
}
