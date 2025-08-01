import assert from 'assert'
;(async () => {
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY = 'ng'
  process.env.NEXT_PUBLIC_WP_BASE_URL = 'https://example.com/'
  const {
    getLatestPostsForCountry,
    getCategoriesForCountry,
    getFeaturedPosts,
  } = await import('../lib/api/wordpress')
  const originalFetch = global.fetch as any
  const calledUrls: string[] = []
  global.fetch = async (url: any, options: any) => {
    calledUrls.push(String(url))
    return {
      ok: true,
      json: async () => ({
        data: {
          posts: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
          categories: { nodes: [] },
        },
      }),
    } as any
  }

  await getLatestPostsForCountry('ng', 1)
  await getCategoriesForCountry('ng')
  await getFeaturedPosts(1, 'ng')

  global.fetch = originalFetch

  assert.ok(calledUrls.every(u => u.includes('/ng/')), `URLs should contain /ng/: ${calledUrls}`)
  console.log('wordpressEndpoints test passed')
  process.exit(0)
})()
