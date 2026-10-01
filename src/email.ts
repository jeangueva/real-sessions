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
import { shellHtml, shellText, type Shell } from "./email-shell.js";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** The same message, drawn. Absent on anything built before the shell. */
  html?: string;
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
            // Both halves. Sending only HTML loses screen readers, terminal
            // clients, and anyone whose filter strips markup — which is a
            // workplace inbox, where mail about a job gets read.
            ...(message.html ? { html: message.html } : {}),
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

/**
 * Builds both halves of a message from one description.
 *
 * Every template below goes through here, so a change to the frame reaches
 * all fourteen and the text body can never say something the HTML does not.
 */
function compose(to: string, subject: string, shell: Shell): EmailMessage {
  return { to, subject, text: shellText(shell), html: shellHtml(shell) };
}

export function verifyEmail(email: string, url: string): EmailMessage {
  return compose(email, "Confirm your email for Mockio", {
    heading: "Confirm your address",
    body: ["Confirm this address so we can reach you about your account."],
    action: { label: "Confirm my address", url },
    footnote:
      "The link works once and expires in 24 hours. If you did not sign up, " +
      "ignore this and the account stays unusable.",
  });
}

export function resetEmail(email: string, url: string): EmailMessage {
  return compose(email, "Reset your Mockio password", {
    heading: "Reset your password",
    body: ["Someone asked to reset the password for this account."],
    action: { label: "Choose a new password", url },
    footnote:
      "The link works once and expires in 30 minutes. If this wasn't you, " +
      "nothing has changed and you can ignore this.",
  });
}

/**
 * Sent when somebody asks to reset a password they never set.
 *
 * They signed up with Google, so there is nothing to reset — and silence
 * would be the cruel answer, because from their side the reset link simply
 * never arrives and they conclude the account is gone.
 *
 * Safe to send despite saying something about the account: it goes only to the
 * address itself, and the HTTP response is identical either way, so it reveals
 * nothing to anybody typing addresses into the form.
 */
export function googleOnlyEmail(email: string): EmailMessage {
  return compose(email, "Signing in to Mockio", {
    heading: "This account signs in with Google",
    body: [
      "Someone asked to reset a password for this account, but it does not " +
        "have one — it was created by signing in with Google.",
      "Use the Sign in with Google button and you are in.",
    ],
    footnote:
      "If this wasn't you, nothing has changed and there is nothing to do.",
  });
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
  return compose(email, "Your Mockio subscription is active", {
    heading: "The paid plan is on",
    body: [
      "Payment went through.",
      `Amount: ${detail.amount} ${detail.currency}`,
      renews ? `Renews: ${renews}` : "Renews monthly.",
      "This is the charge that will appear on your statement, so you know what it is when it does.",
    ],
    footnote:
      "Cancel any time from Settings — you keep the plan until the period " +
      "you have paid for runs out.",
  });
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
  return compose(email, "Mockio could not charge your card", {
    heading: "We could not charge your card",
    body: [
      "The last payment did not go through, so the subscription is paused.",
      until
        ? `The paid plan stays on until ${until}, which is the period already paid for.`
        : "The paid plan is off until a payment succeeds.",
      "Usually this is an expired card, or a bank declining an automatic charge. Updating the card in Settings and subscribing again fixes it.",
    ],
    footnote: "Nothing in your history is lost either way.",
  });
}

export function subscriptionEndedEmail(
  email: string,
  detail: { accessUntil: Date | null },
): EmailMessage {
  const until = onDate(detail.accessUntil);
  return compose(email, "Your Mockio subscription has ended", {
    heading: "Your subscription has ended",
    body: [
      "The subscription is cancelled and will not be charged again.",
      until
        ? `The paid plan stays on until ${until} — the period already paid for.`
        : "The account is back on the free plan.",
    ],
    footnote:
      "Your interviews, feedback and progress stay where they are. Starting " +
      "again later picks up from the same history.",
  });
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
  return compose(email, "Your Mockio password was changed", {
    heading: "Your password was changed",
    body: [
      "The password on this account was just changed, and every device that was signed in has been signed out.",
      "If that was you, there is nothing to do.",
    ],
    footnote:
      "If it was not, someone else has access to this address or had your " +
      "password. Reset it again from the sign-in page to take the account " +
      "back, and write to hello@getmockio.com.",
  });
}

