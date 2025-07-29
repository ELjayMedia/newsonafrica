import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithFallback } from '../lib/wordpress-api'
import * as apiHealth from '../lib/api-health'

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = global.fetch
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('fetchWithFallback', () => {
  it('bypasses GraphQL when health check fails', async () => {
    vi.spyOn(apiHealth, 'checkGraphQLHealth').mockResolvedValue(false)
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: vi.fn() })
    // @ts-ignore
    global.fetch = fetchSpy

    const restFallback = vi.fn().mockResolvedValue({ from: 'rest' })
    const result = await fetchWithFallback('query', {}, 'key', restFallback)

    expect(result).toEqual({ from: 'rest' })
    expect(restFallback).toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
