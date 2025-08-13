import { revalidateTag } from 'next/cache';

export const tag = {
  article: (slug: string) => `article:${slug}`,
  list: (country: string, category?: string) => `list:${country}:${category ?? 'all'}`,
  bookmarks: (userId: string) => `bookmarks:${userId}`,
};

export const bust = { byTag: (t: string) => revalidateTag(t) };
