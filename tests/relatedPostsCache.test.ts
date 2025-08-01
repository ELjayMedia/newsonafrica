import assert from 'assert'
import { RelatedPostsCache } from '../lib/cache/related-posts-cache'

(async () => {
  const cache = new RelatedPostsCache({ ttl: 100, maxEntries: 10, maxSize: 5000 })
  cache.set('1', [], [], 5, [{ id: 'a', title: 't', excerpt: '', slug: 's', date: '' } as any])
  assert.strictEqual(cache.getSize(), 1, 'cache should have one entry')
  await new Promise(r => setTimeout(r, 150))
  cache.cleanup()
  assert.strictEqual(cache.getSize(), 0, 'expired entry should be cleaned up')
  console.log('relatedPostsCache test passed')
  process.exit(0)
})()
