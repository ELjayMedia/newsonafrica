import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/wordpress/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wordpress/client')>(
    '@/lib/wordpress/client',
  )

  return {
    ...actual,
    fetchWordPressGraphQL: vi.fn(),
  }
})

import * as articleData from './article-data'

const {
  buildArticleCountryPriority,
  loadArticle,
  loadArticleWithFallback,
  normalizeCountryCode,
} = articleData
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { CACHE_DURATIONS } from '@/lib/cache/constants'
import { POST_BY_SLUG_QUERY } from '@/lib/wordpress-queries'
import { cacheTags } from '@/lib/cache'

describe('article-data', () => {
  beforeEach(() => {
    vi.mocked(fetchWordPressGraphQL).mockReset()
  })

  it('returns only supported wordpress countries in the fallback priority', () => {
    const priority = buildArticleCountryPriority('african-edition')

    expect(priority).toEqual(
      expect.arrayContaining(['sz', 'za', 'ng', 'ke', 'tz', 'eg', 'gh']),
    )
    expect(priority).not.toContain('african-edition')
    expect(priority.every((code) => normalizeCountryCode(code) === code)).toBe(true)
  })

  it('attempts to load articles for every supported wordpress country', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      posts: {
        nodes: [
          {
            slug: 'test-slug',
            id: 'gid://wordpress/Post:99',
            databaseId: 99,
            date: '2024-05-01T00:00:00Z',
            title: 'Nigeria title',
            excerpt: 'Nigeria excerpt',
            content: '<p>Hello Nigeria</p>',
            categories: { nodes: [] },
            tags: { nodes: [] },
            author: { node: { databaseId: 7, name: 'Reporter', slug: 'reporter' } },
          },
        ],
      },
    } as any)

    const result = await loadArticle('ng', 'test-slug')

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.any(Object),
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining([cacheTags.postSlug('ng', 'test-slug')]),
      }),
    )
    expect(result?.article.slug).toBe('test-slug')
    expect(result?.article.databaseId).toBe(99)
    expect(result?.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('ng', 'test-slug'),
        cacheTags.post('ng', 99),
      ]),
    )
  })

  it('does not call wordpress when asked to load an unsupported country', async () => {
    const result = await loadArticle('african-edition', 'test-slug')

    expect(result).toBeNull()
    expect(fetchWordPressGraphQL).not.toHaveBeenCalled()
  })

  it('returns the mapped article when GraphQL resolves with a node', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      posts: {
        nodes: [
          {
            slug: 'test-slug',
            id: 'gid://wordpress/Post:42',
            databaseId: 42,
            date: '2024-05-01T00:00:00Z',
            title: 'GraphQL title',
            excerpt: 'GraphQL excerpt',
            content: '<p>Hello</p>',
            categories: { nodes: [] },
            tags: { nodes: [] },
            author: { node: { databaseId: 1, name: 'Author', slug: 'author' } },
          },
        ],
      },
    } as any)

    const result = await loadArticle('za', 'test-slug')

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'za',
      POST_BY_SLUG_QUERY,
      expect.any(Object),
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining([cacheTags.postSlug('za', 'test-slug')]),
      }),
    )
    expect(result?.article.slug).toBe('test-slug')
    expect(result?.article.databaseId).toBe(42)
    expect(result?.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('za', 'test-slug'),
        cacheTags.post('za', 42),
      ]),
    )
  })

  it('returns null when GraphQL returns no nodes', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({ posts: { nodes: [] } } as any)

    const result = await loadArticle('za', 'missing-slug')

    expect(result).toBeNull()
  })

  it('re-throws GraphQL errors', async () => {
    const failure = new Error('GraphQL fatal')
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(failure)

    await expect(loadArticle('za', 'test-slug')).rejects.toBe(failure)
  })

  it('runs fallback lookups concurrently while preserving priority order', async () => {
    const callLog: Array<{ country: string; slug?: string }> = []

    const createDeferred = <T,>() => {
      let resolve!: (value: T) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })

      return { promise, resolve, reject }
    }

    const zaResponse = createDeferred<any>()
    const keResponse = createDeferred<any>()

    vi.mocked(fetchWordPressGraphQL).mockImplementation((countryCode, _query, variables) => {
      callLog.push({ country: countryCode, slug: (variables as { slug?: string })?.slug })

      if (countryCode === 'ng') {
        return Promise.resolve({ posts: { nodes: [] } }) as any
      }

      if (countryCode === 'za') {
        return zaResponse.promise
      }

      if (countryCode === 'ke') {
        return keResponse.promise
      }

      throw new Error(`Unexpected country: ${countryCode}`)
    })

    const keNode = {
      slug: 'mixed-slug',
      id: 'gid://wordpress/Post:101',
      databaseId: 101,
      date: '2024-05-01T00:00:00Z',
      title: 'Kenya title',
      excerpt: 'Kenya excerpt',
      content: '<p>Hello Kenya</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 9, name: 'Reporter', slug: 'reporter' } },
    }

    const loadPromise = loadArticleWithFallback('MiXeD-SluG', ['ng', 'za', 'ke'])
    let settled: Awaited<typeof loadPromise> | undefined
    loadPromise.then((value) => {
      settled = value
    })

    await vi.waitFor(() => {
      expect(callLog).toHaveLength(3)
    })

    expect(callLog).toEqual([
      { country: 'ng', slug: 'mixed-slug' },
      { country: 'za', slug: 'mixed-slug' },
      { country: 'ke', slug: 'mixed-slug' },
    ])

    keResponse.resolve({ posts: { nodes: [keNode] } })
    await Promise.resolve()
    expect(settled).toBeUndefined()

    zaResponse.resolve({ posts: { nodes: [] } })
    const result = await loadPromise

    expect(result?.sourceCountry).toBe('ke')
    expect(result?.article.slug).toBe('mixed-slug')
    expect(result?.tags).toEqual(
      expect.arrayContaining([cacheTags.postSlug('ke', 'mixed-slug')]),
    )
  })
})
