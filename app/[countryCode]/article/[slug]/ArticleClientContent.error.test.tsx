import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockBookmarkButton = vi.fn(() => null)
const mockShareButtons = vi.fn(() => null)

vi.mock('@/components/BookmarkButton', () => ({
  BookmarkButton: (props: Record<string, unknown>) => {
    mockBookmarkButton(props)
    return <div data-testid="bookmark-button" />
  },
}))

vi.mock('@/components/ShareButtons', () => ({
  ShareButtons: (props: Record<string, unknown>) => {
    mockShareButtons(props)
    return <div data-testid="share-buttons" />
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('@/lib/wordpress-api', () => ({
  getRelatedPostsForCountry: vi.fn(),
}))

import { ArticleClientContent } from './ArticleClientContent'
import { getRelatedPostsForCountry } from '@/lib/wordpress-api'

const mockGetRelatedPostsForCountry = vi.mocked(getRelatedPostsForCountry)

const baseInitialData = {
  categories: { nodes: [] },
  date: new Date().toISOString(),
  title: 'Test Title',
  author: { node: { name: 'Author Name' } },
  content: '<p>Content</p>',
  featuredImage: { node: { sourceUrl: 'https://example.com/image.jpg', altText: 'Alt text' } },
}

describe('ArticleClientContent error state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockBookmarkButton.mockClear()
    mockShareButtons.mockClear()
  })

  it('renders an error state when fetching related posts fails', async () => {
    mockGetRelatedPostsForCountry.mockRejectedValueOnce(new Error('Network error'))

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={{ ...baseInitialData, id: 123 }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to load related articles.')).toBeInTheDocument()
    })

    expect(screen.queryByText('No related articles found.')).not.toBeInTheDocument()
  })
})
