import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('@/config/site', () => ({ siteConfig: { wordpress: { apiUrl: 'https://example.com' } } }));

import * as searchModule from '../searchPosts';

declare const global: any;

beforeEach(() => {
  vi.resetAllMocks();
});

test('returns empty array without recursion when API fails', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('API failure'));
  global.fetch = fetchMock;
  const searchSpy = vi.spyOn(searchModule, 'searchPosts');

  const result = await searchModule.searchPosts('query');

  expect(result).toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(searchSpy).toHaveBeenCalledTimes(1);
});
