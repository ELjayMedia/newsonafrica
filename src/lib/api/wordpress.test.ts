/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, test, expect } from 'vitest';

declare const global: any;
global.cache = (fn: any) => fn;
vi.mock('react', () => ({ cache: (fn: any) => fn }));
vi.mock('@/config/wordpress', () => ({
  WORDPRESS_GRAPHQL_URL: '',
  WORDPRESS_REST_API_URL: '',
}));
vi.mock('@/lib/utils/wordpress', () => ({
  transformRestPostToGraphQL: (p: any) => p,
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

test('getMostRead fetches analytics with caching and pagination', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');

  const originalFetch = global.fetch;
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ post_id: '1', count: 5 }]), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([makePost('1', '2024-01-01')]), { status: 200 }),
    );
  global.fetch = fetchMock;

  const { getMostRead } = await import('./wordpress');

  const posts = await getMostRead(1, 1);
  expect(posts[0].id).toBe('1');
  // Second call should hit cache
  const cached = await getMostRead(1, 1);
  expect(cached[0].id).toBe('1');
  expect(fetchMock).toHaveBeenCalledTimes(2);

  // Fetch next page
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ post_id: '2', count: 3 }]), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([makePost('2', '2024-01-02')]), { status: 200 }),
    );
  const page2 = await getMostRead(1, 2);
  expect(page2[0].id).toBe('2');
  expect(fetchMock.mock.calls[2][0]).toContain('offset=1');
  expect(fetchMock).toHaveBeenCalledTimes(4);

  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});
