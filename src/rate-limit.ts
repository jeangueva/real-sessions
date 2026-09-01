/**
 * Fixed-window rate limiting.
 *
 * Every endpoint here spends money on model calls, so the limits are about
 * cost as much as abuse. They are tuned per route: starting an interview and
 * asking for an evaluation are the expensive operations, answering a turn is
 * the common one.
 *
 * Counters live in Redis so N instances enforce one shared limit rather than
 * N times the intended one.
 */
import type { RedisClientType } from "redis";

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

export const RULES = {
  /** Identity issuance, keyed by IP — the only route an anonymous caller hits. */
  auth: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Each start burns a model call and holds memory for an hour. */
  startSession: { limit: 12, windowMs: 60 * 60 * 1000 },
  /** Normal conversation pace, with headroom for retries. */
  answer: { limit: 120, windowMs: 60 * 60 * 1000 },
  /** The single most expensive call in the product. */
  evaluation: { limit: 20, windowMs: 60 * 60 * 1000 },
  /** Sign-up, per IP. Generous for a shared office, tight for a script. */
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  /**
   * Sign-in. Applied per IP *and* per email address: per-IP alone lets a
   * botnet spread guesses across addresses, per-email alone lets one attacker
   * lock a victim out by failing their login repeatedly. Both, and the
   * per-email counter only counts failures.
   */
  loginByIp: { limit: 20, windowMs: 15 * 60 * 1000 },
  loginByEmail: { limit: 8, windowMs: 15 * 60 * 1000 },
  /**
   * Reset requests. Limited per email as well as per IP so the endpoint cannot
   * be used to flood someone's inbox with reset mail they did not ask for.
   */
  forgotByIp: { limit: 10, windowMs: 60 * 60 * 1000 },
  forgotByEmail: { limit: 3, windowMs: 60 * 60 * 1000 },
  /** Guessing a 256-bit token is hopeless, but the attempt should still cost. */
  resetByIp: { limit: 20, windowMs: 60 * 60 * 1000 },
  /**
   * Re-sending a verification mail. Tight, because the endpoint is
   * authenticated and its only abuse is mailing yourself repeatedly.
   */
  verifyResend: { limit: 5, windowMs: 60 * 60 * 1000 },
  verifyByIp: { limit: 20, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — sent as Retry-After on a 429. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  readonly kind: "redis" | "memory";
  consume(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

const KEY_PREFIX = "rs:rl:";

/**
 * Increment and expiry must be one atomic step. As two commands, a process
 * that dies between them leaves a key with no TTL — and that caller is then
 * rate-limited forever, with nothing to explain why.
 */
const INCREMENT_AND_EXPIRE = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('PTTL', KEYS[1])}
`;

class RedisRateLimiter implements RateLimiter {
  readonly kind = "redis" as const;
  constructor(private readonly client: RedisClientType) {}

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    let count: number;
    let ttlMs: number;

    try {
      const reply = (await this.client.eval(INCREMENT_AND_EXPIRE, {
        keys: [KEY_PREFIX + key],
        arguments: [String(rule.windowMs)],
      })) as [number, number];
      [count, ttlMs] = reply;
    } catch (error) {
      // Redis being down must not take the API down with it. Failing open
      // risks cost; failing closed locks every user out of a working product.
      // Open is the lesser harm, and it is logged rather than silent.
      console.error("[realsessions] rate limiter unavailable, allowing:", error);
      return {
        allowed: true,
        remaining: 0,
        retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1000));
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfterSeconds,
    };
  }
}

interface Window {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter implements RateLimiter {
  readonly kind = "memory" as const;
  private readonly windows = new Map<string, Window>();

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    return this.consumeAt(key, rule, Date.now());
  }

  /** Time-injectable variant, so window expiry is testable without waiting. */
  consumeAt(key: string, rule: RateLimitRule, now: number): RateLimitResult {
    const existing = this.windows.get(key);

    if (!existing || existing.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + rule.windowMs });
      return {
        allowed: true,
        remaining: rule.limit - 1,
        retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      };
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );

    if (existing.count >= rule.limit) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    existing.count += 1;
    return {
      allowed: true,
      remaining: rule.limit - existing.count,
      retryAfterSeconds,
    };
  }

  /** Drops expired windows so the map does not grow without bound. */
  sweep(now = Date.now()): void {
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }

  reset(): void {
    this.windows.clear();
  }
}

export function createRateLimiter(client: RedisClientType | null): RateLimiter {
  return client ? new RedisRateLimiter(client) : new MemoryRateLimiter();
}
