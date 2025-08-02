import { jest } from '@jest/globals'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}))

describe('profile cache', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://example.com'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
  })

  it('purges expired profiles', async () => {
    const {
      purgeProfileCache,
      __profileCache,
      CACHE_TTL,
      clearProfileCache,
    } = await import('../lib/supabase')

    clearProfileCache()
    const expiredTime = Date.now() - CACHE_TTL - 1000
    __profileCache.set('user1', { data: { id: 'user1' }, timestamp: expiredTime })

    purgeProfileCache()
    expect(__profileCache.size).toBe(0)
  })

  it('removes oldest profiles when limit exceeded', async () => {
    const {
      purgeProfileCache,
      __profileCache,
      PROFILE_CACHE_MAX,
      clearProfileCache,
    } = await import('../lib/supabase')

    clearProfileCache()
    for (let i = 0; i < PROFILE_CACHE_MAX + 1; i++) {
      __profileCache.set(`user${i}`, { data: { id: `user${i}` }, timestamp: Date.now() })
    }

    purgeProfileCache()

    expect(__profileCache.size).toBe(PROFILE_CACHE_MAX)
    expect(__profileCache.has('user0')).toBe(false)
    expect(__profileCache.has(`user${PROFILE_CACHE_MAX}`)).toBe(true)
  })
})
