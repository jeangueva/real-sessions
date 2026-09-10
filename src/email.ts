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
      `\n[mockio] email not sent — no provider configured.\n` +
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
      "[mockio] Email provider half-configured — both RESEND_API_KEY and " +
        "EMAIL_FROM are required. Falling back to console output.",
    );
  }
  return new ConsoleEmailSender();
}

export function verifyEmail(email: string, url: string): EmailMessage {
  return {
    to: email,
    subject: "Confirm your email for Mockio",
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
    subject: "Reset your Mockio password",
    text:
      `Someone asked to reset the password for this account.\n\n` +
      `${url}\n\n` +
      `The link works once and expires in 30 minutes. ` +
      `If this wasn't you, nothing has changed and you can ignore this.`,
  };
}

/**
 * The transactional mail nobody asks for and everybody needs.
 *
 * These exist because the events they describe were previously silent. A card
 * that stops working, a subscription that ends, a password that changes: all
 * of them already happened in the product, and the person they happened to
 * found out by noticing, or did not find out at all.
 *
 * Same voice as the two above — what happened, what it means, what to do. No
 * marketing in a mail about money or security, because a mail that tries to
 * sell while telling you your card failed reads as a company that is pleased
 * about it.
 */

/** A date a reader can act on, or null when the provider did not give one. */
function onDate(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;
  return value.toISOString().slice(0, 10);
}

export function subscriptionStartedEmail(
  email: string,
  detail: { amount: number; currency: string; renewsOn: Date | null },
): EmailMessage {
  const renews = onDate(detail.renewsOn);
  return {
    to: email,
    subject: "Your Mockio subscription is active",
    text:
      `Payment went through and the paid plan is on.\n\n` +
      `Amount: ${detail.amount} ${detail.currency}\n` +
      (renews ? `Renews: ${renews}\n` : `Renews monthly.\n`) +
      `\nThis is the charge that will appear on your statement, so you know ` +
      `what it is when it does. Cancel any time from Settings — you keep the ` +
      `plan until the period you have paid for runs out.`,
  };
}

/**
 * The one that matters most.
 *
 * Mercado Pago pauses a preapproval when it cannot charge the card. Nothing
 * told the customer, so the first they knew was the paid features quietly
 * being gone — which reads as the product breaking rather than as a card
 * expiring, and is how a renewable customer is lost to a fixable problem.
 */
export function paymentFailedEmail(
  email: string,
  detail: { accessUntil: Date | null },
): EmailMessage {
  const until = onDate(detail.accessUntil);
  return {
    to: email,
    subject: "Mockio could not charge your card",
    text:
      `The last payment did not go through, so the subscription is paused.\n\n` +
      (until
        ? `The paid plan stays on until ${until}, which is the period already paid for.\n\n`
        : `The paid plan is off until a payment succeeds.\n\n`) +
      `Usually this is an expired card or a bank declining an automatic ` +
      `charge. Updating the card in Settings and subscribing again fixes it. ` +
      `Nothing in your history is lost either way.`,
  };
}

export function subscriptionEndedEmail(
  email: string,
  detail: { accessUntil: Date | null },
): EmailMessage {
  const until = onDate(detail.accessUntil);
  return {
    to: email,
    subject: "Your Mockio subscription has ended",
    text:
      `The subscription is cancelled and will not be charged again.\n\n` +
      (until
        ? `The paid plan stays on until ${until} — the period already paid for.\n\n`
        : `The account is back on the free plan.\n\n`) +
      `Your interviews, feedback and progress stay where they are. Starting ` +
      `again later picks up from the same history.`,
  };
}

/**
 * Sent after the password actually changes, not when a reset is requested.
 *
 * The reset mail proves someone asked. This one proves it worked, and it is
 * the only thing standing between a quiet account takeover and the owner
 * noticing — so it goes to the address on the account whether or not that is
 * who asked.
 */
export function passwordChangedEmail(email: string): EmailMessage {
  return {
    to: email,
    subject: "Your Mockio password was changed",
    text:
      `The password on this account was just changed, and every device that ` +
      `was signed in has been signed out.\n\n` +
      `If that was you, there is nothing to do.\n\n` +
      `If it was not, someone else has access to this address or had your ` +
      `password. Reset it again from the sign-in page to take the account ` +
      `back, and write to hola@getmockio.com.`,
  };
}

export function accountDeletedEmail(email: string): EmailMessage {
  return {
    to: email,
    subject: "Your Mockio account is deleted",
    text:
      `The account for this address is gone, along with its interviews, ` +
      `transcripts, feedback and progress.\n\n` +
      `This cannot be undone, and we cannot restore it — that is what makes ` +
      `it a deletion rather than a hidden account. Signing up again starts ` +
      `from nothing.\n\n` +
      `If you did not do this, write to hola@getmockio.com.`,
  };
}


/**
 * Which mail a subscription transition owes, or null for none.
 *
 * Pure, and separate from sending, because the rule it encodes is the one that
 * can go wrong quietly: Mercado Pago retries a notification until it gets a
 * 200, so a rule that fired on the *current* status rather than on a *change*
 * would mail a customer once per retry. That is not visible in a log and is
 * very visible in an inbox.
 *
 * `previous` is the status as stored before this notification was applied, so
 * a retry arrives with previous === next and is silent. A first authorization
 * has no stored row, and null counts as a change.
 */
export function subscriptionMail(input: {
  email: string;
  previous: "pending" | "authorized" | "paused" | "cancelled" | null;
  next: "pending" | "authorized" | "paused" | "cancelled";
  accessUntil: Date | null;
  plan: { amount: number; currency: string } | null;
}): EmailMessage | null {
  const { email, previous, next, accessUntil, plan } = input;
  if (previous === next) return null;

  if (next === "authorized") {
    // Nothing useful to say without the amount, and inventing one is worse
    // than staying quiet about a charge.
    if (!plan) return null;
    return subscriptionStartedEmail(email, {
      amount: plan.amount,
      currency: plan.currency,
      renewsOn: accessUntil,
    });
  }
  if (next === "paused") return paymentFailedEmail(email, { accessUntil });
  if (next === "cancelled") return subscriptionEndedEmail(email, { accessUntil });
  // `pending` is the state a subscription is created in, before the customer
  // has done anything. There is nothing to report yet.
  return null;
}
