import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completeInterview, post, startHarness, type Harness } from "./support/http.js";

/**
 * The account-recovery routes.
 *
 * These are the account-takeover surface: sign-up, sign-in, the reset link, the
 * confirmation link. `accounts.test.ts` covers the hashing and the token
 * primitives; nothing covered the wiring, which is where a correct module gets
 * mounted behind the wrong check.
 */
let api: Harness;

const EMAIL = "mariana@example.com";
const PASSWORD = "a long enough passphrase";

beforeEach(async () => {
  api = await startHarness();
  await api.authenticate();
});

afterEach(async () => {
  await api.stop();
});

async function signUp(email = EMAIL) {
  return api.call("/api/accounts", post({ email, password: PASSWORD }));
}

describe("signing up", () => {
  it("creates an account and signs you in", async () => {
    expect((await signUp()).status).toBe(201);
    const me = await api.json<{ kind: string; email: string }>("/api/auth/me");
    expect(me.kind).toBe("user");
    expect(me.email).toBe(EMAIL);
  });

  it("sends a confirmation, and says the address is unverified until used", async () => {
    await signUp();
    expect(api.mailer.tokenFor(EMAIL)).toBeTruthy();

    const before = await api.json<{ emailVerified: boolean }>("/api/auth/me");
    expect(before.emailVerified).toBe(false);

    await api.call("/api/auth/verify", post({ token: api.mailer.tokenFor(EMAIL) }));
    const after = await api.json<{ emailVerified: boolean }>("/api/auth/me");
    expect(after.emailVerified).toBe(true);
  });

  it("rejects a password too short to be worth hashing", async () => {
    const response = await api.call("/api/accounts", post({ email: EMAIL, password: "short" }));
    expect(response.status).toBe(400);
  });

  it("rejects an address that is not one", async () => {
    expect(
      (await api.call("/api/accounts", post({ email: "nope", password: PASSWORD }))).status,
    ).toBe(400);
  });

  it("carries guest work onto the new account", async () => {
    // The whole reason guests exist: practising before signing up must not be
    // thrown away by signing up.
    await api.call(
      "/api/preferences",
      { ...post({ defaultRole: "Backend Engineer" }), method: "PUT" },
    );
    await signUp();

    const prefs = await api.json<{ preferences: { defaultRole: string } }>(
      "/api/preferences",
    );
    expect(prefs.preferences.defaultRole).toBe("Backend Engineer");
  });
});

