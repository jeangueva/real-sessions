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
