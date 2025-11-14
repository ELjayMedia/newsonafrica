import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  ArticleTemporarilyUnavailableError,
  resetArticleCountryPriorityCache,
} = articleData
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { POST_BY_SLUG_QUERY } from '@/lib/wordpress-queries'
import { cacheTags } from '@/lib/cache'
import { enhancedCache } from '@/lib/cache/enhanced-cache'
import { CACHE_DURATIONS } from '@/lib/cache/constants'

describe('article-data', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.mocked(fetchWordPressGraphQL).mockReset()
    enhancedCache.clear()
    resetArticleCountryPriorityCache()
  })

  afterEach(() => {
    vi.useRealTimers()
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

  const getLastFetchOptions = () =>
    vi.mocked(fetchWordPressGraphQL).mock.calls.at(-1)?.[3] as
      | Record<string, unknown>
      | undefined

  it('returns only supported wordpress countries in the fallback priority', () => {
    const priority = buildArticleCountryPriority('african-edition')

    expect(priority).toEqual(
      expect.arrayContaining(['sz', 'za', 'ng', 'ke', 'tz', 'eg', 'gh']),
    )
    expect(priority).not.toContain('african-edition')
    expect(priority.every((code) => normalizeCountryCode(code) === code)).toBe(true)
  })

  it('reuses the cached priority for repeated calls with the same edition', () => {
    const first = buildArticleCountryPriority('za')
    const second = buildArticleCountryPriority('za')

    expect(second).toBe(first)
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
      expect.objectContaining({ slug: 'test-slug', asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('ng', 'test-slug')]),
      }),
    )
    const options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('revalidate')
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('test-slug')
    expect(result.article.databaseId).toBe(99)
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('ng', 'test-slug'),
        cacheTags.post('ng', 99),
      ]),
    )
    expect(result.canonicalCountry).toBe('ng')
    expect(result.version).toBe('2024-05-01t00-00-00z')
  })

  it('does not call wordpress when asked to load an unsupported country', async () => {
    const result = await loadArticle('african-edition', 'test-slug')

    expect(result).toEqual({ status: 'not_found' })
    expect(fetchWordPressGraphQL).not.toHaveBeenCalled()
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
      expect.objectContaining({ slug: 'test-slug', asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('za', 'test-slug')]),
      }),
    )
    const options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('revalidate')
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('test-slug')
    expect(result.article.databaseId).toBe(42)
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('za', 'test-slug'),
        cacheTags.post('za', 42),
      ]),
    )
    expect(result.canonicalCountry).toBe('za')
    expect(result.version).toBe('2024-05-01t00-00-00z')
  })

  it('returns null when GraphQL returns no nodes', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [] } }) as any,
    )

    const result = await loadArticle('za', 'missing-slug')

    expect(result).toEqual({ status: 'not_found' })
  })

  it('returns a temporary error when GraphQL fails', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(graphqlFailure() as any)

    const result = await loadArticle('za', 'test-slug')

    expect(result.status).toBe('temporary_error')
    expect(result.error).toBeInstanceOf(Error)
    expect(result.failure).toMatchObject({ kind: 'graphql_error', message: 'GraphQL fatal' })
  })

  it('requests preview content when preview mode is enabled', async () => {
    const node = {
      slug: 'preview-slug',
      id: 'gid://wordpress/Post:777',
      databaseId: 777,
      date: '2024-05-01T00:00:00Z',
      title: 'Preview title',
      excerpt: 'Preview excerpt',
      content: '<p>Preview</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 5, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    )

    const result = await loadArticle('ng', 'preview-slug', true)

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: 'preview-slug', asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    )
    const options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('tags')
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('preview-slug')
  })

  it('fetches from wordpress when no cached article exists', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [] } }) as any,
    )

    await loadArticleWithFallback('uncached', ['ng'])

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: 'uncached', asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('ng', 'uncached')]),
      }),
    )
    const options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('revalidate')
  })

  it('does not cache preview articles when loading with fallback', async () => {
    const node = {
      slug: 'preview-slug',
      id: 'gid://wordpress/Post:555',
      databaseId: 555,
      date: '2024-05-01T00:00:00Z',
      title: 'Preview title',
      excerpt: 'Preview excerpt',
      content: '<p>Preview</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 11, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    )

    await loadArticleWithFallback('preview-slug', ['ng'], true)

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: 'preview-slug', asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    )
    let options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('tags')

    vi.mocked(fetchWordPressGraphQL).mockClear()
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ post: node, posts: { nodes: [] } }) as any,
    )

    await loadArticleWithFallback('preview-slug', ['ng'], true)

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: 'preview-slug', asPreview: true }),
      expect.objectContaining({ revalidate: CACHE_DURATIONS.NONE }),
    )
    options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('tags')
  })

  it('returns cached article without querying wordpress when within ttl', async () => {
    vi.useFakeTimers()
    const initialTime = new Date('2024-01-01T00:00:00Z')
    vi.setSystemTime(initialTime)

    const node = {
      slug: 'cached-slug',
      id: 'gid://wordpress/Post:222',
      databaseId: 222,
      date: '2024-05-01T00:00:00Z',
      title: 'Cached title',
      excerpt: 'Cached excerpt',
      content: '<p>Cached</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 12, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockResolvedValue(
      graphqlSuccess({ posts: { nodes: [node] } }) as any,
    )

    await loadArticleWithFallback('cached-slug', ['ng'])

    vi.mocked(fetchWordPressGraphQL).mockClear()

    vi.setSystemTime(new Date(initialTime.getTime() + 60_000))

    const result = await loadArticleWithFallback('cached-slug', ['ng'])

    expect(fetchWordPressGraphQL).not.toHaveBeenCalled()
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('cached-slug')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('ng', 'cached-slug'),
        cacheTags.post('ng', 222),
      ]),
    )
    expect(result.sourceCountry).toBe('ng')
    expect(result.canonicalCountry).toBe('ng')
    expect(result.version).toBe('2024-05-01t00-00-00z')
  })

  it('returns cached fallback articles before querying wordpress for fallbacks', async () => {
    vi.useFakeTimers()
    const initialTime = new Date('2024-01-01T00:00:00Z')
    vi.setSystemTime(initialTime)

    const fallbackNode = {
      slug: 'cached-slug',
      id: 'gid://wordpress/Post:333',
      databaseId: 333,
      date: '2024-05-01T00:00:00Z',
      title: 'Fallback title',
      excerpt: 'Fallback excerpt',
      content: '<p>Fallback</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 18, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country) => {
      if (country === 'ng') {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
      }

      if (country === 'za') {
        return Promise.resolve(
          graphqlSuccess({ posts: { nodes: [fallbackNode] } }),
        ) as any
      }

      throw new Error(`Unexpected country: ${country}`)
    })

    await loadArticleWithFallback('cached-slug', ['ng', 'za'])

    vi.mocked(fetchWordPressGraphQL).mockReset()

    vi.setSystemTime(new Date(initialTime.getTime() + 60_000))

    vi.mocked(fetchWordPressGraphQL).mockImplementation((country, _query, _variables) => {
      if (country === 'ng') {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
      }

      throw new Error(`WordPress should not be queried for ${country}`)
    })

    const result = await loadArticleWithFallback('cached-slug', ['ng', 'za'])

    expect(fetchWordPressGraphQL).toHaveBeenCalledTimes(1)
    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'ng',
      POST_BY_SLUG_QUERY,
      expect.objectContaining({ slug: 'cached-slug', asPreview: false }),
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('ng', 'cached-slug')]),
      }),
    )
    const options = getLastFetchOptions()
    expect(options).toBeDefined()
    expect(options).not.toHaveProperty('revalidate')
    expect(result.status).toBe('found')
    expect(result.article.slug).toBe('cached-slug')
    expect(result.sourceCountry).toBe('za')
    expect(result.canonicalCountry).toBe('za')
    expect(result.version).toBe('2024-05-01t00-00-00z')
    expect(result.tags).toEqual(
      expect.arrayContaining([
        cacheTags.postSlug('za', 'cached-slug'),
        cacheTags.post('za', 333),
      ]),
    )
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
    expect(result.canonicalCountry).toBe('ke')
    expect(result.version).toBe('2024-05-01t00-00-00z')
  })

  it('returns lower-priority success without waiting for slower failures', async () => {
    vi.useFakeTimers()

    const keNode = {
      slug: 'priority-slug',
      id: 'gid://wordpress/Post:303',
      databaseId: 303,
      date: '2024-05-01T00:00:00Z',
      title: 'Priority title',
      excerpt: 'Priority excerpt',
      content: '<p>Priority</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 15, name: 'Reporter', slug: 'reporter' } },
    }

    const zaError = new Error('za outage')

    vi.mocked(fetchWordPressGraphQL).mockImplementation((countryCode, _query, variables) => {
      if (countryCode === 'ng') {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
      }

      if (countryCode === 'za') {
        return new Promise((_, reject) => {
          setTimeout(() => reject(zaError), 100)
        }) as any
      }

      if (countryCode === 'ke') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(graphqlSuccess({ posts: { nodes: [keNode] } }))
          }, 10)
        }) as any
      }

      if (countryCode === 'tz') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(graphqlSuccess({ posts: { nodes: [] } }))
          }, 1_000)
        }) as any
      }

      throw new Error(`Unexpected country: ${countryCode}`)
    })

    const resultPromise = loadArticleWithFallback('priority-slug', ['ng', 'za', 'ke', 'tz'])

    let settled: Awaited<typeof resultPromise> | undefined
    resultPromise.then((value) => {
      settled = value
    })

    await vi.advanceTimersByTimeAsync(50)
    await Promise.resolve()
    expect(settled).toBeDefined()

    const result = await resultPromise
    expect(result.status).toBe('found')
    expect(result.sourceCountry).toBe('ke')
    expect(result.article.slug).toBe('priority-slug')
    expect(result.canonicalCountry).toBe('ke')
    expect(result.version).toBe('2024-05-01t00-00-00z')

    await vi.advanceTimersByTimeAsync(1_000)
  })

  it('returns the fastest successful fallback even when a higher-priority country resolves later', async () => {
    vi.useFakeTimers()

    const zaNode = {
      slug: 'priority-slug',
      id: 'gid://wordpress/Post:404',
      databaseId: 404,
      date: '2024-05-01T00:00:00Z',
      title: 'ZA title',
      excerpt: 'ZA excerpt',
      content: '<p>ZA body</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 17, name: 'Reporter', slug: 'reporter' } },
    }

    const keNode = {
      slug: 'priority-slug',
      id: 'gid://wordpress/Post:405',
      databaseId: 405,
      date: '2024-05-01T00:00:00Z',
      title: 'KE title',
      excerpt: 'KE excerpt',
      content: '<p>KE body</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 18, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockImplementation((countryCode, _query, variables) => {
      if (countryCode === 'ng') {
        return Promise.resolve(graphqlSuccess({ posts: { nodes: [] } })) as any
      }

      if (countryCode === 'za') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(graphqlSuccess({ posts: { nodes: [zaNode] } }))
          }, 120)
        }) as any
      }

      if (countryCode === 'ke') {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(graphqlSuccess({ posts: { nodes: [keNode] } }))
          }, 20)
        }) as any
      }

      throw new Error(`Unexpected country: ${countryCode}`)
    })

    const resultPromise = loadArticleWithFallback('priority-slug', ['ng', 'za', 'ke'])

    await vi.advanceTimersByTimeAsync(25)
    await Promise.resolve()

    const result = await resultPromise
    expect(result.status).toBe('found')
    expect(result.sourceCountry).toBe('ke')
    expect(result.article.slug).toBe('priority-slug')
    expect(result.canonicalCountry).toBe('ke')
    expect(result.version).toBe('2024-05-01t00-00-00z')

    await vi.advanceTimersByTimeAsync(1_000)
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
    expect(result.error).toBeInstanceOf(ArticleTemporarilyUnavailableError)
    expect(result.error.errors).toEqual(expect.arrayContaining([errorNg, errorZa]))
    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ country: 'ng', error: errorNg }),
        expect.objectContaining({ country: 'za', error: errorZa }),
      ]),
    )
    expect(result.staleCanonicalCountry).toBeNull()
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
    expect(result.canonicalCountry).toBe('za')
    expect(result.version).toBe('2024-05-01t00-00-00z')
  })

  it('returns stale cached content when all countries encounter a temporary failure', async () => {
    const cachedNode = {
      slug: 'stale-slug',
      id: 'gid://wordpress/Post:75',
      databaseId: 75,
      date: '2024-05-01T00:00:00Z',
      title: 'Cached headline',
      excerpt: '<p>Cached summary</p>',
      content: '<p>Body</p>',
      categories: { nodes: [] },
      tags: { nodes: [] },
      author: { node: { databaseId: 3, name: 'Reporter', slug: 'reporter' } },
    }

    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country) => {
      if (country === 'ng') {
        return graphqlSuccess({ posts: { nodes: [cachedNode] } }) as any
      }

      return graphqlSuccess({ posts: { nodes: [] } }) as any
    })

    vi.useFakeTimers()
    const initialTime = new Date('2024-05-01T00:00:00Z')
    vi.setSystemTime(initialTime)

    await loadArticleWithFallback('stale-slug', ['ng', 'za'])

    const outage = new Error('service down')
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(outage)

    vi.setSystemTime(new Date(initialTime.getTime() + 120_000))

    const result = await loadArticleWithFallback('stale-slug', ['ng', 'za'])

    expect(result.status).toBe('temporary_error')
    expect(result.staleArticle?.slug).toBe('stale-slug')
    expect(result.staleSourceCountry).toBe('ng')
    expect(result.staleCanonicalCountry).toBe('ng')
    expect(result.error).toBeInstanceOf(ArticleTemporarilyUnavailableError)
    expect(result.error.staleArticle?.slug).toBe('stale-slug')
    expect(result.error.staleCanonicalCountry).toBe('ng')
    expect(result.error.errors).toEqual(expect.arrayContaining([outage]))
  })
})
