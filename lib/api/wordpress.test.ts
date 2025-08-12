import { vi, test, expect } from 'vitest'
vi.mock('react', () => ({ cache: (fn: any) => fn }))
import { pickTopStory, sortPostsByDate } from './wordpress'
import type { WordPressPost } from './wordpress'

function makePost(id: string, date: string, tags: string[] = []): WordPressPost {
  return {
    id,
    title: id,
    excerpt: '',
    slug: id,
    date,
    author: { node: { id: 'a', name: 'a', slug: 'a' } },
    categories: { nodes: [] },
    tags: { nodes: tags.map((t, i) => ({ id: String(i), name: t, slug: t })) },
  } as any
}

test('pickTopStory prefers fp tag', () => {
  const posts = [makePost('1', '2024-01-02', ['fp']), makePost('2', '2024-01-03')]
  const top = pickTopStory(posts)
  expect(top?.id).toBe('1')
})

test('sortPostsByDate orders descending', () => {
  const posts = [makePost('1', '2024-01-01'), makePost('2', '2024-01-03')]
  const sorted = sortPostsByDate(posts)
  expect(sorted[0].id).toBe('2')
})