describe("signing in", () => {
  it("accepts the right password", async () => {
    await signUp();
    await api.call("/api/auth/logout", post({}));

    expect((await api.call("/api/auth/login", post({ email: EMAIL, password: PASSWORD }))).status).toBe(200);
    expect((await api.json<{ kind: string }>("/api/auth/me")).kind).toBe("user");
  });

  it("gives the same answer for a wrong password and an unknown address", async () => {
    // Distinct errors here would let anyone enumerate who has an account.
    await signUp();
    const wrongPassword = await api.call(
      "/api/auth/login",
      post({ email: EMAIL, password: "not the passphrase" }),
    );
    const unknownEmail = await api.call(
      "/api/auth/login",
      post({ email: "nobody@example.com", password: PASSWORD }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  it("drops the identity on logout", async () => {
    await signUp();
    await api.call("/api/auth/logout", post({}));
    expect((await api.json<{ kind: string | null }>("/api/auth/me")).kind).toBeNull();
  });
});

describe("resetting a password", () => {
  it("answers identically whether or not the address is registered", async () => {
    await signUp();
    const known = await api.call("/api/auth/forgot", post({ email: EMAIL }));
    const unknown = await api.call("/api/auth/forgot", post({ email: "nobody@example.com" }));

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(await known.json()).toEqual(await unknown.json());
  });

  it("mails a link only to an address that has an account", async () => {
    await signUp();
    api.mailer.sent.length = 0;

    await api.call("/api/auth/forgot", post({ email: "nobody@example.com" }));
    expect(api.mailer.sent).toHaveLength(0);

    await api.call("/api/auth/forgot", post({ email: EMAIL }));
    expect(api.mailer.tokenFor(EMAIL)).toBeTruthy();
  });

  it("sets the new password and signs the person in", async () => {
    await signUp();
    await api.call("/api/auth/logout", post({}));
    await api.call("/api/auth/forgot", post({ email: EMAIL }));

    const token = api.mailer.tokenFor(EMAIL);
    const reset = await api.call(
      "/api/auth/reset",
      post({ token, password: "a different long passphrase" }),
    );
    expect(reset.status).toBe(200);
    expect((await api.json<{ kind: string }>("/api/auth/me")).kind).toBe("user");

    await api.call("/api/auth/logout", post({}));
    expect(
      (await api.call("/api/auth/login", post({ email: EMAIL, password: "a different long passphrase" }))).status,
    ).toBe(200);
  });

  it("burns the link, so a leaked one cannot be reused", async () => {
    await signUp();
    await api.call("/api/auth/forgot", post({ email: EMAIL }));
    const token = api.mailer.tokenFor(EMAIL);

    await api.call("/api/auth/reset", post({ token, password: "a different long passphrase" }));
    const again = await api.call(
      "/api/auth/reset",
      post({ token, password: "yet another long passphrase" }),
    );
    expect(again.status).toBe(400);
  });

  it("does not burn the link when the new password is rejected", async () => {
    // Otherwise someone who typed a short password loses their only link and
    // has to start the whole flow again.
    await signUp();
    await api.call("/api/auth/forgot", post({ email: EMAIL }));
    const token = api.mailer.tokenFor(EMAIL);

    expect((await api.call("/api/auth/reset", post({ token, password: "short" }))).status).toBe(400);
    expect(
      (await api.call("/api/auth/reset", post({ token, password: "a different long passphrase" }))).status,
    ).toBe(200);
  });

  it("refuses a token that was never issued", async () => {
    expect(
      (await api.call("/api/auth/reset", post({ token: "invented", password: PASSWORD }))).status,
    ).toBe(400);
  });

  it("signs out every session that predates the reset", async () => {
    // The point of a reset when an account is compromised: the attacker's
    // existing cookie has to stop working.
    await signUp();
    const attackerCookie = api.stealCookie();

    await api.call("/api/auth/forgot", post({ email: EMAIL }));
    await api.call(
      "/api/auth/reset",
      post({ token: api.mailer.tokenFor(EMAIL), password: "a different long passphrase" }),
    );

    const stillIn = await api.call("/api/history", { headers: { Cookie: attackerCookie } });
    expect(stillIn.status).toBe(401);
  });
});

describe("confirming an address", () => {
  it("refuses an invented token", async () => {
    expect((await api.call("/api/auth/verify", post({ token: "invented" }))).status).toBe(400);
  });

  it("does not sign anyone in", async () => {
    // A link opened from an inbox proves the address, not that the person
    // holding it is at their own device.
    await signUp();
    const token = api.mailer.tokenFor(EMAIL);
    await api.call("/api/auth/logout", post({}));

    await api.call("/api/auth/verify", post({ token }));
    expect((await api.json<{ kind: string | null }>("/api/auth/me")).kind).not.toBe("user");
  });

  it("needs an identity to ask for another confirmation", async () => {
    await api.call("/api/auth/logout", post({}));
    api.forget();
    expect((await api.call("/api/auth/verify/resend", post({}))).status).toBe(401);
  });
});

describe("deleting an account", () => {
  it("erases a guest's data, which they otherwise had no way to remove", async () => {
    // A guest accumulates the same transcripts, scores and leaderboard rows a
    // signed-up account does. This route used to answer "you have no account"
    // — true about the sign-up table, false about the data, and it left the
    // person who most wanted out with no way out.
    await api.authenticate();
    const response = await api.call("/api/account", { method: "DELETE" });
    expect(response.status).toBe(200);
  });

  it("takes no email from a guest, because there is none to type", async () => {
    // The confirmation lives in the interface instead. The blast radius is
    // one browser's own cookie: this can only ever erase the caller.
    await api.authenticate();
    const response = await api.call("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "someone@else.com" }),
    });
    expect(response.status).toBe(200);
  });

  it("needs the address typed back exactly", async () => {
    // A button alone is too easy to hit for the one action with no undo.
    await signUp();
    const wrong = await api.call("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "someone@else.com" }),
    });
    expect(wrong.status).toBe(400);

    // And the account is untouched.
    expect((await api.json<{ kind: string }>("/api/auth/me")).kind).toBe("user");
  });

  it("erases the account and signs the browser out", async () => {
    await signUp();
    const response = await api.call("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL }),
    });
    expect(response.status).toBe(200);

    // The cookie is cleared, so the browser is no longer anyone.
    expect((await api.json<{ kind: string | null }>("/api/auth/me")).kind).toBeNull();
  });

  it("releases the address, so it can be used again", async () => {
    // Deleting only the record would leave the email claimed forever and lock
    // the person out of their own address.
    await signUp();
    await api.call("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL }),
    });

    await api.authenticate();
    expect((await signUp()).status).toBe(201);
  });

  it("takes the sessions and progress with it", async () => {
    await signUp();
    await completeInterview(api);
    expect((await api.json<{ sessions: unknown[] }>("/api/history")).sessions).toHaveLength(1);

    await api.call("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL }),
    });

    // A fresh identity, and nothing of the old one survives under it.
    await api.authenticate();
    expect((await api.json<{ sessions: unknown[] }>("/api/history")).sessions).toEqual([]);
    expect((await api.json<{ xp: number }>("/api/profile")).xp).toBe(0);
  });

  it("says what it kept", async () => {
    await signUp();
    const body = await api.json<{ kept: string }>("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL }),
    });
    // Contributions carry a one-way hash, not an owner id — already unlinkable,
    // and deleting them would remove knowledge other candidates rely on.
    expect(body.kept).toMatch(/contributed/i);
  });
});
