import { vi, test, expect } from 'vitest';

declare const global: any;
global.cache = (fn: any) => fn;
vi.mock('react', () => ({ cache: (fn: any) => fn }));
import type { WordPressPost } from './wordpress';

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
  } as any;
}

test('pickTopStory prefers fp tag', async () => {
  const { pickTopStory } = await import('./wordpress');
  const posts = [makePost('1', '2024-01-02', ['fp']), makePost('2', '2024-01-03')];
  const top = pickTopStory(posts);
  expect(top?.id).toBe('1');
});

test('sortPostsByDate orders descending', async () => {
  const { sortPostsByDate } = await import('./wordpress');
  const posts = [makePost('1', '2024-01-01'), makePost('2', '2024-01-03')];
  const sorted = sortPostsByDate(posts);
  expect(sorted[0].id).toBe('2');
});
