import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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

const { capturedArticleClientProps } = vi.hoisted(() => ({
  capturedArticleClientProps: [] as Array<Record<string, any>>,
}))

vi.mock('./ArticleClientContent', () => ({
  ArticleClientContent: (props: { initialData: any }) => {
    capturedArticleClientProps.push(props)
    return <div>{props.initialData.title}</div>
  },
}))

import Page, { generateMetadata } from './page'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { CACHE_DURATIONS } from '@/lib/cache/constants'
import { env } from '@/config/env'
import { notFound, redirect } from 'next/navigation'
import {
  POST_BY_SLUG_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
} from '@/lib/wordpress-queries'
import { buildArticleCountryPriority } from './article-data'

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
      node: { sourceUrl: 'https://example.com/feature.jpg', altText: 'Feature image' },
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
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
    capturedArticleClientProps.length = 0
  })

  it('renders post content', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return { posts: { nodes: [createArticleNode({ title: 'Hello' })] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })
    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(fetchWordPressGraphQL).toHaveBeenCalled()
    expect(capturedArticleClientProps[0]?.countryCode).toBe('sz')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('falls back to another supported country when the requested edition is missing the article', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return { posts: { nodes: [] } }
        }

        if (country === 'za') {
          return { posts: { nodes: [createArticleNode({ title: 'From South Africa' })] } }
        }

        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    await expect(Page({ params: { countryCode: 'sz', slug: 'test' } })).rejects.toThrow('NEXT_REDIRECT')

    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'sz',
      POST_BY_SLUG_QUERY,
      expect.any(Object),
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining(['slug:test']),
      }),
    )
    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'za',
      POST_BY_SLUG_QUERY,
      expect.any(Object),
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining(['slug:test']),
      }),
    )
    expect(redirect).toHaveBeenCalledWith('/za/article/test')
  })

  it('propagates fetch failures to the error boundary', async () => {
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(new Error('Network down'))

    await expect(Page({ params: { countryCode: 'sz', slug: 'test' } })).rejects.toThrow('Network down')

    expect(notFound).not.toHaveBeenCalled()
  })

  it('generates metadata that prefers the dynamic OG image', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return {
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
        }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: 'sz', slug: 'test' }) })

    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
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
        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'za', slug: 'missing-post' }),
    })

    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
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
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return { posts: { nodes: [] } }
        }

        if (country === 'za') {
          return { posts: { nodes: [createArticleNode({ slug: 'test', title: 'Canonical' })] } }
        }

        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'sz', slug: 'test' }),
    })

    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
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
          return { posts: { nodes: [createArticleNode({ title: 'African Edition' })] } }
        }

        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    const metadata = await generateMetadata({
      params: Promise.resolve({ countryCode: 'african', slug: 'test' }),
    })

    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
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
          return { posts: { nodes: [createArticleNode({ title: 'African' })] } }
        }

        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    const ui = await Page({ params: { countryCode: 'african', slug: 'test' } })
    render(ui)

    expect(capturedArticleClientProps[0]?.countryCode).toBe('african')
  })

  it('treats the African edition alias as valid', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        if (country === 'sz') {
          return {
            posts: { nodes: [createArticleNode({ title: 'African story', slug: 'african-story' })] },
          }
        }

        return { posts: { nodes: [] } }
      }

      if (query === POST_CATEGORIES_QUERY) {
        return { post: { categories: { nodes: [] } } }
      }

      if (query === RELATED_POSTS_QUERY) {
        return { posts: { nodes: [] } }
      }

      return null
    })

    await Page({ params: { countryCode: 'african-edition', slug: 'African-Story' } })

    expect(notFound).not.toHaveBeenCalled()
    const calledCountries = vi
      .mocked(fetchWordPressGraphQL)
      .mock.calls.map(([country]) => country)

    expect(calledCountries).toContain('sz')
    expect(calledCountries).not.toContain('african-edition')
  })

  it('excludes unsupported wordpress countries when prioritising fallbacks', () => {
    const priority = buildArticleCountryPriority('african-edition')

    expect(priority).toEqual(expect.arrayContaining(['sz', 'za']))
    expect(priority).not.toContain('african-edition')
  })
})
