import { describe, expect, it } from "vitest";

import {
  createInMemoryRateLimiter,
  rateLimitMessage,
  type RateLimitAction,
  type TokenBucketConfig,
} from "@/lib/rate-limit";

const LIMITS: Record<RateLimitAction, TokenBucketConfig> = {
  "comments:post": { capacity: 3, refillIntervalMs: 20_000 },
  "comments:edit": { capacity: 6, refillIntervalMs: 10_000 },
  "bookmarks:mutate": { capacity: 2, refillIntervalMs: 5_000 },
};

/** Limiter with a manually advanced clock. */
function createLimiter(startAt = 0) {
  let currentTime = startAt;
  const limiter = createInMemoryRateLimiter(LIMITS, () => currentTime);
  return {
    limiter,
    advance(ms: number) {
      currentTime += ms;
    },
  };
}

describe("createInMemoryRateLimiter", () => {
  it("allows a burst up to capacity, then denies", () => {
    const { limiter } = createLimiter();

    expect(limiter.consume("comments:post", "user-1")).toEqual({ ok: true });
    expect(limiter.consume("comments:post", "user-1")).toEqual({ ok: true });
    expect(limiter.consume("comments:post", "user-1")).toEqual({ ok: true });

    const denied = limiter.consume("comments:post", "user-1");
    expect(denied.ok).toBe(false);
  });

  it("reports how long until the next token", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume("comments:post", "user-1");

    const denied = limiter.consume("comments:post", "user-1");
    if (denied.ok) throw new Error("expected denial");
    // Bucket is empty; one token takes a full refill interval.
    expect(denied.retryAfterMs).toBe(20_000);
  });

  it("refills one token per interval and allows again", () => {
    const { limiter, advance } = createLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume("comments:post", "user-1");
    expect(limiter.consume("comments:post", "user-1").ok).toBe(false);

    advance(20_000);
    expect(limiter.consume("comments:post", "user-1").ok).toBe(true);
    // Only ONE token refilled — the next attempt is denied again.
    expect(limiter.consume("comments:post", "user-1").ok).toBe(false);
  });

  it("caps refill at capacity after a long quiet period", () => {
    const { limiter, advance } = createLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume("comments:post", "user-1");

    advance(24 * 60 * 60 * 1000); // a day later: full bucket, not more
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.consume("comments:post", "user-1").ok).toBe(true);
    }
    expect(limiter.consume("comments:post", "user-1").ok).toBe(false);
  });

  it("tracks subjects independently", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume("comments:post", "user-1");

    expect(limiter.consume("comments:post", "user-1").ok).toBe(false);
    expect(limiter.consume("comments:post", "user-2").ok).toBe(true);
  });

  it("tracks actions independently for the same subject", () => {
    const { limiter } = createLimiter();
    for (let i = 0; i < 3; i += 1) limiter.consume("comments:post", "user-1");

    expect(limiter.consume("comments:post", "user-1").ok).toBe(false);
    expect(limiter.consume("comments:edit", "user-1").ok).toBe(true);
    expect(limiter.consume("bookmarks:mutate", "user-1").ok).toBe(true);
  });

  it("shrinks retryAfterMs as time passes while denied", () => {
    const { limiter, advance } = createLimiter();
    for (let i = 0; i < 2; i += 1) limiter.consume("bookmarks:mutate", "user-1");

    const first = limiter.consume("bookmarks:mutate", "user-1");
    if (first.ok) throw new Error("expected denial");
    expect(first.retryAfterMs).toBe(5_000);

    advance(2_000);
    const second = limiter.consume("bookmarks:mutate", "user-1");
    if (second.ok) throw new Error("expected denial");
    expect(second.retryAfterMs).toBe(3_000);
  });

  it("keeps limiting correctly under many unique subjects (eviction path)", () => {
    const { limiter } = createLimiter();

    // Flood with unique subjects to push past the internal key cap.
    for (let i = 0; i < 10_050; i += 1) {
      expect(limiter.consume("bookmarks:mutate", `flood-${i}`).ok).toBe(true);
    }

    // A brand-new subject still gets its full burst.
    expect(limiter.consume("bookmarks:mutate", "fresh-user").ok).toBe(true);
    expect(limiter.consume("bookmarks:mutate", "fresh-user").ok).toBe(true);
    expect(limiter.consume("bookmarks:mutate", "fresh-user").ok).toBe(false);
  });
});

describe("rateLimitMessage", () => {
  it("rounds milliseconds up to whole seconds", () => {
    expect(rateLimitMessage({ ok: false, retryAfterMs: 1_200 })).toContain("2 seconds");
  });

  it("uses the singular for one second", () => {
    expect(rateLimitMessage({ ok: false, retryAfterMs: 900 })).toContain("1 second.");
  });

  it("never says zero seconds", () => {
    expect(rateLimitMessage({ ok: false, retryAfterMs: 1 })).toContain("1 second.");
  });
});
