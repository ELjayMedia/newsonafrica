import { expect, test, vi } from 'vitest';

import { getPostBySlug } from '../wp-client';

declare const global: any;

test('getPostBySlug dedupes fetches', async () => {
  const resp = {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve([{ id: 1, slug: 'a', title: 'A' }]),
  };
  const mock = vi.fn().mockResolvedValue(resp);
  global.fetch = mock;
  const [a, b, c] = await Promise.all([getPostBySlug('a'), getPostBySlug('a'), getPostBySlug('a')]);
  expect(a?.id).toBe(1);
  expect(b?.id).toBe(1);
  expect(c?.id).toBe(1);
  expect(mock).toHaveBeenCalledTimes(1);
});
