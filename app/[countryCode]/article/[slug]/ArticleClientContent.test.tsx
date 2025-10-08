import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, screen, fireEvent } from '@testing-library/react'

const mockBookmarkButton = vi.fn(() => null)
const mockShareButtons = vi.fn(() => null)
const pushMock = vi.fn()

vi.mock('@/components/BookmarkButton', () => ({
  BookmarkButton: (props: Record<string, unknown>) => {
    mockBookmarkButton(props)
    return <div data-testid="bookmark-button" />
  },
}))

vi.mock('@/components/ShareButtons', () => ({
  ShareButtons: (props: Record<string, unknown>) => {
    mockShareButtons(props)
    return (
      <button type="button" data-testid="share-buttons">
        Share
      </button>
    )
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: pushMock,
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
    mockBookmarkButton.mockClear()
    mockShareButtons.mockClear()
    pushMock.mockClear()
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

    expect(mockBookmarkButton).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: '123',
        country: 'ng',
        slug: 'test-slug',
        title: 'Test Title',
        featuredImage: {
          url: 'https://example.com/image.jpg',
          width: 1200,
          height: 800,
        },
      }),
    )
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

    expect(mockBookmarkButton).not.toHaveBeenCalled()
  })

  it('renders the gift article button alongside bookmark controls and triggers gifting navigation', () => {
    const initialData = { ...baseInitialData, id: 123 }

    render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    const giftButton = screen.getByRole('button', { name: /gift article/i })
    const shareButton = screen.getByTestId('share-buttons')
    const bookmark = screen.getByTestId('bookmark-button')

    expect(shareButton.parentElement).toBe(giftButton.parentElement)
    expect(bookmark.parentElement).toBe(giftButton.parentElement)

    fireEvent.click(giftButton)

    expect(pushMock).toHaveBeenCalledWith('/subscribe?intent=gift&article=test-slug&country=ng')
    expect(mockShareButtons).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/ng/article/test-slug',
        title: 'Test Title',
      }),
    )
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
})
