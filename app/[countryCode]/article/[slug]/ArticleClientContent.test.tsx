import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/wordpress-api', () => ({
  getRelatedPostsForCountry: vi.fn().mockResolvedValue([]),
}))

import { ArticleClientContent } from './ArticleClientContent'
import { getRelatedPostsForCountry } from '@/lib/wordpress-api'

const baseInitialData = {
  categories: { nodes: [] },
  date: new Date().toISOString(),
  title: 'Test Title',
  author: { node: { name: 'Author Name' } },
  content: '<p>Content</p>',
  featuredImage: { node: { sourceUrl: 'https://example.com/image.jpg', altText: 'Alt text' } },
}

describe('ArticleClientContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('requests related posts using the post id when available', async () => {
    const initialData = { ...baseInitialData, id: 123 }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    await waitFor(() => {
      expect(getRelatedPostsForCountry).toHaveBeenCalledWith('ng', '123', 6)
    })
  })

  it('does not request related posts until the id is available', async () => {
    const initialData = { ...baseInitialData }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    await waitFor(() => {
      expect(getRelatedPostsForCountry).not.toHaveBeenCalled()
    })
  })
})
