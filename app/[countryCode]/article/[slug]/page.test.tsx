import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/wordpress-api', () => ({
  fetchFromWp: vi.fn(),
}))

vi.mock('./ArticleClientContent', () => ({
  ArticleClientContent: ({ initialData }: { initialData: any }) => (
    <div>{initialData.title}</div>
  ),
}))

import Page from './page'
import { fetchFromWp } from '@/lib/wordpress-api'

describe('ArticlePage', () => {
  it('renders post content', async () => {
    vi.mocked(fetchFromWp).mockResolvedValue([
      { title: 'Hello', slug: 'test' },
    ])
    const ui = await Page({ params: { countryCode: 'sz', slug: 'test' } })
    render(ui)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(fetchFromWp).toHaveBeenCalled()
  })
})
