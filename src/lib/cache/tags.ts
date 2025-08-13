export const tag = {
  list: (country: string, category?: string) => `list:${country}:${category ?? 'all'}`,
  article: (slug: string) => `article:${slug}`,
  search: (q: string, country?: string) => `search:${country ?? 'all'}:${q}`,
  categories: (country: string) => `categories:${country}`,
  bookmarks: (userId: string) => `bookmarks:${userId}`,
};
