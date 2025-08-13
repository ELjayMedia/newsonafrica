export type Article = {
  id: number;
  slug: string;
  country: string;          // 'sz', 'za', ...
  categorySlugs: string[];  // normalized slugs
  title: string;
  excerpt?: string;
  html?: string;            // article body (sanitized)
  authorName?: string;
  authorId?: number;
  publishedAt: string;      // ISO 8601
  updatedAt?: string;       // ISO 8601
  image?: { src: string; alt?: string; width?: number; height?: number };
  sourceUrl?: string;       // if syndicated
};
