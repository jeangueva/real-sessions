import { afterAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import process from "node:process";
import {
  createProgressStore,
  seedCatalogue,
  type ProgressStore,
} from "../src/progress-store.js";
import { migrate } from "../src/db/index.js";
import { computeMetrics } from "../src/metrics.js";
import { SAMPLE_EVALUATION } from "./fixtures.js";
import type { RecordedTurn } from "../src/progress-store.js";

/**
 * Both implementations run the same suite.
 *
 * Memory is not a stand-in for the real store here — it is what local
 * development runs on, so a behaviour that differs between the two is a bug
 * that only shows up in production. The Postgres pass is skipped when
 * DATABASE_URL is unset so the suite still runs on a machine without a
 * database, and the memory pass alone would then be the thing being trusted.
 */
/**
 * Never DATABASE_URL. These tests write real rows, and pointing them at the
 * development database put test XP on the developer's own leaderboard — which
 * is how this variable came to be separate.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;

const pools: pg.Pool[] = [];

async function postgresStore(): Promise<ProgressStore> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  await migrate(pool);
  // `sessions.sector_id` references `sectors`, so a session cannot be written
  // against an unseeded database. The server does exactly this at boot.
  await seedCatalogue(pool);
  pools.push(pool);
  return createProgressStore(pool);
}

afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
});

const TURNS: RecordedTurn[] = [
  { idx: 0, speaker: "interviewer", text: "Tell me about a hard tradeoff.", tStartMs: 0, tEndMs: 3_000 },
  { idx: 1, speaker: "candidate", text: "we cut the export feature to ship on time", tStartMs: 5_000, tEndMs: 11_000 },
];

const backends: [string, () => Promise<ProgressStore>][] = [
  ["memory", async () => createProgressStore(null)],
  ...(DATABASE_URL ? ([["postgres", postgresStore]] as [string, () => Promise<ProgressStore>][]) : []),
];

describe.each(backends)("progress store (%s)", (_name, make) => {
  let store: ProgressStore;
  let owner: string;

  beforeEach(async () => {
    store = await make();
    // A fresh owner per test, so the Postgres pass does not need truncation
    // between runs and cannot be polluted by an earlier one.
    owner = `owner-${randomUUID()}`;
  });

  async function seedSession(overrides: Partial<Parameters<ProgressStore["createSession"]>[0]> = {}) {
    const id = randomUUID();
    await store.createSession({
      id,
      ownerId: owner,
      company: "Stripe",
      sectorId: "fintech",
      level: "b2",
      role: "Growth PM",
      stage: "Behavioral",
      mode: "practice",
      personaId: "skeptic",
      ...overrides,
    });
    return id;
  }

  it("stores a session before it has been completed", async () => {
    const id = await seedSession();
    const [summary] = await store.listSessions(owner);
    expect(summary?.id).toBe(id);
    expect(summary?.completedAt).toBeNull();
    expect(summary?.score).toBeNull();
  });

  async function seedApplication(overrides: Record<string, unknown> = {}) {
    const id = randomUUID();
    await store.createApplication({
      id,
      ownerId: owner,
      company: "Nubank",
      role: "Growth PM",
      posting: "We are looking for a PM who has owned activation.",
      status: "interested",
      ...overrides,
    });
    return id;
  }

  it("keeps the posting so a second rehearsal does not need it pasted again", async () => {
    const id = await seedApplication();
    const application = await store.getApplication(owner, id);
    expect(application?.posting).toContain("owned activation");
    expect(application?.status).toBe("interested");
  });

  it("counts the rehearsals and reports the best score for one application", async () => {
    const applicationId = await seedApplication();
    const weak = await seedSession({ applicationId });
    const strong = await seedSession({ applicationId });
    // A session with no application attached must not be counted against it.
    await seedSession();

    await store.recordTurns(weak, TURNS);
    await store.completeSession({
      sessionId: weak,
      score: 54,
      evaluation: SAMPLE_EVALUATION,
      metrics: computeMetrics(TURNS),
    });
    await store.recordTurns(strong, TURNS);
    await store.completeSession({
      sessionId: strong,
      score: 71,
      evaluation: SAMPLE_EVALUATION,
      metrics: computeMetrics(TURNS),
    });

    const [summary] = await store.listApplications(owner);
    expect(summary?.sessions).toBe(2);
    expect(summary?.bestScore).toBe(71);
  });

  it("reports no best score rather than zero before anything is scored", async () => {
    const applicationId = await seedApplication();
    await seedSession({ applicationId });
    const [summary] = await store.listApplications(owner);
    expect(summary?.sessions).toBe(1);
    // Zero would read on the screen as a score of zero, which is a different
    // and much worse statement than "nothing yet".
    expect(summary?.bestScore).toBeNull();
  });

  it("moves an application through its states", async () => {
    const id = await seedApplication();
    const updated = await store.updateApplication(owner, id, { status: "interviewing" });
    expect(updated?.status).toBe("interviewing");
    // The fields not in the patch survive it.
    expect(updated?.company).toBe("Nubank");
    expect(updated?.posting).toContain("owned activation");
  });

  it("will not read or change an application belonging to somebody else", async () => {
    const id = await seedApplication();
    const stranger = `owner-${randomUUID()}`;
    expect(await store.getApplication(stranger, id)).toBeNull();
    expect(await store.updateApplication(stranger, id, { status: "offer" })).toBeNull();
    await store.deleteApplication(stranger, id);
    // Still there, and still as it was.
    expect((await store.getApplication(owner, id))?.status).toBe("interested");
  });

  it("never returns the owner id with an application", async () => {
    const id = await seedApplication();
    const application = await store.getApplication(owner, id);
    // The memory store holds the whole row and the Postgres one names its
    // fields; without this they would disagree about what an application is.
    expect(application).not.toHaveProperty("ownerId");
    expect(Object.keys(application ?? {}).sort()).toEqual(
      ["company", "createdAt", "id", "posting", "role", "status", "updatedAt"],
    );
  });

  it("keeps the practice when the application is deleted", async () => {
    const applicationId = await seedApplication();
    const sessionId = await seedSession({ applicationId });
    await store.deleteApplication(owner, applicationId);

    expect(await store.getApplication(owner, applicationId)).toBeNull();
    // The posting was theirs; the practice is the candidate's, and the
    // progress chart is built from it.
    expect((await store.getSession(owner, sessionId))?.id).toBe(sessionId);
    expect(await store.listApplications(owner)).toEqual([]);
  });

  it("mints a share token and resolves the report by it", async () => {
    const id = await seedSession();
    const token = await store.shareSession(owner, id);
    expect(token).toBeTruthy();
    const shared = await store.sessionByShareToken(token!);
    expect(shared?.id).toBe(id);
  });

  it("returns the same token when the same session is shared twice", async () => {
    const id = await seedSession();
    const first = await store.shareSession(owner, id);
    const second = await store.shareSession(owner, id);
    // A fresh token on the second click would revoke a link already sent to
    // somebody, which looks like the feature breaking when used correctly.
    expect(second).toBe(first);
  });

  it("will not share a session belonging to somebody else", async () => {
    const id = await seedSession();
    const stranger = `owner-${randomUUID()}`;
    expect(await store.shareSession(stranger, id)).toBeNull();
    expect(await store.getSession(stranger, id)).toBeNull();
    // And the owner's own session is still unshared, so the refused attempt
    // did not mint a token for it as a side effect.
    const [summary] = await store.listSessions(owner);
    expect(summary?.shareToken).toBeNull();
  });

  it("does not resolve an unknown token", async () => {
    await seedSession();
    expect(await store.sessionByShareToken("not-a-real-token")).toBeNull();
  });

  it("stops resolving the token once sharing is revoked", async () => {
    const id = await seedSession();
    const token = await store.shareSession(owner, id);
    await store.unshareSession(owner, id);
    expect(await store.sessionByShareToken(token!)).toBeNull();
    const [summary] = await store.listSessions(owner);
    expect(summary?.shareToken).toBeNull();
  });

  it("will not revoke a share on somebody else's session", async () => {
    const id = await seedSession();
    const token = await store.shareSession(owner, id);
    await store.unshareSession(`owner-${randomUUID()}`, id);
    expect((await store.sessionByShareToken(token!))?.id).toBe(id);
  });

  it("shows on the summary whether a session is shared", async () => {
    const id = await seedSession();
    expect((await store.listSessions(owner))[0]?.shareToken).toBeNull();
    const token = await store.shareSession(owner, id);
    expect((await store.listSessions(owner))[0]?.shareToken).toBe(token);
    expect((await store.getSession(owner, id))?.shareToken).toBe(token);
  });

  it("round-trips turns with their timings", async () => {
    const id = await seedSession();
    await store.recordTurns(id, TURNS);
    const detail = await store.getSession(owner, id);
    expect(detail?.turns).toEqual(TURNS);
  });

  it("keeps timings a later rewrite does not carry", async () => {
    const id = await seedSession();
    await store.recordTurns(id, TURNS);
    // The evaluation path rewrites the transcript with no timings attached.
    // Assigning instead of coalescing here erased them, and every spoken
    // session silently recorded as typed.
    await store.recordTurns(
      id,
      TURNS.map((turn) => ({ ...turn, tStartMs: null, tEndMs: null })),
    );
    const detail = await store.getSession(owner, id);
    expect(detail?.turns).toEqual(TURNS);
    expect(computeMetrics(detail!.turns).fromSpeech).toBe(true);
  });

  it("rewrites a turn rather than duplicating it", async () => {
    const id = await seedSession();
    await store.recordTurns(id, TURNS);
    // The server rewrites the whole transcript on every write, so this is the
    // normal path, not an edge case.
    await store.recordTurns(id, [
      ...TURNS,
      { idx: 2, speaker: "interviewer", text: "What did that cost?", tStartMs: 12_000, tEndMs: 14_000 },
    ]);
    const detail = await store.getSession(owner, id);
    expect(detail?.turns).toHaveLength(3);
  });

  it("keeps the evaluation out of the list payload", async () => {
    const id = await seedSession();
    await store.recordTurns(id, TURNS);
    await store.completeSession({
      sessionId: id,
      score: 72,
      evaluation: SAMPLE_EVALUATION,
      metrics: computeMetrics(TURNS),
    });

    const [summary] = await store.listSessions(owner);
    expect(summary).not.toHaveProperty("evaluation");
    expect(summary?.score).toBe(72);
    // Metrics do travel with the summary — the history list plots them.
    expect(summary?.metrics?.words).toBe(9);

    const detail = await store.getSession(owner, id);
    expect(detail?.evaluation).toEqual(SAMPLE_EVALUATION);
  });

  it("scopes every read to its owner", async () => {
    const id = await seedSession();
    expect(await store.getSession("someone-else", id)).toBeNull();
    expect(await store.listSessions("someone-else")).toEqual([]);
  });

  it("lists newest first", async () => {
    const older = await seedSession();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newer = await seedSession();
    const ids = (await store.listSessions(owner)).map((entry) => entry.id);
    expect(ids.indexOf(newer)).toBeLessThan(ids.indexOf(older));
  });

  it("folds the xp log into a total", async () => {
    await store.addXp(owner, null, [
      { kind: "completed", amount: 50 },
      { kind: "score", amount: 30 },
    ]);
    expect((await store.profile(owner)).xp).toBe(80);
  });

  it("awards a badge once and reports only what is new", async () => {
    const id = await seedSession();
    expect(await store.awardBadges(owner, ["first-session"], id)).toEqual([
      "first-session",
    ]);
    // A retried evaluation must not re-announce a badge already held.
    expect(await store.awardBadges(owner, ["first-session"], id)).toEqual([]);
    expect((await store.profile(owner)).badges).toHaveLength(1);
  });

  it("counts xp against the day it was granted", async () => {
    await store.addXp(owner, null, [{ kind: "completed", amount: 50 }]);
    const today = new Date().toISOString().slice(0, 10);
    expect(await store.xpOnDay(owner, today)).toBe(50);
    expect(await store.xpOnDay(owner, "2020-01-01")).toBe(0);
  });

  it("moves a guest's whole record onto an account", async () => {
    const id = await seedSession();
    await store.recordTurns(id, TURNS);
    await store.addXp(owner, id, [{ kind: "completed", amount: 50 }]);
    await store.awardBadges(owner, ["first-session"], id);

    const account = `account-${randomUUID()}`;
    expect(await store.transfer(owner, account)).toBe(1);

    expect(await store.listSessions(owner)).toEqual([]);
    expect((await store.listSessions(account)).map((entry) => entry.id)).toEqual([id]);
    expect((await store.profile(account)).xp).toBe(50);
    expect((await store.profile(account)).badges).toHaveLength(1);
  });

  it("does not collide when both sides hold the same badge", async () => {
    const account = `account-${randomUUID()}`;
    await seedSession();
    await store.awardBadges(owner, ["first-session"], null);
    await store.awardBadges(account, ["first-session"], null);

    // The badge table is keyed on (owner, badge); a naive move would violate it.
    await expect(store.transfer(owner, account)).resolves.toBeGreaterThanOrEqual(0);
    expect((await store.profile(account)).badges).toHaveLength(1);
  });

  it("is a no-op when transferring onto itself", async () => {
    expect(await store.transfer(owner, owner)).toBe(0);
  });
});
