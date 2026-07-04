import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import ArticleError from './error'

vi.mock('@/lib/search', async () => {
  const actual = await vi.importActual<typeof import('@/lib/search')>('@/lib/search')
  return {
    ...actual,
    stripHtml: (value: string) => actual.stripHtml(value),
  }
})

describe('ArticleError boundary', () => {
  it('renders stale article information when provided', () => {
    const staleArticle = {
      title: '<p>Cached Headline</p>',
      excerpt: '<p>Summary</p>',
    } as any
    const reset = vi.fn()

    render(<ArticleError error={{ name: 'Error', staleArticle } as any} reset={reset} />)

    expect(screen.getByText('Temporarily unavailable')).toBeInTheDocument()
    expect(screen.getByText('Cached Headline')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })
})
