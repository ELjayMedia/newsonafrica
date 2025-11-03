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

vi.mock('@/lib/wordpress/post-rest', () => ({
  fetchWordPressPostBySlugRest: vi.fn(),
}))

const restMapperRef = vi.hoisted(() => ({
  current: undefined as
    | typeof import('@/lib/mapping/post-mappers').mapRestPostToWordPressPost
    | undefined,
}))

vi.mock('@/lib/mapping/post-mappers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mapping/post-mappers')>(
    '@/lib/mapping/post-mappers',
  )

  restMapperRef.current = actual.mapRestPostToWordPressPost

  return {
    ...actual,
    mapRestPostToWordPressPost: vi.fn((post: any, countryCode?: string) =>
      actual.mapRestPostToWordPressPost(post, countryCode),
    ),
  }
})

import {
  buildArticleCountryPriority,
  loadArticle,
  normalizeCountryCode,
} from './article-data'
import { fetchWordPressGraphQL } from '@/lib/wordpress/client'
import { fetchWordPressPostBySlugRest } from '@/lib/wordpress/post-rest'
import { mapRestPostToWordPressPost } from '@/lib/mapping/post-mappers'
import { CACHE_DURATIONS } from '@/lib/cache/constants'

describe('article-data', () => {
  beforeEach(() => {
    vi.mocked(fetchWordPressGraphQL).mockReset()
    vi.mocked(fetchWordPressPostBySlugRest).mockReset()
    if (restMapperRef.current) {
      vi
        .mocked(mapRestPostToWordPressPost)
        .mockImplementation((post: any, countryCode?: string) =>
          restMapperRef.current!(post, countryCode),
        )
    }
    vi.mocked(mapRestPostToWordPressPost).mockClear()
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

  it('falls back to the REST API when GraphQL returns no nodes', async () => {
    vi.mocked(fetchWordPressGraphQL).mockResolvedValue({ posts: { nodes: [] } } as any)
    const restPayload = { id: 5 }
    const mapped = { id: '5', slug: 'test-slug', title: 'From REST' } as any
    vi.mocked(fetchWordPressPostBySlugRest).mockResolvedValue(restPayload as any)
    vi.mocked(mapRestPostToWordPressPost).mockReturnValue(mapped)

    const result = await loadArticle('za', 'test-slug')

    expect(fetchWordPressPostBySlugRest).toHaveBeenCalledWith(
      'za',
      'test-slug',
      expect.objectContaining({
        revalidate: CACHE_DURATIONS.SHORT,
        tags: expect.arrayContaining(['slug:test-slug']),
      }),
    )
    expect(mapRestPostToWordPressPost).toHaveBeenCalledWith(restPayload, 'za')
    expect(result).toBe(mapped)
  })

  it('returns the REST mapped result when GraphQL throws an error', async () => {
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(new Error('GraphQL down'))
    const restPayload = { id: 9 }
    const mapped = { id: '9', slug: 'test-slug', title: 'Recovered via REST' } as any
    vi.mocked(fetchWordPressPostBySlugRest).mockResolvedValue(restPayload as any)
    vi.mocked(mapRestPostToWordPressPost).mockReturnValue(mapped)

    const result = await loadArticle('za', 'test-slug')

    expect(fetchWordPressPostBySlugRest).toHaveBeenCalled()
    expect(result).toBe(mapped)
  })

  it('re-throws the GraphQL error when REST fallback also fails', async () => {
    const failure = new Error('GraphQL fatal')
    vi.mocked(fetchWordPressGraphQL).mockRejectedValue(failure)
    vi.mocked(fetchWordPressPostBySlugRest).mockResolvedValue(null)

    await expect(loadArticle('za', 'test-slug')).rejects.toBe(failure)
  })
})
