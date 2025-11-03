import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/wordpress/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/wordpress/client')>(
    '@/lib/wordpress/client',
  )

  return {
    ...actual,
    fetchWordPressGraphQL: vi.fn(),
  }
})

import {
  buildArticleCountryPriority,
  loadArticle,
  normalizeCountryCode,
} from './article-data'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'

describe('article-data', () => {
  beforeEach(() => {
    vi.mocked(fetchWordPressGraphQL).mockReset()
  })

  it('returns only supported wordpress countries in the fallback priority', () => {
    const priority = buildArticleCountryPriority('african-edition')

    expect(priority).toEqual(expect.arrayContaining(['sz', 'za']))
    expect(priority).not.toContain('african-edition')
    expect(priority.every((code) => normalizeCountryCode(code) === code)).toBe(true)
  })

  it('does not call wordpress when asked to load an unsupported country', async () => {
    const result = await loadArticle('african-edition', 'test-slug')

    expect(result).toBeNull()
    expect(fetchWordPressGraphQL).not.toHaveBeenCalled()
  })
})
