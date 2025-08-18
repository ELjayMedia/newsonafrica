import { describe, it, expect, vi } from 'vitest'
import { RelatedPostsCache } from '../related-posts-cache'
import type { WordPressPost } from '../../api/wordpress'

function createPost(id: string): WordPressPost {
  return {
    id,
    title: `title-${id}`,
    excerpt: 'excerpt',
    slug: `slug-${id}`,
    date: '2024-01-01',
    author: { node: { id: 'a', name: 'author', slug: 'author' } },
    categories: { nodes: [] },
    tags: { nodes: [] },
  }
}

describe('RelatedPostsCache', () => {
  it('stores and retrieves posts', () => {
    const cache = new RelatedPostsCache({ ttl: 1000, maxEntries: 10, maxSize: 1024 * 1024 })
    const post = createPost('1')
    cache.set('1', [], [], 5, [post])
    expect(cache.get('1', [], [], 5)).toEqual([post])
  })

  it('expires entries based on TTL', () => {
    vi.useFakeTimers()
    const cache = new RelatedPostsCache({ ttl: 50 })
    const post = createPost('1')
    cache.set('1', [], [], 5, [post])
    vi.advanceTimersByTime(60)
    expect(cache.get('1', [], [], 5)).toBeNull()
    vi.useRealTimers()
  })

  it('evicts least recently used entries', () => {
    const cache = new RelatedPostsCache({ ttl: 1000, maxEntries: 2, maxSize: 1024 * 1024 })
    const post1 = createPost('1')
    const post2 = createPost('2')
    const post3 = createPost('3')

    cache.set('1', [], [], 5, [post1])
    cache.set('2', [], [], 5, [post2])
    // Access first entry to make it most recently used
    expect(cache.get('1', [], [], 5)).toEqual([post1])

    cache.set('3', [], [], 5, [post3])

    expect(cache.get('2', [], [], 5)).toBeNull()
    expect(cache.get('1', [], [], 5)).toEqual([post1])
    expect(cache.get('3', [], [], 5)).toEqual([post3])
  })

  it('tracks cache statistics', () => {
    const cache = new RelatedPostsCache({ ttl: 1000, maxEntries: 2, maxSize: 1024 * 1024 })
    const post = createPost('1')
    cache.set('1', [], [], 5, [post])

    // Hit
    cache.get('1', [], [], 5)
    // Miss
    cache.get('2', [], [], 5)

    const stats = cache.getStats()
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.entryCount).toBe(1)
    expect(stats.hitRate).toBeCloseTo(0.5)
  })
})

