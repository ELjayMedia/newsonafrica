import { describe, expect, it, vi } from 'vitest'

// Tests for rateLimitMiddleware's cleanup and bounding behaviour

describe('rateLimitMiddleware cleanup', () => {
  it('removes expired entries and maintains rate limiting', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const {
      rateLimitMiddleware,
      ipRequestCounts,
      RATE_LIMIT,
      RATE_LIMIT_PERIOD,
      CLEANUP_INTERVAL,
    } = await import('./rateLimit')

    const req = { ip: '1.1.1.1' } as any

    // Exhaust the limit
    for (let i = 0; i < RATE_LIMIT; i++) {
      const res = rateLimitMiddleware(req)
      expect(res.status).toBe(200)
    }

    const limitedRes = rateLimitMiddleware(req)
    expect(limitedRes.status).toBe(429)
    expect(ipRequestCounts.size).toBe(1)

    // Advance time beyond the rate limit window and run cleanup
    vi.advanceTimersByTime(RATE_LIMIT_PERIOD + CLEANUP_INTERVAL)
    vi.runOnlyPendingTimers()

    // Entry should be cleaned up
    expect(ipRequestCounts.size).toBe(0)

    // Rate limiting should reset
    const resAfter = rateLimitMiddleware(req)
    expect(resAfter.status).toBe(200)
    expect(resAfter.headers.get('X-RateLimit-Remaining')).toBe(String(RATE_LIMIT - 1))

    ipRequestCounts.clear()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('bounds the map size', async () => {
    vi.resetModules()
    const { rateLimitMiddleware, ipRequestCounts, MAX_IP_ENTRIES } = await import('./rateLimit')

    for (let i = 0; i < MAX_IP_ENTRIES + 10; i++) {
      const req = { ip: `192.168.0.${i}` } as any
      rateLimitMiddleware(req)
    }

    expect(ipRequestCounts.size).toBe(MAX_IP_ENTRIES)

    ipRequestCounts.clear()
  })
})
