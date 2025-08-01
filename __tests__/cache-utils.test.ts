import { jest } from '@jest/globals'
import { TextEncoder, TextDecoder } from 'util'
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

describe('cachedFetch', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.useFakeTimers()
    ;(global as any).fetch = jest.fn()
    ;(global as any).TextEncoder = TextEncoder
    ;(global as any).TextDecoder = TextDecoder
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('re-fetches after cache expiration', async () => {
    const firstResponse = { value: 'first' }
    const secondResponse = { value: 'second' }
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => firstResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => secondResponse })

    const { cachedFetch, clearFetchCache } = await import('../lib/cache-utils')
    clearFetchCache()

    const url = 'https://example.com/data'

    const result1 = await cachedFetch(url, undefined, 1)
    expect(result1).toEqual(firstResponse)

    const result2 = await cachedFetch(url, undefined, 1)
    expect(result2).toEqual(firstResponse)
    expect(fetch).toHaveBeenCalledTimes(1)

    jest.advanceTimersByTime(1100)

    const result3 = await cachedFetch(url, undefined, 1)
    expect(result3).toEqual(secondResponse)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
