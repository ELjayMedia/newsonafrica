import assert from 'assert'

;(async () => {
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY = 'ng'
  process.env.NEXT_PUBLIC_WP_BASE_URL = 'http://example.com'

  const { CachePreloader } = await import('../lib/cache/cache-preloader')
  const preloader = new CachePreloader()
  let running = 0
  let maxRunning = 0

  // stub preloadPost to simulate async work
  ;(preloader as any).preloadPost = async () => {
    running++
    maxRunning = Math.max(maxRunning, running)
    await new Promise((resolve) => setTimeout(resolve, 50))
    running--
  }

  const posts = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    categories: [],
    tags: [],
  }))

  const promise = preloader.preloadPosts(posts, { maxConcurrent: 2 })

  // allow queue to start processing
  await new Promise((r) => setTimeout(r, 10))
  assert.strictEqual(preloader.getQueueSize(), 3, 'queue should have 3 pending jobs after start')

  // after first pair finishes, one job should remain queued
  await new Promise((r) => setTimeout(r, 70))
  assert.strictEqual(preloader.getQueueSize(), 1, 'queue should shrink as jobs complete')

  await promise

  assert.strictEqual(maxRunning, 2, 'should not exceed maxConcurrent jobs')
  assert.strictEqual(preloader.getQueueSize(), 0, 'queue should be empty after processing')

  console.log('cachePreloaderConcurrency test passed')
  process.exit(0)
})()
