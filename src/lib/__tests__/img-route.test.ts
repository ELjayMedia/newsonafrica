import { expect, test } from 'vitest';

import { isAllowedSrc } from '../img-route';

test('allows whitelisted domains', () => {
  expect(isAllowedSrc('https://newsonafrica.com/image.jpg')).toBe(true);
  expect(isAllowedSrc('https://cdn.newsonafrica.com/pic.png')).toBe(true);
  expect(isAllowedSrc('https://bucket.supabase.co/file.png')).toBe(true);
});

test('blocks non-whitelisted domains', () => {
  expect(isAllowedSrc('https://example.com/image.jpg')).toBe(false);
  expect(isAllowedSrc('https://newsafrica.com/image.jpg')).toBe(false);
});
