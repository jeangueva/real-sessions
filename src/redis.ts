/**
 * One Redis connection, shared by the session store and the rate limiter.
 *
 * Two clients would mean two connections, two reconnect policies, and two
 * places to get the error handling wrong.
 */
import { createClient, type RedisClientType } from "redis";
import process from "node:process";

let client: RedisClientType | null = null;
let attempted = false;

/**
 * Returns the shared client, or null when Redis is not configured or is
 * unreachable outside production. In production both cases are fatal — running
 * without Redis silently loses interviews and multiplies rate limits by the
 * number of instances.
 */
export async function getRedis(): Promise<RedisClientType | null> {
  if (attempted) return client;
  attempted = true;

  const url = process.env.REDIS_URL;
  const production = process.env.NODE_ENV === "production";

  if (!url) {
    if (production) {
      throw new Error(
        "REDIS_URL is required in production — sessions must be durable and " +
          "rate limits must be shared across instances.",
      );
    }
    console.warn(
      "[techshadow] REDIS_URL unset — sessions and rate limits are per-process " +
        "and will not survive a restart.",
    );
    return null;
  }

  const candidate: RedisClientType = createClient({ url });
  // Without a listener, a later connection drop crashes the process.
  candidate.on("error", (error) => console.error("[techshadow] redis:", error));

  try {
    await candidate.connect();
  } catch (error) {
    if (production) throw error;
    console.warn(
      `[techshadow] Redis unreachable at ${url} — using per-process state for local dev. ` +
        `Cause: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }

  client = candidate;
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
  attempted = false;
}
