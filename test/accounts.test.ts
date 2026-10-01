import { describe, expect, it, beforeEach } from "vitest";
import {
  checkPassword,
  MIN_PASSWORD_LENGTH,
  createAccountStore,
  hashPassword,
  hashResetToken,
  newResetToken,
  normalizeEmail,
  verifyPassword,
  type AccountStore,
} from "../src/accounts.js";
import { issueToken, verifyToken } from "../src/auth.js";
import { createUserStore, DEFAULT_PREFERENCES } from "../src/user-store.js";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("correct horse battery staple");
    const b = await hashPassword("correct horse battery staple");
    // Identical hashes would let one cracked password reveal every reuse.
    expect(a).not.toBe(b);
  });

  it("stores its cost parameters with the hash", async () => {
    const stored = await hashPassword("correct horse battery staple");
    // Parameters travel with the hash so they can be raised later without
    // invalidating everyone's password.
    expect(stored.startsWith("scrypt$32768$8$1$")).toBe(true);
  });

  it("never stores the password itself", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).not.toContain("correct");
    expect(stored).not.toContain("staple");
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    for (const bad of ["", "nonsense", "scrypt$x$y$z$a$b", "bcrypt$1$2$3$4$5"]) {
      expect(await verifyPassword("anything", bad)).toBe(false);
    }
  });
});

describe("input rules", () => {
  it("normalizes email so case and spacing cannot fork an account", () => {
    expect(normalizeEmail("  Mariana@Example.COM ")).toBe("mariana@example.com");
  });

  it("rejects obviously invalid addresses", () => {
    for (const bad of ["", "no-at-sign", "a@b", "a b@c.com", 42, null]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });

  it("requires length over composition", () => {
    expect(checkPassword("short").ok).toBe(false);
    // Nothing is asked of the characters themselves: this one is all letters
    // and passes, while the punctuation-and-digits password below does not,
    // purely on length.
    expect(checkPassword("a passphrase that is long").ok).toBe(true);
    expect(checkPassword("Pa$$w0!").ok).toBe(false);
    expect(checkPassword("x".repeat(300)).ok).toBe(false);
  });

  // The boundary itself, so lowering or raising it is a deliberate edit to a
  // test rather than something that slips through.
  it("accepts exactly the minimum and refuses one short of it", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(checkPassword("x".repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true);
    expect(checkPassword("x".repeat(MIN_PASSWORD_LENGTH - 1))).toEqual({
      ok: false,
      reason: "Use at least 8 characters.",
    });
  });
});

describe("account store", () => {
  let store: AccountStore;
  beforeEach(() => {
    store = createAccountStore(null);
  });

  it("creates and finds by email or id", async () => {
    const account = await store.create("a@b.com", "hash");
    expect(account).not.toBeNull();
    expect((await store.findByEmail("a@b.com"))?.id).toBe(account!.id);
    expect((await store.findById(account!.id))?.email).toBe("a@b.com");
  });

  it("refuses a duplicate email", async () => {
    await store.create("a@b.com", "hash");
    // Returning null rather than throwing keeps the route's response identical
    // whether the address was taken or the request was malformed.
    expect(await store.create("a@b.com", "other")).toBeNull();
  });
});

describe("identity tokens", () => {
  it("keeps the account id it was issued for", () => {
    const { token } = issueToken({ id: "account-1" });
    const identity = verifyToken(token);
    expect(identity?.kind).toBe("user");
    expect(identity?.id).toBe("account-1");
  });

  /**
   * The signature is over the whole payload, kind included.
   *
   * There used to be two kinds and this proved a guest could not promote
   * itself by rewriting one word of its own cookie. Only one kind is issued
   * now, but the property that made that safe is the one worth keeping: any
   * edit to the payload invalidates it, whichever field was edited.
   */
  it("refuses a payload that was edited after signing", () => {
    const { token } = issueToken({ id: "account-1" });
    const [kind, id, expiresAt, signature] = token.split(".");
    // Someone else's id, our signature.
    expect(verifyToken(`${kind}.account-2.${expiresAt}.${signature}`)).toBeNull();
    // A longer life than it was given.
    expect(verifyToken(`${kind}.${id}.${Number(expiresAt) + 86_400_000}.${signature}`)).toBeNull();
  });

  /**
   * `guest` was the other kind, dropped when accounts became mandatory.
   * Tokens carrying it are still in browsers, and they have to read as
   * invalid rather than as some lesser identity the server still honours.
   */
  it("refuses a token from before accounts were mandatory", () => {
    const { token } = issueToken({ id: "account-1" });
    const [, id, expiresAt, signature] = token.split(".");
    expect(verifyToken(`guest.${id}.${expiresAt}.${signature}`)).toBeNull();
  });
});

describe("guest preferences transfer", () => {
  it("carries a guest's setup onto a new account", async () => {
    const users = createUserStore(null);
    await users.setPreferences("guest-1", {
      ...DEFAULT_PREFERENCES,
      defaultCompany: "Nubank",
      defaultSector: "fintech",
    });

    expect(await users.transfer("guest-1", "account-1")).toBe(1);
    expect((await users.getPreferences("account-1")).defaultCompany).toBe("Nubank");
    // The guest record is moved, not copied.
    expect((await users.getPreferences("guest-1")).defaultCompany).toBe(
      DEFAULT_PREFERENCES.defaultCompany,
    );
  });

  it("does not overwrite settings the account already chose", async () => {
    const users = createUserStore(null);
    await users.setPreferences("account-1", {
      ...DEFAULT_PREFERENCES,
      defaultCompany: "Airbnb",
    });
    await users.setPreferences("guest-1", {
      ...DEFAULT_PREFERENCES,
      defaultCompany: "Nubank",
    });

    await users.transfer("guest-1", "account-1");

    // Signed-in choices are the more deliberate ones.
    expect((await users.getPreferences("account-1")).defaultCompany).toBe("Airbnb");
  });

  it("is a no-op when transferring onto itself", async () => {
    const users = createUserStore(null);
    expect(await users.transfer("same", "same")).toBe(0);
  });
});

describe("password reset", () => {
  let store: AccountStore;
  beforeEach(() => {
    store = createAccountStore(null);
  });

  it("stores the token hashed, never in the clear", async () => {
    const { token, hash } = newResetToken();
    // A store dump must not hand an attacker working reset links.
    expect(hash).not.toBe(token);
    expect(hashResetToken(token)).toBe(hash);
  });

  it("resolves a valid token to its account exactly once", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    const { token, hash } = newResetToken();
    await store.putToken("reset", hash, account.id, 1800);

    expect(await store.consumeToken("reset", hashResetToken(token))).toBe(account.id);
    // Second use must fail — a leaked link should not work twice.
    expect(await store.consumeToken("reset", hashResetToken(token))).toBeNull();
  });

  it("rejects an expired token", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    const { token, hash } = newResetToken();
    await store.putToken("reset", hash, account.id, -1);
    expect(await store.consumeToken("reset", hashResetToken(token))).toBeNull();
  });

  it("rejects an unknown token", async () => {
    expect(await store.consumeToken("reset", hashResetToken("made up"))).toBeNull();
  });

  it("changing the password stamps a time old sessions are checked against", async () => {
    const account = (await store.create("a@b.com", await hashPassword("the old passphrase")))!;
    expect(account.passwordChangedAt).toBeUndefined();

    await store.updatePassword(account.id, await hashPassword("a brand new passphrase"));
    const updated = (await store.findById(account.id))!;

    expect(updated.passwordChangedAt).toBeTruthy();
    expect(await verifyPassword("a brand new passphrase", updated.passwordHash)).toBe(true);
    // The old password must stop working immediately.
    expect(await verifyPassword("the old passphrase", updated.passwordHash)).toBe(false);
  });

  it("produces a different token every time", () => {
    const seen = new Set(Array.from({ length: 20 }, () => newResetToken().token));
    expect(seen.size).toBe(20);
  });
});