export function accountDeletedEmail(email: string): EmailMessage {
  return compose(email, "Your Mockio account is deleted", {
    heading: "Your account is deleted",
    body: [
      "The account for this address is gone, along with its interviews, transcripts, feedback and progress.",
      "This cannot be undone, and we cannot restore it — that is what makes it a deletion rather than a hidden account. Signing up again starts from nothing.",
    ],
    footnote: "If you did not do this, write to hello@getmockio.com.",
  });
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

/**
 * Confirms a place on the early-access list.
 *
 * The landing page's second section asks for an address in exchange for six
 * months of the paid plan, and until now gave back a line of text on a page
 * that the reader then navigated away from. Nothing reached the address that
 * the offer is actually attached to, which is the one thing they have to get
 * right later — the grant is keyed to the address, so signing up with a
 * different one silently forfeits it.
 *
 * It also says to confirm the address. The grant is claimed only once a
 * confirmation link proves the inbox, so an early adopter who signs up and
 * never clicks it would otherwise wait for six months that never arrive.
 */
export function earlyAccessEmail(
  email: string,
  detail: { months: number; until: Date | null },
): EmailMessage {
  const until = onDate(detail.until);
  return compose(email, `Your ${detail.months} free months of Mockio`, {
    heading: "You are on the early-access list",
    body: [
      `Create an account with this exact address — ${email} — then confirm it from the link we send you.`,
      `The first ${detail.months} months of the paid plan unlock the moment it is confirmed. The offer is tied to the address, so signing up with a different one does not carry it over.`,
      ...(until ? [`Claim it before ${until}.`] : []),
    ],
    footnote: "If you did not ask for this, nothing has been created and you can ignore it.",
  });
}

/**
 * Confirms that the free months have started.
 *
 * Sent from the confirmation link, which is often opened on a phone while the
 * account was made on a laptop — so the page that says "unlocked" is on a
 * device nobody is looking at. Transactional: it answers something the
 * recipient just did, and carries no unsubscribe link.
 */
export function earlyAccessUnlockedEmail(
  email: string,
  detail: { months: number; until: Date | null; appUrl: string },
): EmailMessage {
  const until = onDate(detail.until);
  return compose(email, `Your ${detail.months} free months have started`, {
    heading: "Your free months have started",
    body: [
      "Your address is confirmed, and the paid plan is now on your account.",
      (until ? `It stays on until ${until}. ` : "") +
        "That means interviews for the company you are actually applying to, an interviewer who has read your CV, live coaching, and the measured feedback behind every score.",
    ],
    action: { label: "Start an interview", url: detail.appUrl },
    footnote:
      "No card is on file, so nothing is charged when the months end — the " +
      "account simply goes back to the free plan.",
  });
}

/**
 * Sent on the interview that uses the last of the month's free allowance.
 *
 * On the one that spends it, not on the attempt that gets refused: the refusal
 * happens every time they try again, and a mail on that schedule is a mail
 * about our billing rather than about their practice. This arrives once, while
 * they are still in the session it is describing.
 */
export function lastFreeInterviewEmail(
  email: string,
  detail: { limit: number; resetsAt: Date | null },
): EmailMessage {
  const resets = onDate(detail.resetsAt);
  return compose(email, "That was your last free interview this month", {
    heading: "That was your last free interview this month",
    body: [
      `You have now used all ${detail.limit} free interviews for this month.`,
      resets
        ? `The next ${detail.limit} arrive on ${resets}.`
        : "They renew at the start of next month.",
      "Your feedback, transcripts and progress stay available in the meantime — the limit is on starting new interviews, not on reading the ones you have done.",
    ],
    footnote: "The paid plan removes the limit if you would rather not wait.",
  });
}

/**
 * Tells the reviewers there is something to review.
 *
 * Sent when the queue goes from empty to not, and not again until it has been
 * emptied. That is the whole rate limit, and it needs no scheduler and no
 * stored state: a queue that is already one deep does not become one deep
 * again. Mailing on every submission would train the recipients to filter it.
 */
export function reviewQueueEmail(email: string, url: string): EmailMessage {
  return compose(email, "A contributed question is waiting for review", {
    heading: "A question is waiting for review",
    body: [
      "Someone reported a question they were asked, and nothing reaches an interview until a human confirms it.",
    ],
    action: { label: "Open the queue", url },
    footnote:
      "You will not get another of these until the queue has been cleared " +
      "and something new arrives.",
  });
}

/**
 * Lifecycle mail, which is the kind that needs a way out.
 *
 * Everything above answers something the recipient just did. These two arrive
 * because time passed, which makes them the only mail here a person can
 * reasonably not want — so both end in an unsubscribe link, and the functions
 * require the URL rather than accepting an optional one. A signature that lets
 * you forget it is a signature that eventually does.
 */
function unsubscribeNote(unsubscribeUrl: string): string {
  return `Stop these emails: ${unsubscribeUrl} — this does not affect receipts or security notices.`;
}

export function inactivityEmail(
  email: string,
  detail: { days: number; unsubscribeUrl: string },
): EmailMessage {
  return compose(email, "Your English is still waiting", {
    heading: "Your English is still waiting",
    body: [
      `It has been about ${detail.days} days since your last interview.`,
      "Nothing has expired and nothing is lost — your transcripts, feedback and progress are where you left them. One interview takes around ten minutes, and the hardest part of speaking English under pressure is the part that goes first when you stop.",
      "If you are not looking for a job right now, that is a good reason to practise and a fine reason to ignore this.",
    ],
    footnote: unsubscribeNote(detail.unsubscribeUrl),
  });
}

/**
 * The week in one paragraph.
 *
 * Only sent to someone who did something, so it never says "you did nothing
 * this week" — a summary of an empty week is a reproach, and the nudge above
 * already covers people who have stopped.
 */
export function weeklyDigestEmail(
  email: string,
  detail: {
    sessions: number;
    bestScore: number | null;
    xp: number;
    unsubscribeUrl: string;
  },
): EmailMessage {
  const count =
    detail.sessions === 1 ? "one interview" : `${detail.sessions} interviews`;
  return compose(email, `Your week: ${count}`, {
    heading: `Your week: ${count}`,
    body: [
      `You sat ${count} in the last seven days.`,
      ...(detail.bestScore !== null ? [`Best score: ${detail.bestScore}/100`] : []),
      ...(detail.xp > 0 ? [`XP earned: ${detail.xp}`] : []),
      "The scores are only worth reading next to each other, which is what the progress screen is for. Two or three interviews a week is where the curve starts moving.",
    ],
    footnote: unsubscribeNote(detail.unsubscribeUrl),
  });
}
