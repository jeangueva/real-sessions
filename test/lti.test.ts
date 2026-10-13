import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPublicKey, generateKeyPairSync, sign, type JsonWebKey, type KeyObject } from "node:crypto";
import { LtiError, makeState, readState, verifyJwt, verifyLaunch, type LtiPlatform } from "../src/lti.js";
import { post, startHarness, type Harness } from "./support/http.js";

/** A stand-in university platform: its own key, its own published key set. */
function platformKeys() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...(createPublicKey(privateKey).export({ format: "jwk" }) as JsonWebKey), kid: "k1", alg: "RS256" };
  return { privateKey, jwks: { keys: [jwk] } };
}

function token(privateKey: KeyObject, claims: Record<string, unknown>, header: Record<string, unknown> = { alg: "RS256", kid: "k1" }) {
  const head = Buffer.from(JSON.stringify(header)).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url");
  return `${head}.${body}.${signature}`;
}

const PLATFORM: LtiPlatform = {
  id: 1,
  issuer: "https://aula.universidad.test",
  clientId: "mockio-client",
  deploymentIds: ["dep-1"],
  authLoginUrl: "https://aula.universidad.test/mod/lti/auth.php",
  authTokenUrl: "https://aula.universidad.test/mod/lti/token.php",
  jwksUrl: "https://aula.universidad.test/mod/lti/certs.php",
  institutionCode: null,
};

function launchClaims(nonce: string, extra: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: PLATFORM.issuer,
    aud: PLATFORM.clientId,
    sub: "student-42",
    exp: now + 300,
    iat: now,
    nonce,
    email: "Ana.Quispe@universidad.test",
    name: "Ana Quispe",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "dep-1",
    "https://purl.imsglobal.org/spec/lti/claim/roles": ["http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"],
    "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint": {
      scope: ["https://purl.imsglobal.org/spec/lti-ags/scope/score"],
      lineitem: "https://aula.universidad.test/mod/lti/services.php/2/lineitems/7/lineitem",
    },
    ...extra,
  };
}