describe("email verification", () => {
  let store: AccountStore;
  beforeEach(() => {
    store = createAccountStore(null);
  });

  it("starts unverified and becomes verified once", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    expect(account.emailVerifiedAt).toBeUndefined();

    await store.markEmailVerified(account.id);
    const verified = (await store.findById(account.id))!;
    expect(verified.emailVerifiedAt).toBeTruthy();

    // Re-verifying must not move the timestamp — it is a record of when the
    // address was first proven, not of the last click.
    await store.markEmailVerified(account.id);
    expect((await store.findById(account.id))!.emailVerifiedAt).toBe(
      verified.emailVerifiedAt,
    );
  });

  it("keeps reset and verification tokens in separate namespaces", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    const { token, hash } = newResetToken();
    await store.putToken("verify", hash, account.id, 3600);

    // A verification link must not double as a password reset.
    expect(await store.consumeToken("reset", hashResetToken(token))).toBeNull();
    expect(await store.consumeToken("verify", hashResetToken(token))).toBe(
      account.id,
    );
  });

  it("verification links are single use", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    const { token, hash } = newResetToken();
    await store.putToken("verify", hash, account.id, 3600);
    expect(await store.consumeToken("verify", hashResetToken(token))).toBe(account.id);
    expect(await store.consumeToken("verify", hashResetToken(token))).toBeNull();
  });

  it("expired verification links stop working", async () => {
    const account = (await store.create("a@b.com", "hash"))!;
    const { token, hash } = newResetToken();
    await store.putToken("verify", hash, account.id, -1);
    expect(await store.consumeToken("verify", hashResetToken(token))).toBeNull();
  });
});

describe("an account with no password", () => {
  it("cannot be signed into with one", async () => {
    // The rule lives in verifyPassword rather than at each call site, so it
    // holds for every caller written later too. A Google-only account
    // reaching a password comparison is the shape of bug that signs the wrong
    // person in.
    expect(await verifyPassword("anything at all", null)).toBe(false);
    expect(await verifyPassword("", null)).toBe(false);
  });

  it("is stored and read back with the hash still absent", async () => {
    const store = createAccountStore(null);
    const created = await store.create("ana@example.com", null);
    expect(created?.passwordHash).toBeNull();
    const read = await store.findByEmail("ana@example.com");
    expect(read?.passwordHash).toBeNull();
  });

  it("still claims its address, so nobody can register it again", async () => {
    const store = createAccountStore(null);
    await store.create("ana@example.com", null);
    // Without this, somebody could take the address of a Google account by
    // signing up with a password.
    expect(await store.create("ana@example.com", "scrypt$1$1$1$a$b")).toBeNull();
  });
});
