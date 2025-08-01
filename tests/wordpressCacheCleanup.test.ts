import assert from 'assert'

;(async () => {
  const wp: any = await import('../lib/api/wordpress')

  // Mock time
  let now = 0
  const realNow = Date.now
  Date.now = () => now

  // Mock fetch for GraphQL request
  const originalFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        category: {
          id: '1',
          name: 'Sports',
          slug: 'sports',
          description: '',
          posts: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
        },
      },
    }),
  }) as any

  wp.clearCategoryCache()

  await wp.getPostsByCategory('sports')
  assert.strictEqual(wp.getCategoryCacheSize(), 1, 'cache should have one entry')

  // Advance time beyond TTL to trigger expiration
  now = 5 * 60 * 1000 + 1000
  assert.strictEqual(wp.getCategoryCacheSize(), 0, 'expired entry should be cleaned up')

  // Restore globals
  global.fetch = originalFetch
  Date.now = realNow
  console.log('wordpressCacheCleanup test passed')
  process.exit(0)
})()
