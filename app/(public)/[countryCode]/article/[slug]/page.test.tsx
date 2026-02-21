import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/config/env', () => ({
  ENV: {
    NEXT_PUBLIC_SITE_URL: 'https://example.com',
    NEXT_PUBLIC_DEFAULT_SITE: 'sz',
    NEXT_PUBLIC_WP_SZ_GRAPHQL: undefined,
    NEXT_PUBLIC_WP_ZA_GRAPHQL: undefined,
    ANALYTICS_API_BASE_URL: 'https://example.com/api/analytics',
    WORDPRESS_REQUEST_TIMEOUT_MS: 30_000,
  },
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

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  draftMode: vi.fn(() => ({ isEnabled: false })),
}))

const { capturedArticleClientProps, mockGetRelatedPostsForCountry } = vi.hoisted(() => ({
  capturedArticleClientProps: [] as Array<Record<string, any>>,
  mockGetRelatedPostsForCountry: vi.fn(),
}))

vi.mock('./ArticleClientContent', () => ({
  ArticleClientContent: (props: { initialData: any }) => {
    capturedArticleClientProps.push(props)
    return <div>{props.initialData.title}</div>
  },
}))

vi.mock('@/lib/wordpress/service', () => ({
  COUNTRIES: {
    sz: { code: 'sz' },
    za: { code: 'za' },
    ng: { code: 'ng' },
  },
  getRelatedPostsForCountry: (...args: unknown[]) => mockGetRelatedPostsForCountry(...args),
}))

import Page, { generateMetadata } from './page'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { cacheTags } from '@/lib/cache'
import { ENV } from '@/config/env'
import { notFound, redirect } from 'next/navigation'
import { draftMode } from 'next/headers'
import {
  POST_BY_SLUG_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
} from '@/lib/wordpress/queries'
import { buildArticleCountryPriority, loadArticleWithFallback } from './article-data'
import * as articleDataModule from './article-data'
import { enhancedCache } from '@/lib/cache/enhanced-cache'

