import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/wordpress-api', () => ({
  getRelatedPostsForCountry: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/components/CommentList', () => ({
  CommentList: ({ postId }: { postId: string }) => <h2>Comments for {postId}</h2>,
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

  it('renders without author data', () => {
    const initialData = { ...baseInitialData, author: null }

    expect(() =>
      render(
        <ArticleClientContent
          slug="test-slug"
          countryCode="ng"
          initialData={initialData}
        />,
      ),
    ).not.toThrow()
  })

  it('renders the comments heading when a post id is provided', () => {
    const initialData = { ...baseInitialData, id: 456 }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    expect(screen.getByRole('heading', { name: /comments/i })).toBeInTheDocument()
  })
})
