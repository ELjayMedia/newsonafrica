import { vi, test, expect } from 'vitest';

declare const global: any;
global.cache = (fn: any) => fn;
vi.mock('react', () => ({ cache: (fn: any) => fn }));
vi.mock('@/config/wordpress', () => ({
  WORDPRESS_GRAPHQL_URL: '',
  WORDPRESS_REST_API_URL: '',
}));
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
    post_type: 'news_article',
    published_at: date,
    updated_at: date,
    featured_image: null,
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

test('getMarketSnapshot reads local file when no site url', async () => {
  vi.unstubAllEnvs();
  const { getMarketSnapshot } = await import('./market');
  const data = await getMarketSnapshot();
  expect(data.length).toBeGreaterThan(0);
});

test('getMarketSnapshot returns empty array on fetch error', async () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');
  const originalFetch = global.fetch;
  global.fetch = vi.fn().mockRejectedValue(new Error('fail'));
  const { getMarketSnapshot } = await import('./market');
  const data = await getMarketSnapshot();
  expect(data).toEqual([]);
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});
