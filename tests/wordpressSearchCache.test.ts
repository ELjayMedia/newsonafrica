import assert from 'assert'
import { searchWordPressPosts, clearSearchCache, getSearchCacheStats } from '../lib/wordpress-search'

;(async () => {
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY = 'ng'
  process.env.NEXT_PUBLIC_WP_BASE_URL = 'https://example.com'

  // Mock time
  let now = 0
  const realNow = Date.now
  Date.now = () => now

  // Mock fetch
  let fetchCalls = 0
  const originalFetch = global.fetch
  global.fetch = async () => {
    fetchCalls++
    return {
      ok: true,
      json: async () => [
        {
          id: 1,
          title: { rendered: 't' },
          excerpt: { rendered: '' },
          content: { rendered: '' },
          slug: 's',
          date: '2020-01-01',
          link: 'l',
          featured_media: 0,
          categories: [],
          tags: [],
          author: 0,
        },
      ],
      headers: new Map([
        ['X-WP-Total', '1'],
        ['X-WP-TotalPages', '1'],
      ]),
    } as any
  }

  clearSearchCache()

  // First call - should miss cache and populate
  await searchWordPressPosts('query')
  let stats = getSearchCacheStats()
  assert.strictEqual(stats.hits, 0, 'no hits after first call')
  assert.strictEqual(stats.misses, 1, 'one miss after first call')
  assert.strictEqual(stats.size, 1, 'cache should have one entry')
  assert.strictEqual(fetchCalls, 1, 'fetch called once')

  // Second call - should hit cache
  await searchWordPressPosts('query')
  stats = getSearchCacheStats()
  assert.strictEqual(stats.hits, 1, 'cache hit recorded')
  assert.strictEqual(stats.misses, 1, 'miss count unchanged')
  assert.strictEqual(stats.size, 1, 'cache still has one entry')
  assert.strictEqual(fetchCalls, 1, 'fetch not called again')

  // Advance time beyond TTL to trigger eviction
  now = 5 * 60 * 1000 + 1
  stats = getSearchCacheStats()
  assert.strictEqual(stats.size, 0, 'expired entry should be evicted')

  // Third call - should miss and repopulate
  await searchWordPressPosts('query')
  stats = getSearchCacheStats()
  assert.strictEqual(stats.hits, 1, 'hits remain from previous cached call')
  assert.strictEqual(stats.misses, 2, 'miss count incremented')
  assert.strictEqual(stats.size, 1, 'cache repopulated after miss')
  assert.strictEqual(fetchCalls, 2, 'fetch called again after eviction')

  // Restore globals
  global.fetch = originalFetch
  Date.now = realNow

  console.log('wordpressSearchCache test passed')
  process.exit(0)
})()
