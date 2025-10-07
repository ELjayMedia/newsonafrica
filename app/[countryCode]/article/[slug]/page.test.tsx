import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/wordpress-api', () => ({
  fetchFromWp: vi.fn(),
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
import { fetchFromWp } from '@/lib/wordpress-api'
import { env } from '@/config/env'
import { notFound } from 'next/navigation'

describe('ArticlePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(notFound).mockReset()
  })

  it('renders post content', async () => {
    vi.mocked(fetchFromWp).mockResolvedValue([
      { title: 'Hello', slug: 'test' },
    ])
    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(fetchFromWp).toHaveBeenCalled()
  })

  it('generates metadata that prefers the dynamic OG image', async () => {
    vi.mocked(fetchFromWp).mockResolvedValue([
      {
        title: '<p>Headline</p>',
        excerpt: '<p>Summary</p>',
        slug: 'test',
        date: '2024-01-01',
        featuredImage: { node: { sourceUrl: 'https://example.com/feature.jpg' } },
        author: { node: { name: 'Reporter' } },
      },
    ])

    const metadata = await generateMetadata({ params: Promise.resolve({ countryCode: 'sz', slug: 'test' }) })

    const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    const dynamicUrl = `${baseUrl}/sz/article/test/opengraph-image`

    expect(metadata.openGraph?.images?.[0]?.url).toBe(dynamicUrl)
    expect(metadata.openGraph?.images?.[1]?.url).toBe('https://example.com/feature.jpg')
    expect(metadata.twitter?.images?.[0]).toBe(dynamicUrl)
    expect(metadata.twitter?.images?.[1]).toBe('https://example.com/feature.jpg')
  })

  it('falls back to the placeholder image when the article is missing', async () => {
    vi.mocked(fetchFromWp).mockResolvedValue([])

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
    vi.mocked(fetchFromWp).mockResolvedValue([
      { title: 'African story', slug: 'african-story' },
    ])

    await Page({ params: { countryCode: 'african-edition', slug: 'African-Story' } })

    expect(notFound).not.toHaveBeenCalled()
    expect(fetchFromWp).toHaveBeenCalledWith(
      'african-edition',
      expect.anything(),
      expect.objectContaining({ tags: expect.any(Array) }),
    )
  })
})
