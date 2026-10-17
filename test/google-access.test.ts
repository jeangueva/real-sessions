import { describe, expect, it, vi } from "vitest";
import { verifyGoogleAccessToken } from "../src/google.js";

/**
 * The access-token half of signing in with Google.
 *
 * The sign-in screen's own button gets an opaque OAuth access token from
 * Google's popup, and there is still no client secret: this is the only thing
 * between that string and an account. Google is played here by an injected
 * `fetch`, so every test can be an attack — a token minted for another site,
 * an expired one, an address Google never proved, two answers that disagree.
 */
const CLIENT_ID = "166481518-example.apps.googleusercontent.com";
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const TOKEN = "ya29.a0AfB_example-token";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function google({
  info = {},
  user = {},
  infoStatus = 200,
  userStatus = 200,
}: {
  info?: Record<string, unknown>;
  user?: Record<string, unknown>;
  infoStatus?: number;
  userStatus?: number;
} = {}) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("https://oauth2.googleapis.com/tokeninfo")) {
      return json(
        {
          aud: CLIENT_ID,
          azp: CLIENT_ID,
          sub: "1234567890",
          scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          exp: String(Math.floor(NOW / 1000) + 3000),
          expires_in: "3000",
          ...info,
        },
        infoStatus,
      );
    }
    if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
      const auth = new Headers(init?.headers).get("Authorization");
      if (auth !== `Bearer ${TOKEN}`) return json({ error: "invalid_token" }, 401);
      return json(
        {
          sub: "1234567890",
          email: "Ana@Example.com",
          email_verified: true,
          name: " Ana Pérez ",
          ...user,
        },
        userStatus,
      );
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const verify = (fetchImpl: typeof fetch, token = TOKEN) =>
  verifyGoogleAccessToken(token, { clientId: CLIENT_ID, now: NOW }, fetchImpl);

describe("verifying a Google access token", () => {
  it("returns the normalised identity for a good token", async () => {
    const fetchImpl = google();
    expect(await verify(fetchImpl)).toEqual({
      email: "ana@example.com",
      subject: "1234567890",
      name: "Ana Pérez",
    });
    // The token goes to tokeninfo URL-encoded and to userinfo as a bearer —
    // never anywhere else.
    expect(String(fetchImpl.mock.calls[0]![0])).toBe(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(TOKEN)}`,
    );
  });

  it("accepts the short `email` scope as well as the URL form", async () => {
    await expect(verify(google({ info: { scope: "openid email profile" } }))).resolves.toBeTruthy();
  });

  it("refuses a token minted for another app", async () => {
    // The attack this whole check exists for: a site with its own Google
    // sign-in replaying its users' tokens here.
    await expect(verify(google({ info: { aud: "someone-else.apps.googleusercontent.com" } }))).rejects.toThrow(
      /another app/,
    );
  });

  it("refuses a token another party authorised for our audience", async () => {
    await expect(verify(google({ info: { azp: "someone-else.apps.googleusercontent.com" } }))).rejects.toThrow();
  });

  it("refuses an expired token", async () => {
    await expect(
      verify(google({ info: { exp: String(Math.floor(NOW / 1000) - 3600), expires_in: undefined } })),
    ).rejects.toThrow(/expired/);
    await expect(verify(google({ info: { expires_in: "0" } }))).rejects.toThrow(/expired/);
  });

  it("refuses a token with no expiry at all", async () => {
    await expect(verify(google({ info: { exp: undefined, expires_in: undefined } }))).rejects.toThrow();
  });

  it("refuses a token that cannot read an address", async () => {
    await expect(verify(google({ info: { scope: "openid profile" } }))).rejects.toThrow(/address/);
  });

  it("refuses when Google has not verified the address", async () => {
    await expect(verify(google({ user: { email_verified: false } }))).rejects.toThrow(/verified/);
    // A string is not a boolean on this endpoint, and missing is not a yes.
    await expect(verify(google({ user: { email_verified: "true" } }))).rejects.toThrow(/verified/);
    await expect(verify(google({ user: { email_verified: undefined } }))).rejects.toThrow(/verified/);
  });

  it("refuses when tokeninfo and userinfo disagree about who this is", async () => {
    await expect(verify(google({ user: { sub: "999" } }))).rejects.toThrow(/disagree/);
  });

  it("refuses when Google rejects the token", async () => {
    await expect(verify(google({ infoStatus: 400 }))).rejects.toThrow();
    await expect(verify(google({ userStatus: 401 }))).rejects.toThrow();
  });

  it("fails closed when Google cannot be reached", async () => {
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(verify(down)).rejects.toThrow();
  });

  it("refuses an empty or malformed token without calling Google", async () => {
    const fetchImpl = google();
    await expect(verify(fetchImpl, "")).rejects.toThrow();
    await expect(verify(fetchImpl, "abc\r\nX-Injected: 1")).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses an address Google did not send", async () => {
    await expect(verify(google({ user: { email: undefined } }))).rejects.toThrow(/address/);
  });
});