describe('ArticlePage', () => {
  const createArticleNode = (overrides: Record<string, any> = {}) => ({
    databaseId: 1,
    id: 'gid://post/1',
    slug: 'test',
    date: '2024-01-01T00:00:00Z',
    title: 'Hello',
    excerpt: '',
    content: '<p>Content</p>',
    featuredImage: {
      node: {
        sourceUrl: 'https://example.com/feature.jpg',
        altText: 'Feature image',
        mediaDetails: { width: 1200, height: 800 },
      },
    },
    categories: { nodes: [] },
    tags: { nodes: [] },
    author: { node: { databaseId: 1, name: 'Reporter', slug: 'reporter' } },
    ...overrides,
  })

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(notFound).mockReset()
    vi.mocked(redirect).mockReset()
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
    vi.mocked(draftMode).mockReturnValue({ isEnabled: false })
    vi.stubEnv('NEXT_PUBLIC_WP_SZ_GRAPHQL', 'https://newsonafrica.com/sz/graphql')
    vi.stubEnv('NEXT_PUBLIC_WP_ZA_GRAPHQL', 'https://newsonafrica.com/za/graphql')
    vi.stubEnv('NEXT_PUBLIC_WP_NG_GRAPHQL', 'https://newsonafrica.com/ng/graphql')
    articleDataModule.resetArticleCountryPriorityCache()
    capturedArticleClientProps.length = 0
    mockGetRelatedPostsForCountry.mockReset()
    mockGetRelatedPostsForCountry.mockResolvedValue([])
    enhancedCache.clear()
  })

  const graphqlSuccess = <T,>(data: T) => ({
    ok: true as const,
    data,
    ...(data && typeof data === 'object' ? (data as Record<string, unknown>) : {}),
  })

  it('renders post content', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({ posts: { nodes: [createArticleNode({ title: 'Hello' })] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })
    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(fetchWordPressGraphQL).toHaveBeenCalled()
    expect(capturedArticleClientProps[0]?.countryCode).toBe('sz')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('passes the database ID to related post lookup when available', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({
          posts: { nodes: [createArticleNode({ databaseId: 42, id: 'gid://wordpress/Post:42' })] },
        }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    await Page({ params: { countryCode: 'sz', slug: 'test' } })

    expect(mockGetRelatedPostsForCountry).toHaveBeenCalledWith('sz', 42, 6)
  })

  it('decodes base64 relay IDs when databaseId is missing', async () => {
    const base64Id = Buffer.from('gid://wordpress/Post:42').toString('base64')

    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({
          posts: { nodes: [createArticleNode({ databaseId: undefined, id: base64Id })] },
        }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    await Page({ params: { countryCode: 'sz', slug: 'test' } })

    expect(mockGetRelatedPostsForCountry).toHaveBeenCalledWith('sz', 42, 6)
  })

  it('calls notFound when the article cannot be resolved via GraphQL', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    await expect(Page({ params: { countryCode: 'sz', slug: 'test' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(notFound).toHaveBeenCalled()
  })

  it('falls back to another supported country when the requested edition is missing the article', async () => {
    vi.stubEnv('FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK', 'true')
    articleDataModule.resetArticleCountryPriorityCache()

    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return graphqlSuccess({ posts: { nodes: [] } }) as any
        }

        if (country === 'za') {
          return graphqlSuccess({ posts: { nodes: [createArticleNode({ title: 'From South Africa' })] } }) as any
        }

        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    await expect(Page({ params: { countryCode: 'sz', slug: 'test' } })).rejects.toThrow('NEXT_REDIRECT')

    const calls = vi.mocked(fetchWordPressGraphQL).mock.calls
    const szCall = calls.find(([country]) => country === 'sz')
    const zaCall = calls.find(([country]) => country === 'za')
    const szOptions = szCall?.[3] as Record<string, unknown> | undefined
    const zaOptions = zaCall?.[3] as Record<string, unknown> | undefined
    expect(szCall?.[0]).toBe('sz')
    expect(szOptions).toBeDefined()
    expect(szOptions).toEqual(
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('sz', 'test')]),
      }),
    )
    expect(szOptions).not.toHaveProperty('revalidate')
    expect(zaCall?.[0]).toBe('za')
    expect(zaOptions).toBeDefined()
    expect(zaOptions).toEqual(
      expect.objectContaining({
        tags: expect.arrayContaining([cacheTags.postSlug('za', 'test')]),
      }),
    )
    expect(zaOptions).not.toHaveProperty('revalidate')
    expect(redirect).toHaveBeenCalledWith('/za/article/test')
  })

  it('renders the fallback markup when wordpress fails without stale content', async () => {
    const failure = new Error('Network down')
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (_country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        throw failure
      }

      return graphqlSuccess({}) as any
    })

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getAllByText('Temporarily unavailable').length).toBeGreaterThan(0)
    expect(
      screen.getByText('We hit a temporary issue loading this story. Please try again in a moment.'),
    ).toBeInTheDocument()
    expect(notFound).not.toHaveBeenCalled()
  })

  it('renders temporary unavailable fallback when requests temporarily fail', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({
          posts: { nodes: [createArticleNode({ title: 'Cached article' })] },
        }) as any
      }

      return graphqlSuccess({}) as any
    })

    await loadArticleWithFallback('test', buildArticleCountryPriority('sz'))

    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(new Error('Outage'))

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getAllByText('Temporarily unavailable').length).toBeGreaterThan(0)
    expect(screen.queryByText('Cached article')).not.toBeInTheDocument()
    expect(capturedArticleClientProps[0]).toBeUndefined()
  })


  it('renders temporary fallback in production without throwing server errors', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (_country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        throw new Error('Outage')
      }

      return graphqlSuccess({}) as any
    })

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getAllByText('Temporarily unavailable').length).toBeGreaterThan(0)
    vi.unstubAllEnvs()
  })

  it('uses placeholder metadata copy when temporary errors return no payload', async () => {
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(new Error('Outage'))

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'sz', slug: 'test' }),
    })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const dynamicUrl = `${baseUrl}/sz/article/test/opengraph-image`
    const fallbackUrl = `${baseUrl}/news-placeholder.png`

    expect(metadata.title).toBe('Article temporarily unavailable - News On Africa')
    expect(metadata.description).toBe('We hit a temporary issue loading this story. Please try again in a moment.')
    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.openGraph?.images?.[1]?.url).toBe(fallbackUrl)
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[1]).toBe(fallbackUrl)
  })

  it('passes the preview flag to the article loader when draft mode is enabled', async () => {
    vi.mocked(draftMode).mockReturnValue({ isEnabled: true })
    const loadSpy = vi.spyOn(articleDataModule, 'loadArticleWithFallback')
    loadSpy.mockResolvedValue({
      status: 'found',
      article: createArticleNode(),
      tags: [],
      version: null,
      canonicalCountry: 'sz',
      sourceCountry: 'sz',
    })

    await Page({ params: { countryCode: 'sz', slug: 'test' } })

    expect(loadSpy).toHaveBeenCalledWith('test', expect.any(Array), true)

    loadSpy.mockRestore()
  })

  it('passes the preview flag to the article loader when generating metadata in draft mode', async () => {
    vi.mocked(draftMode).mockReturnValue({ isEnabled: true })
    const loadSpy = vi.spyOn(articleDataModule, 'loadArticleWithFallback')
    loadSpy.mockResolvedValue({
      status: 'found',
      article: createArticleNode(),
      tags: [],
      version: null,
      canonicalCountry: 'sz',
      sourceCountry: 'sz',
    })

    await generateMetadata({ params: Promise.resolve({ countryCode: 'sz', slug: 'test' }) })

    expect(loadSpy).toHaveBeenCalledWith('test', expect.any(Array), true)

    loadSpy.mockRestore()
  })

  it('generates metadata that prefers the dynamic OG image', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({
          posts: {
            nodes: [
              createArticleNode({
                title: '<p>Headline</p>',
                excerpt: '<p>Summary</p>',
                featuredImage: {
                  node: { sourceUrl: 'https://example.com/feature.jpg', altText: 'Alt' },
                },
              }),
            ],
          },
        }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: 'sz', slug: 'test' }) })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const dynamicUrl = `${baseUrl}/sz/article/test/opengraph-image`
    const canonical = `${baseUrl}/sz/article/test`

    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.openGraph?.images?.[1]?.url).toBe('https://example.com/feature.jpg')
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[1]).toBe('https://example.com/feature.jpg')
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.openGraph?.url).toBe(canonical)
  })

  it('falls back to the placeholder image when the article is missing', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'za', slug: 'missing-post' }),
    })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const dynamicUrl = `${baseUrl}/za/article/missing-post/opengraph-image`
    const fallbackUrl = `${baseUrl}/news-placeholder.png`

    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.openGraph?.images?.[1]?.url).toBe(fallbackUrl)
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[1]).toBe(fallbackUrl)
    expect(metadata.alternates?.canonical).toBe(`${baseUrl}/za/article/missing-post`)
    expect(metadata.openGraph?.url).toBe(`${baseUrl}/za/article/missing-post`)
  })

  it('generates metadata for the canonical country when the article resolves elsewhere', async () => {
    vi.stubEnv('FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK', 'true')
    articleDataModule.resetArticleCountryPriorityCache()

    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return graphqlSuccess({ posts: { nodes: [] } }) as any
        }

        if (country === 'za') {
          return graphqlSuccess({
            posts: { nodes: [createArticleNode({ slug: 'test', title: 'Canonical' })] },
          }) as any
        }

        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'sz', slug: 'test' }),
    })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const expectedCanonical = `${baseUrl}/za/article/test`
    const expectedOg = `${baseUrl}/za/article/test/opengraph-image`

    expect(metadata.alternates?.canonical).toBe(expectedCanonical)
    expect(metadata.openGraph?.url).toBe(expectedCanonical)
    expect(metadata.openGraph?.images?.[0]?.url).toBe(expectedOg)
    expect(metadata.twitter?.images?.[0]).toBe(expectedOg)
  })

  it('uses the requested country path for african edition URLs', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return graphqlSuccess({ posts: { nodes: [createArticleNode({ title: 'African Edition' })] } }) as any
        }

        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'african', slug: 'test' }),
    })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const expectedOgUrl = `${baseUrl}/african/article/test/opengraph-image`
    const expectedCanonical = `${baseUrl}/african/article/test`

    expect(metadata.alternates?.canonical).toBe(expectedCanonical)
    expect(metadata.openGraph?.url).toBe(expectedCanonical)
    expect(metadata.openGraph?.images?.[0]?.url).toBe(expectedOgUrl)
    expect(metadata.twitter?.images?.[0]).toBe(expectedOgUrl)
  })

  it('passes the route country to the article client for non-country editions', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return graphqlSuccess({ posts: { nodes: [createArticleNode({ title: 'African' })] } }) as any
        }

        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    const ui = await Page({ params: { countryCode: 'african', slug: 'test' } })
    render(ui)

    expect(capturedArticleClientProps[0]?.countryCode).toBe('african')
  })

  it('treats the African edition alias as valid', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return graphqlSuccess({
            posts: { nodes: [createArticleNode({ title: 'African story', slug: 'african-story' })] },
          }) as any
        }

        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })

    await Page({ params: { countryCode: 'african-edition', slug: 'African-Story' } })

    expect(notFound).not.toHaveBeenCalled()
    const calledCountries = vi
      .mocked(fetchWordPressGraphQL)
      .mock.calls.map(([country]) => country)

    expect(calledCountries).toContain('sz')
    expect(calledCountries).not.toContain('african-edition')
  })

  it('excludes countries without explicit endpoint env vars when prioritising fallbacks', () => {
    vi.stubEnv('FEATURE_ARTICLE_CROSS_COUNTRY_FALLBACK', 'true')
    vi.stubEnv('NEXT_PUBLIC_WP_ZA_GRAPHQL', '')
    articleDataModule.resetArticleCountryPriorityCache()

    const priority = buildArticleCountryPriority('african-edition')

    expect(priority).toEqual(expect.arrayContaining(['sz', 'ng']))
    expect(priority).not.toContain('za')
    expect(priority).not.toContain('african-edition')
    vi.unstubAllEnvs()
  })
})
