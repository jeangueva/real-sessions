/**
 * Who may verify a contributed question.
 *
 * An allowlist of account emails in the environment, not a role column. Two
 * reasons. The reviewers are meant to be working recruiters and hiring
 * managers — a handful of people, changing rarely — so a table and an admin
 * screen for managing it would be more machinery than the problem has. And a
 * list that lives outside the database cannot be granted to yourself by
 * anything that reaches the database.
 *
 * The moment reviewers become many, or need to be invited from inside the
 * product, this should become a table. Until then this is the honest shape.
 */
import process from "node:process";
import { normalizeEmail } from "./accounts.js";

/**
 * Parses the allowlist.
 *
 * Normalised through the same function that normalises an address at sign-up,
 * so a capitalised entry here still matches the account it refers to.
 */
export function reviewerEmails(): Set<string> {
  const raw = process.env.REALSESSIONS_REVIEWERS ?? "";
  const emails = raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry): entry is string => Boolean(entry));
  return new Set(emails);
}

/**
 * Whether this address may review.
 *
 * A guest is never a reviewer, and neither is an account with an unverified
 * address: the allowlist names an email, so an unconfirmed one is a claim
 * rather than a fact. Without that check, registering with someone else's
 * address would be enough.
 */
export function isReviewer(input: {
  email: string | null | undefined;
  emailVerified: boolean;
}): boolean {
  if (!input.emailVerified) return false;
  const normalized = normalizeEmail(input.email);
  return normalized !== null && reviewerEmails().has(normalized);
}

export function reviewEnabled(): boolean {
  return reviewerEmails().size > 0;
}