describe("the platform's signature", () => {
  it("accepts a token the platform signed and refuses any other", async () => {
    const { privateKey, jwks } = platformKeys();
    const other = platformKeys();
    const fetcher = async () => jwks;
    await expect(verifyJwt(token(privateKey, { a: 1 }), "x", fetcher)).resolves.toEqual({ a: 1 });
    await expect(verifyJwt(token(other.privateKey, { a: 1 }), "x", fetcher)).rejects.toBeInstanceOf(LtiError);
  });

  it("refuses an unsigned token and the HMAC family outright", async () => {
    const { privateKey, jwks } = platformKeys();
    const fetcher = async () => jwks;
    const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from("{}").toString("base64url")}.`;
    await expect(verifyJwt(unsigned, "x", fetcher)).rejects.toThrow(/algorithm/);
    await expect(verifyJwt(token(privateKey, {}, { alg: "HS256" }), "x", fetcher)).rejects.toThrow(/algorithm/);
  });
});

describe("the launch", () => {
  it("reads who it is, whether they teach and where their grade goes", async () => {
    const { privateKey, jwks } = platformKeys();
    const { nonce } = makeState(1);
    const launch = await verifyLaunch(token(privateKey, launchClaims(nonce)), PLATFORM, nonce, async () => jwks);
    expect(launch).toMatchObject({ sub: "student-42", email: "ana.quispe@universidad.test", instructor: false });
    expect(launch.lineitem).toContain("/lineitems/7/");
  });

  it("refuses a replay, another platform, another tool, an unknown deployment and an expired token", async () => {
    const { privateKey, jwks } = platformKeys();
    const fetcher = async () => jwks;
    const run = (nonce: string, extra: Record<string, unknown>) =>
      verifyLaunch(token(privateKey, launchClaims(nonce, extra)), PLATFORM, nonce, fetcher);

    const once = makeState(1).nonce;
    await run(once, {});
    await expect(run(once, {})).rejects.toThrow(/already used/);
    await expect(run(makeState(1).nonce, { iss: "https://evil.test" })).rejects.toThrow(/another platform/);
    await expect(run(makeState(1).nonce, { aud: "someone-else" })).rejects.toThrow(/another tool/);
    await expect(
      run(makeState(1).nonce, { "https://purl.imsglobal.org/spec/lti/claim/deployment_id": "dep-9" }),
    ).rejects.toThrow(/deployment/);
    await expect(run(makeState(1).nonce, { exp: Math.floor(Date.now() / 1000) - 3600 })).rejects.toThrow(/expired/);
    // A nonce the state did not issue.
    await expect(
      verifyLaunch(token(privateKey, launchClaims("forged")), PLATFORM, makeState(1).nonce, fetcher),
    ).rejects.toThrow(/already used/);
  });

  it("signs the state so it cannot be altered, and lets it expire", () => {
    const { state, nonce } = makeState(7, 1_000);
    expect(readState(state, 2_000)).toEqual({ platformId: 7, nonce });
    const [payload, mac] = state.split(".");
    const forged = Buffer.from(JSON.stringify({ p: 8, n: nonce, e: 9e15 })).toString("base64url");
    expect(() => readState(`${forged}.${mac}`, 2_000)).toThrow(LtiError);
    expect(() => readState(`${payload}.${mac}`, 1_000 + 11 * 60_000)).toThrow(/too long/);
  });
});

describe("the routes", () => {
  let api: Harness;
  beforeEach(async () => {
    api = await startHarness();
  });
  afterEach(async () => {
    await api.stop();
  });

  it("publishes the tool's key and refuses a platform nobody connected", async () => {
    const jwks = await api.json<{ keys: { kty: string; kid: string }[] }>("/lti/jwks");
    expect(jwks.keys[0]).toMatchObject({ kty: "RSA" });
    const response = await api.call("/lti/login?iss=https%3A%2F%2Fnobody.test&login_hint=x", { redirect: "manual" });
    expect(response.status).toBe(400);
  });

  it("takes a student from their course to Mockio, signed in", async () => {
    const { privateKey, jwks } = platformKeys();
    const { id: _id, ...registration } = PLATFORM;
    const platform = await api.lti.register(registration);
    api.ltiKeys.set(platform.jwksUrl, jwks);

    const login = await api.call(
      `/lti/login?iss=${encodeURIComponent(platform.issuer)}&login_hint=abc&client_id=${platform.clientId}&lti_message_hint=m`,
      { redirect: "manual" },
    );
    expect(login.status).toBe(302);
    const redirect = new URL(login.headers.get("location")!);
    expect(redirect.origin + redirect.pathname).toBe(platform.authLoginUrl);
    expect(redirect.searchParams.get("login_hint")).toBe("abc");
    const state = redirect.searchParams.get("state")!;
    const nonce = redirect.searchParams.get("nonce")!;

    const launch = await api.call("/lti/launch", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: token(privateKey, launchClaims(nonce)), state }).toString(),
    });
    expect(launch.status).toBe(200);
    // Allowed inside the course's iframe, unlike every other page.
    expect(launch.headers.get("content-security-policy")).toBe("frame-ancestors *");
    const page = await launch.text();
    const next = page.match(/href="(\/lti\/continue\?pass=[^"]+)"/)![1]!.replace(/&amp;/g, "&");

    const signedIn = await api.call(next, { redirect: "manual" });
    expect(signedIn.status).toBe(302);
    expect(signedIn.headers.get("location")).toBe("/app");
    const me = await api.json<{ kind: string; email: string }>("/api/auth/me");
    expect(me).toMatchObject({ kind: "user", email: "ana.quispe@universidad.test" });

    // The pass is spent: the link cannot sign anyone in a second time.
    api.forget();
    const again = await api.call(next, { redirect: "manual" });
    expect(again.headers.get("location")).toBe("/signin");
  });

  it("takes a school's details and refuses a form without a way to answer", async () => {
    expect((await api.call("/api/b2b/lead", post({ name: "Rosa", email: "no", institution: "UNMSM" }))).status).toBe(400);
    const sent = await api.call(
      "/api/b2b/lead",
      post({ name: "Rosa Díaz", email: "rdiaz@unmsm.edu.pe", institution: "UNMSM", students: 300, platform: "moodle" }),
    );
    expect(sent.status).toBe(201);
  });

  it("keeps how an affiliate wants to be paid", async () => {
    await api.authenticate();
    expect((await api.call("/api/advisor/payout", { ...post({ method: "yape" }), method: "PUT" })).status).toBe(404);
    await api.call("/api/advisor", post({ name: "Dra. Rojas" }));
    expect((await api.call("/api/advisor/payout", { ...post({ method: "yape", account: "9" }), method: "PUT" })).status).toBe(400);
    const saved = await api.call("/api/advisor/payout", {
      ...post({ method: "yape", account: "999 111 222", holder: "Rosa Rojas" }),
      method: "PUT",
    });
    expect(saved.status).toBe(200);
    const dashboard = await api.json<{ advisor: { payout: { method: string } } }>("/api/advisor");
    expect(dashboard.advisor.payout.method).toBe("yape");
  });
});
