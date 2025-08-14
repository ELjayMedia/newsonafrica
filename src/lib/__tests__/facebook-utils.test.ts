import { expect, test, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));

import { getFacebookUserData } from '../facebook-utils';

test('fetches facebook user data with authorization header', async () => {
  const mockData = { id: '1', name: 'Mark' };
  const response = {
    ok: true,
    json: () => Promise.resolve(mockData),
  } as const;
  const fetchMock = vi.fn().mockResolvedValue(response);
  (globalThis as { fetch: typeof fetch }).fetch = fetchMock;
  const token = 'test-token';
  const data = await getFacebookUserData(token);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://graph.facebook.com/me?fields=id,name,email,picture.type(large),first_name,last_name,link',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(data).toEqual(mockData);
});
