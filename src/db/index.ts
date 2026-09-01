/**
 * The durable half of storage.
 *
 * Redis holds what is in flight — the live interview, the rate-limit counters.
 * Postgres holds what has to still be there tomorrow: transcripts with their
 * timings, the metrics derived from them, and the XP those add up to. Progress
 * over months is the product; a store with a TTL cannot express it.
 *
 * The availability rule matches redis.ts deliberately, so both dependencies
 * behave the same way: unset locally means degrade with a warning, unset in
 * production is fatal. Losing progress silently is worse than not booting.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
export type DbPool = pg.Pool;

let pool: DbPool | null = null;
let attempted = false;

const here = path.dirname(fileURLToPath(import.meta.url));

export async function getDb(): Promise<DbPool | null> {
  if (attempted) return pool;
  attempted = true;

  const url = process.env.DATABASE_URL;
  const production = process.env.NODE_ENV === "production";

  if (!url) {
    if (production) {
      throw new Error(
        "DATABASE_URL is required in production — progress, metrics and badges " +
          "must outlive a restart.",
      );
    }
    console.warn(
      "[realsessions] DATABASE_URL unset — transcripts, metrics and progress are " +
        "per-process and will not survive a restart.",
    );
    return null;
  }

  const candidate = new Pool({
    connectionString: url,
    // A pool that queues forever turns a dead database into hung requests
    // rather than failed ones, which is far harder to diagnose.
    connectionTimeoutMillis: 5_000,
    max: 10,
  });
  // Without a listener an idle-client error takes the process down.
  candidate.on("error", (error) => console.error("[realsessions] postgres:", error));

  try {
    await candidate.query("SELECT 1");
    await migrate(candidate);
  } catch (error) {
    await candidate.end().catch(() => undefined);
    if (production) throw error;
    console.warn(
      `[realsessions] Postgres unreachable at ${redact(url)} — using per-process ` +
        `progress for local dev. Cause: ${
          error instanceof Error ? error.message : String(error)
        }`,
    );
    return null;
  }

  pool = candidate;
  return pool;
}

/**
 * Applies schema.sql. Every statement in it is `IF NOT EXISTS`, so this runs on
 * every boot and is a no-op once the schema is current — no migration table,
 * no ordering to get wrong, and no deploy step that can be forgotten.
 */
export async function migrate(client: DbPool): Promise<void> {
  const sql = await readFile(path.join(here, "schema.sql"), "utf8");
  await client.query(sql);
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  attempted = false;
}

/** Keeps the password out of a log line that exists to help someone debug. */
function redact(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "***";
    return parsed.toString();
  } catch {
    return "the configured URL";
  }
}
