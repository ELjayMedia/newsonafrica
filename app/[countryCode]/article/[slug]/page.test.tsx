import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/wordpress/client', () => ({
  fetchWordPressGraphQL: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
}))

vi.mock('./ArticleClientContent', () => ({
  ArticleClientContent: ({ initialData }: { initialData: any }) => (
    <div>{initialData.title}</div>
  ),
}))

import Page, { generateMetadata } from './page'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { CACHE_DURATIONS } from '@/lib/cache/constants'
import { env } from '@/config/env'
import { notFound } from 'next/navigation'
import {
  POST_BY_SLUG_QUERY,
  POST_CATEGORIES_QUERY,
  RELATED_POSTS_QUERY,
} from '@/lib/wordpress-queries'

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

    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })

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

    render(ui)

    expect(screen.getByText('From South Africa')).toBeInTheDocument()
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

    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.openGraph?.images?.[1]?.url).toBe('https://example.com/feature.jpg')
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[1]).toBe('https://example.com/feature.jpg')
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
  })

  it('treats the African edition alias as valid', async () => {
    vi.mocked(fetchWordPressGraphQL).mockImplementation(async (country, query) => {
      if (query === POST_BY_SLUG_QUERY) {
        return {
          posts: { nodes: [createArticleNode({ title: 'African story', slug: 'african-story' })] },
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

    await Page({ params: { countryCode: 'african-edition', slug: 'African-Story' } })

    expect(notFound).not.toHaveBeenCalled()
    expect(fetchWordPressGraphQL).toHaveBeenCalledWith(
      'african-edition',
      POST_BY_SLUG_QUERY,
      expect.any(Object),
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining(['slug:african-story']),
      }),
    )
  })
})
