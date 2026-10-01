/**
 * Addresses that hold the paid plan without paying for it.
 *
 * For the people who run this: a founder demonstrating the product, someone
 * testing a change against the paid features, a reviewer who needs to see
 * what a subscriber sees. They are a handful of addresses that change
 * rarely, which is the same shape as `reviewers.ts` and is held the same way.
 *
 * Deliberately NOT a superuser. The grant is an ordinary premium entitlement
 * with no end date — the same row a paying customer has, from a different
 * source. That matters more than it looks: premium is a plan, a superuser is
 * an identity with powers, and the moment one exists every capability nobody
 * knows where to put ends up hanging off it. If this list leaks, someone gets
 * free interviews. If a superuser leaked, they would get everything.
 *
 * The list lives in the environment rather than the database for the reason
 * the reviewer list does: a grant that can be written by anything that
 * reaches the database can be granted to oneself by anything that reaches the
 * database.
 *
 * Applied when the address is confirmed, never at sign-up. Typing an address
 * proves nothing about owning it, and this one is worth something.
 */
import process from "node:process";
import { normalizeEmail } from "./accounts.js";

/** The source recorded on the entitlement, so these are visible in the table. */
export const FOREVER_SOURCE = "forever";

export function foreverEmails(): Set<string> {
  const raw = process.env.REALSESSIONS_FOREVER_PREMIUM ?? "";
  const emails = raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter((entry): entry is string => Boolean(entry));
  return new Set(emails);
}

/** Whether this address holds the paid plan for free, forever. */
export function holdsForeverPremium(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized !== null && foreverEmails().has(normalized);
}
