/**
 * Rate limiting for user-triggered mutations (NOA-103), adapted from
 * `legacy/lib/rateLimit.ts` (fixed-window counter) into a token bucket:
 * each (action, subject) pair gets `capacity` tokens; a mutation spends
 * one; tokens refill continuously at one per `refillIntervalMs`. Bursts up
 * to `capacity` are fine, sustained abuse is throttled, and there's no
 * fixed-window edge burst (2×limit straddling a window boundary).
 *
 * The default store is in-memory (per server process) — the right
 * trade-off while the app runs on a single Node server; limits are a
 * courtesy brake, not a security boundary (RLS is). The `RateLimiter`
 * interface is deliberately tiny so a Redis/Upstash-backed implementation
 * can be swapped in behind `getRateLimiter()` when the app scales out.
 *
 * Client-safe module (no server-only import) so unit tests and client-side
 * validation could share the types; actual enforcement happens in server
 * actions.
 */

export interface TokenBucketConfig {
  /** Maximum burst: tokens available after a quiet period. */
  capacity: number;
  /** Time to regenerate ONE token. Sustained rate = 1 action per interval. */
  refillIntervalMs: number;
}

/**
 * Per-action limits. Tune here — sustained rate is 1/refillIntervalMs with
 * bursts up to capacity, e.g. comments:post allows 3 quick comments, then
 * one every 20s.
 */
export const RATE_LIMITS = {
  /** Posting a new comment or reply. */
  "comments:post": { capacity: 3, refillIntervalMs: 20_000 },
  /** Editing or soft-deleting an existing comment. */
  "comments:edit": { capacity: 6, refillIntervalMs: 10_000 },
  /** Saving/unsaving bookmarks (cheap, idempotent — generous). */
  "bookmarks:mutate": { capacity: 20, refillIntervalMs: 3_000 },
} as const satisfies Record<string, TokenBucketConfig>;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export type RateLimitDecision =
  | { ok: true }
  | {
      ok: false;
      /** Milliseconds until the next token is available. Always > 0. */
      retryAfterMs: number;
    };

/** The swappable limiter contract: spend one token for subject's action. */
export interface RateLimiter {
  consume(action: RateLimitAction, subject: string): RateLimitDecision;
}

/** Keeps the key space bounded if many unique users burst at once. */
const MAX_TRACKED_KEYS = 10_000;

interface BucketState {
  tokens: number;
  /** Timestamp of the last refill computation. */
  updatedAt: number;
}

/**
 * In-memory token-bucket limiter. `now` is injectable for tests.
 */
export function createInMemoryRateLimiter(
  limits: Record<RateLimitAction, TokenBucketConfig> = RATE_LIMITS,
  now: () => number = Date.now,
): RateLimiter {
  const buckets = new Map<string, BucketState>();

  function evictIfNeeded(timestamp: number): void {
    if (buckets.size < MAX_TRACKED_KEYS) return;

    // First pass: drop buckets that have fully refilled — they carry no
    // state a fresh bucket wouldn't have.
    for (const [key, bucket] of buckets) {
      if (bucket.tokens >= maxCapacity(limits) || timestamp - bucket.updatedAt > maxFullRefillMs(limits)) {
        buckets.delete(key);
      }
    }
    if (buckets.size < MAX_TRACKED_KEYS) return;

    // Still full (pathological): drop the least-recently-used entry so new
    // users are never locked out of being tracked.
    let oldestKey: string | undefined;
    let oldestUpdatedAt = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of buckets) {
      if (bucket.updatedAt < oldestUpdatedAt) {
        oldestUpdatedAt = bucket.updatedAt;
        oldestKey = key;
      }
    }
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  return {
    consume(action, subject) {
      const config = limits[action];
      const timestamp = now();
      const key = `${action}:${subject}`;

      const existing = buckets.get(key);
      if (!existing) evictIfNeeded(timestamp);

      // Lazy continuous refill since the last touch.
      const refilled = existing
        ? Math.min(
            config.capacity,
            existing.tokens + (timestamp - existing.updatedAt) / config.refillIntervalMs,
          )
        : config.capacity;

      if (refilled >= 1) {
        buckets.set(key, { tokens: refilled - 1, updatedAt: timestamp });
        return { ok: true };
      }

      buckets.set(key, { tokens: refilled, updatedAt: timestamp });
      return {
        ok: false,
        retryAfterMs: Math.ceil((1 - refilled) * config.refillIntervalMs),
      };
    },
  };
}

function maxCapacity(limits: Record<RateLimitAction, TokenBucketConfig>): number {
  return Math.max(...Object.values(limits).map((config) => config.capacity));
}

function maxFullRefillMs(limits: Record<RateLimitAction, TokenBucketConfig>): number {
  return Math.max(...Object.values(limits).map((config) => config.capacity * config.refillIntervalMs));
}

// Singleton stored on globalThis so dev-mode HMR / route-level module
// re-evaluation doesn't reset everyone's buckets.
const globalScope = globalThis as typeof globalThis & { __noaRateLimiter?: RateLimiter };

/** The process-wide limiter used by server actions. */
export function getRateLimiter(): RateLimiter {
  globalScope.__noaRateLimiter ??= createInMemoryRateLimiter();
  return globalScope.__noaRateLimiter;
}

/** User-facing message for a denied decision. */
export function rateLimitMessage(decision: Extract<RateLimitDecision, { ok: false }>): string {
  const seconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
  return `You're doing that too quickly. Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}
