import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign as signWith } from "node:crypto";
import { verifyGoogleIdToken } from "../src/google.js";

/**
 * The whole security boundary of signing in with Google.
 *
 * There is no client secret in this flow: a browser posts a string and this is
 * the only thing between that string and an account. So the tests are written
 * as attacks rather than as happy paths — every one of them is somebody
 * getting signed in as a person they are not.
 *
 * Verified against a key pair generated here rather than against Google, so
 * the suite needs no network and can forge the tokens a real attacker would.
 */
const CLIENT_ID = "166481518-example.apps.googleusercontent.com";
const KID = "test-key";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256" };
const keys = async () => [jwk as Record<string, string>];

/** A second pair, standing in for anybody who is not Google. */
const impostor = generateKeyPairSync("rsa", { modulusLength: 2048 });

function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(
  payload: Record<string, unknown> = {},
  { header = {}, key = privateKey }: { header?: Record<string, unknown>; key?: typeof privateKey } = {},
): string {
  const head = b64({ alg: "RS256", kid: KID, typ: "JWT", ...header });
  const body = b64({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "1234567890",
    email: "Ana@Example.com",
    email_verified: true,
    name: "Ana",
    exp: Math.floor(Date.now() / 1000) + 600,
    ...payload,
  });
  const signature = signWith("RSA-SHA256", Buffer.from(`${head}.${body}`), key).toString(
    "base64url",
  );
  return `${head}.${body}.${signature}`;
}

const verify = (value: string, now?: number) =>
  verifyGoogleIdToken(value, { clientId: CLIENT_ID, keys, ...(now ? { now } : {}) });

describe("a token Google really signed", () => {
  it("yields the address, normalised, and their id", async () => {
    const identity = await verify(token());
    expect(identity.email).toBe("ana@example.com");
    expect(identity.subject).toBe("1234567890");
    expect(identity.name).toBe("Ana");
  });

  it("survives Google sending email_verified as a string", async () => {
    const identity = await verify(token({ email_verified: "true" }));
    expect(identity.email).toBe("ana@example.com");
  });
});

describe("tokens that must not work", () => {
  it("refuses one signed by somebody else", async () => {
    // The whole point of checking a signature.
    await expect(verify(token({}, { key: impostor.privateKey }))).rejects.toThrow(
      /not signed by Google/,
    );
  });

  it("refuses one whose body was edited after signing", async () => {
    const [head, , signature] = token().split(".");
    const swapped = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: CLIENT_ID,
        sub: "1",
        email: "victim@example.com",
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
    ).toString("base64url");
    await expect(verify(`${head}.${swapped}.${signature}`)).rejects.toThrow();
  });

  it("refuses alg: none", async () => {
    // The oldest JWT attack there is: let the token pick the algorithm.
    const head = b64({ alg: "none", kid: KID });
    const body = b64({ iss: "https://accounts.google.com", aud: CLIENT_ID, email: "a@b.com" });
    await expect(verify(`${head}.${body}.`)).rejects.toThrow(/algorithm/);
  });

  it("refuses a token minted for a different application", async () => {
    // Anybody running a Google-connected site could otherwise take the tokens
    // their own users hand them and sign in as those people here.
    await expect(verify(token({ aud: "someone-else.apps.googleusercontent.com" }))).rejects.toThrow(
      /another app/,
    );
  });

  it("refuses an address Google has not verified", async () => {
    // A Workspace admin can create an address they do not own. Accepting this
    // would hand them the Mockio account of whoever already uses that email.
    await expect(verify(token({ email_verified: false }))).rejects.toThrow(/not verified/);
  });

  it("refuses an expired token", async () => {
    const stale = token({ exp: Math.floor(Date.now() / 1000) - 3600 });
    await expect(verify(stale)).rejects.toThrow(/expired/);
  });

  it("refuses an unknown signing key", async () => {
    await expect(verify(token({}, { header: { kid: "not-a-google-key" } }))).rejects.toThrow(
      /Unknown signing key/,
    );
  });

  it("refuses a wrong issuer", async () => {
    await expect(verify(token({ iss: "https://evil.example" }))).rejects.toThrow(/issuer/);
  });

  it("refuses a string that is not a token at all", async () => {
    await expect(verify("hello")).rejects.toThrow(/not a Google token/);
  });
});
