import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, screen, fireEvent, cleanup } from '@testing-library/react'

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
    mockBookmarkButton.mockClear()
    mockShareButtons.mockClear()
    pushMock.mockClear()
  })

  afterEach(() => {
    cleanup()
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

  it('renders skeleton placeholders while related posts are loading', () => {
    vi.mocked(getRelatedPostsForCountry).mockImplementationOnce(
      () => new Promise<any[]>((resolve) => {}),
    )

    const initialData = { ...baseInitialData, id: 789 }

    const { container } = render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,   
    )

    const relatedSection = screen
      .getByRole('heading', { name: /related articles/i })
      .closest('section')

    expect(relatedSection).not.toBeNull()
    expect(relatedSection?.querySelector('.animate-pulse')).not.toBeNull()
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
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

  it('sanitizes article html content before rendering', () => {
    const initialData = {
      ...baseInitialData,
      content: '<p>Safe</p><script>alert("xss")</script><div onclick="alert(1)">Click</div>',
    }

    const { container } = render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    expect(container.querySelector('script')).toBeNull()
    const articleContent = container.querySelector('#article-content')
    expect(articleContent?.innerHTML).not.toContain('onclick')
    expect(articleContent?.textContent).toContain('Safe')
  })

  it('transforms WordPress embed wrappers into responsive iframes', () => {
    const initialData = {
      ...baseInitialData,
      content:
        '<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube"><div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=dQw4w9WgXcQ</div></figure>',
    }

    const { container } = render(
      <ArticleClientContent
        slug="test-slug"
        countryCode="ng"
        initialData={initialData}
      />,
    )

    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(iframe?.parentElement?.className).toContain('wp-embed-responsive')
  })
})
