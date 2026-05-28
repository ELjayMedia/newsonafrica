import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
import { render, screen } from '@testing-library/react'

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, ...props }: Record<string, any>) => (
    <img data-priority={priority ? 'true' : 'false'} {...props} />
  ),
}))

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
}))

vi.mock('next/headers', () => ({
  draftMode: vi.fn(() => ({ isEnabled: false })),
}))

vi.mock('@/components/BookmarkButton', () => ({
  BookmarkButton: () => <div data-testid="bookmark" />,
}))

vi.mock('@/components/ShareButtons', () => ({
  ShareButtons: () => <div data-testid="share" />,
}))

const { mockGetRelatedPostsForCountry } = vi.hoisted(() => ({
  mockGetRelatedPostsForCountry: vi.fn(),
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
import { ENV } from '@/config/env'
import { notFound } from 'next/navigation'
import { draftMode } from 'next/headers'
import {
  POST_BY_SLUG_DIRECT_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
} from '@/lib/wordpress/queries'
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

  const graphqlSuccess = <T,>(data: T) => ({
    ok: true as const,
    data,
    ...(data && typeof data === 'object' ? (data as Record<string, unknown>) : {}),
  })

  const mockArticleFetch = (node: Record<string, any> | null) => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (_country, query) => {
      if (query === POST_BY_SLUG_DIRECT_QUERY) {
        return graphqlSuccess({ posts: { nodes: node ? [node] : [] } }) as any
      }

      if (query === POST_CATEGORIES_QUERY) {
        return graphqlSuccess({ post: { categories: { nodes: [] } } }) as any
      }

      if (query === RELATED_POSTS_QUERY) {
        return graphqlSuccess({ posts: { nodes: [] } }) as any
      }

      return graphqlSuccess({}) as any
    })
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(notFound).mockReset()
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    vi.mocked(draftMode).mockReturnValue({ isEnabled: false })
    vi.stubEnv('NEXT_PUBLIC_WP_SZ_GRAPHQL', 'https://newsonafrica.com/sz/graphql')
    vi.stubEnv('NEXT_PUBLIC_WP_ZA_GRAPHQL', 'https://newsonafrica.com/za/graphql')
    vi.stubEnv('NEXT_PUBLIC_WP_NG_GRAPHQL', 'https://newsonafrica.com/ng/graphql')
    articleDataModule.resetArticleCountryPriorityCache()
    mockGetRelatedPostsForCountry.mockReset()
    mockGetRelatedPostsForCountry.mockResolvedValue([])
    enhancedCache.clear()
  })

  it('renders article content on the requested route without redirect assertions', async () => {
    mockArticleFetch(createArticleNode({ title: 'Hello', slug: 'test', databaseId: 1 }))

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(fetchWordPressGraphQL).toHaveBeenCalled()
  })

  it('keeps featured image rendering covered', async () => {
    mockArticleFetch(createArticleNode({ slug: 'test', databaseId: 1, excerpt: '' }))

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getByAltText('Feature image')).toHaveAttribute(
      'sizes',
      '(min-width: 1280px) 784px, (min-width: 1024px) calc((100vw - 6rem) * 0.6667), 100vw',
    )
  })

  it('calls notFound when the article cannot be resolved', async () => {
    mockArticleFetch(null)

    await expect(Page({ params: { countryCode: 'sz', slug: 'missing' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
    expect(notFound).toHaveBeenCalled()
  })

  it('renders temporary unavailable fallback when WordPress fails', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (_country, query) => {
      if (query === POST_BY_SLUG_DIRECT_QUERY) {
        throw new Error('Network down')
      }

      return graphqlSuccess({}) as any
    })

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)

    expect(screen.getAllByText('Temporarily unavailable').length).toBeGreaterThan(0)
    expect(
      screen.getByText('We hit a temporary issue loading this story. Please try again in a moment.'),
    ).toBeInTheDocument()
  })

  it('passes preview mode to the article loader', async () => {
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

  it('generates metadata for the requested article route', async () => {
    mockArticleFetch(
      createArticleNode({
        title: '<p>Headline</p>',
        excerpt: '<p>Summary</p>',
        featuredImage: {
          node: { sourceUrl: 'https://example.com/feature.jpg', altText: 'Alt' },
        },
      }),
    )

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: 'sz', slug: 'test' }) })

    const baseUrl = ENV.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const dynamicUrl = `${baseUrl}/sz/article/test/opengraph-image`
    const canonical = `${baseUrl}/sz/article/test`

    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.openGraph?.url).toBe(canonical)
  })
})
