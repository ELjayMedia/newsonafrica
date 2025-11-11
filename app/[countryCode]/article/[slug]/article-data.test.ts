import { beforeEach, describe, expect, it, vi } from 'vitest'

const { kvGetMock, kvSetMock } = vi.hoisted(() => ({
  kvGetMock: vi.fn(),
  kvSetMock: vi.fn(),
}))

vi.mock('@/lib/utils/fetchWithRetry', () => ({
  fetchWithRetry: vi.fn(),
}))

vi.mock('@/lib/cache/kv', () => ({
  kvCache: {
    get: kvGetMock,
    set: kvSetMock,
    isEnabled: true,
  },
  createCacheEntry: (value: unknown) => ({
    value,
    metadata: { updatedAt: Date.now() },
  }),
}))

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
import { fetchWithRetry } from '@/lib/utils/fetchWithRetry'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { CACHE_DURATIONS, KV_CACHE_KEYS } from '@/lib/cache/constants'
import { POST_BY_SLUG_QUERY } from '@/lib/wordpress-queries'
import { cacheTags } from '@/lib/cache'

describe('article-data', () => {
  beforeEach(() => {
    kvGetMock.mockReset()
    kvSetMock.mockReset()
    kvGetMock.mockResolvedValue(null)
    kvSetMock.mockResolvedValue(undefined)
    vi.mocked(fetchWordPressGraphQL).mockReset()
    vi.mocked(fetchWithRetry).mockReset()
  })

  const graphqlSuccess = <T,>(data: T) => ({
    ok: true as const,
    data,
    ...(data && typeof data === 'object' ? (data as Record<string, unknown>) : {}),
  })

  const graphqlFailure = (message = 'GraphQL fatal') => ({
    ok: false as const,
    kind: 'graphql_error' as const,
    message,
    errors: [{ message }],
    error: new Error(message),
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
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
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
      }) as any,
    )

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
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('test-slug')
    expect(result.article.databaseId).toBe(99)
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('ng', 'test-slug'),
        cacheTags.post('ng', 99),
      ]),
    )
    expect(kvSetMock).toHaveBeenCalledTimes(1)
    expect(kvSetMock).toHaveBeenCalledWith(
      KV_CACHE_KEYS.ARTICLE_BY_SLUG('ng', 'test-slug'),
      expect.objectContaining({
        value: expect.objectContaining({
          article: expect.objectContaining({ slug: 'test-slug' }),
        }),
      }),
      CACHE_DURATIONS.SHORT,
    )
  })

  it('does not call wordpress when asked to load an unsupported country', async () => {
    const result = await loadArticle('african-edition', 'test-slug')

    expect(result).toEqual({ status: 'not_found' })
    expect(fetchWordPressGraphQL).not.toHaveBeenCalled()
    expect(fetchWithRetry).not.toHaveBeenCalled()
    expect(kvSetMock).not.toHaveBeenCalled()
  })

  it('returns the mapped article when GraphQL resolves with a node', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({
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
      }) as any,
    )

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
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('test-slug')
    expect(result.article.databaseId).toBe(42)
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('za', 'test-slug'),
        cacheTags.post('za', 42),
      ]),
    )
    expect(kvSetMock).toHaveBeenCalledTimes(1)
    expect(kvSetMock).toHaveBeenCalledWith(
      KV_CACHE_KEYS.ARTICLE_BY_SLUG('za', 'test-slug'),
      expect.objectContaining({
        value: expect.objectContaining({
          article: expect.objectContaining({ slug: 'test-slug' }),
        }),
      }),
      CACHE_DURATIONS.SHORT,
    )
  })

  it('returns null when GraphQL returns no nodes', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [] } }) as any,
    )

    const result = await loadArticle('za', 'missing-slug')

    expect(result).toEqual({ status: 'not_found' })
    expect(kvSetMock).not.toHaveBeenCalled()
  })

  it('returns a temporary error when GraphQL fails', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(graphqlFailure() as any)

    const result = await loadArticle('za', 'test-slug')

    expect(result.status).toBe('temporary_error')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.failure).toMatchObject({ kind: 'graphql_error', message: 'GraphQL fatal' })
    expect(fetchWithRetry).not.toHaveBeenCalled()
    expect(kvSetMock).not.toHaveBeenCalled()
  })

  it('falls back to REST when GraphQL returns a retryable failure', async () => {
    const restPost = {
      id: 77,
      slug: 'rest-slug',
      date: '2024-05-02T00:00:00Z',
      modified: '2024-05-02T00:00:00Z',
      link: 'https://example.com/za/rest-slug',
      title: { rendered: 'REST title' },
      excerpt: { rendered: 'REST excerpt' },
      content: { rendered: '<p>REST content</p>' },
      _embedded: {
        author: [
          { id: 9, name: 'Reporter', slug: 'reporter', avatar_urls: { 96: 'https://example.com/avatar.jpg' } },
        ],
        'wp:featuredmedia': [
          {
            source_url: 'https://example.com/image.jpg',
            alt_text: 'Image alt',
            media_details: { width: 100, height: 50 },
          },
        ],
        'wp:term': [
          [{ id: 3, name: 'News', slug: 'news' }],
          [{ id: 4, name: 'Tag', slug: 'tag' }],
        ],
      },
    }

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      ok: false,
      kind: 'http_error',
      status: 502,
      statusText: 'Bad Gateway',
      message: 'Bad Gateway',
      response: new Response(null, { status: 502 }),
      error: new Error('Bad Gateway'),
    } as any)

    vi.mocked(fetchWithRetry).mockResolvedValue(
      new Response(JSON.stringify([restPost]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await loadArticle('za', 'rest-slug')

    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('rest-slug')
    expect(fetchWithRetry).toHaveBeenCalledWith(
      expect.stringContaining('rest-slug'),
      expect.objectContaining({
        attempts: 2,
        timeout: 10000,
      }),
    )
    expect(kvSetMock).toHaveBeenCalledTimes(1)
    expect(kvSetMock).toHaveBeenCalledWith(
      KV_CACHE_KEYS.ARTICLE_BY_SLUG('za', 'rest-slug'),
      expect.objectContaining({
        value: expect.objectContaining({
          article: expect.objectContaining({ slug: 'rest-slug' }),
        }),
      }),
      CACHE_DURATIONS.SHORT,
    )
    expect(kvGetMock).not.toHaveBeenCalled()
  })

  it('serves the cached article when REST fallback fails', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({
      ok: false,
      kind: 'http_error',
      status: 503,
      statusText: 'Service Unavailable',
      message: 'Service Unavailable',
      response: new Response(null, { status: 503 }),
      error: new Error('Service Unavailable'),
    } as any)

    vi.mocked(fetchWithRetry).mockRejectedValue(new Error('network down'))

    kvGetMock.mockResolvedValue({
      value: {
        article: {
          slug: 'cached-slug',
          title: 'Cached title',
          excerpt: 'Cached excerpt',
        },
        tags: ['cached-tag'],
      },
      metadata: { updatedAt: Date.now() },
    })

    const result = await loadArticle('za', 'cached-slug')

    expect(result).toEqual({
      status: 'found',
      article: expect.objectContaining({ slug: 'cached-slug' }),
      tags: ['cached-tag'],
    })
    expect(fetchWithRetry).toHaveBeenCalled()
    expect(kvSetMock).not.toHaveBeenCalled()
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
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
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

    const resultPromise = loadArticleWithFallback('MiXeD-SluG', ['ng', 'za', 'ke'])
    let settled: Awaited<typeof resultPromise> | undefined
    resultPromise.then((value) => {
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

    keResponse.resolve(graphqlSuccess({ posts: { nodes: [keNode] } }))
    await Promise.resolve()
    expect(settled).toBeUndefined()

    zaResponse.resolve(graphqlSuccess({ posts: { nodes: [] } }))
    const result = await resultPromise

    expect(result.status).toBe('found')
    expect(result.sourceCountry).toBe('ke')
    expect(result.article.slug).toBe('mixed-slug')
    expect(result.tags).toEqual(
      expect.arrayContaining([cacheTags.postSlug('ke', 'mixed-slug')]),
    )
  })

  it('aggregates temporary failures when every country encounters an error', async () => {
    const errorNg = new Error('ng outage')
    const errorZa = new Error('za outage')

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
      if (country === 'ng') {
        return Promise.reject(errorNg)
      }

      if (country === 'za') {
        return Promise.reject(errorZa)
      }

      return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
    })

    const result = await loadArticleWithFallback('slug', ['ng', 'za'])

    expect(result.status).toBe('temporary_error')
    expect(result.error).toBeInstanceOf(AggregateError)
    expect(result.error.errors).toEqual(expect.arrayContaining([errorNg, errorZa]))
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ country: 'ng', error: errorNg }),
        expect.objectContaining({ country: 'za', error: errorZa }),
      ]),
    )
  })

  it('continues fallbacks when some countries temporarily fail', async () => {
    const temporaryError = new Error('ng outage')

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country, _query, variables) => {
      if (country === 'ng') {
        return Promise.reject(temporaryError)
      }

      if (country === 'za') {
        return Promise.resolve(
          graphqlSuccess({
            posts: {
              nodes: [
                {
                  slug: (variables as { slug: string }).slug,
                  id: 'gid://wordpress/Post:55',
                  databaseId: 55,
                  date: '2024-05-01T00:00:00Z',
                  title: 'Recovered',
                  excerpt: 'Recovered excerpt',
                  content: '<p>Recovered</p>',
                  categories: { nodes: [] },
                  tags: { nodes: [] },
                  author: { node: { databaseId: 4, name: 'Reporter', slug: 'reporter' } },
                },
              ],
            },
          }),
        ) as any
      }

      return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
    })

    const result = await loadArticleWithFallback('slug', ['ng', 'za'])

    expect(result.status).toBe('found')
    expect(result.sourceCountry).toBe('za')
    expect(result.article.slug).toBe('slug')
  })
})
