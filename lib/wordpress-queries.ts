export const wordpressQueries = {
  recentPosts: (limit = 20) => ({
    endpoint: 'posts',
    params: { per_page: limit, _embed: 1, order: 'desc', orderby: 'date' },
  }),
  categoryBySlug: (slug: string) => ({
    endpoint: 'categories',
    params: { slug },
  }),
  postsByCategory: (id: number | string, limit = 20) => ({
    endpoint: 'posts',
    params: { categories: id, per_page: limit, _embed: 1 },
  }),
  categories: () => ({
    endpoint: 'categories',
    params: { per_page: 100, hide_empty: true },
  }),
  postBySlug: (slug: string) => ({
    endpoint: 'posts',
    params: { slug, _embed: 1 },
  }),
  postById: (id: number | string) => ({
    endpoint: `posts/${id}`,
    params: { _embed: 1 },
  }),
  relatedPosts: (categoryIds: Array<number | string>, excludeId: number | string, limit = 6) => ({
    endpoint: 'posts',
    params: {
      categories: categoryIds.join(','),
      exclude: excludeId,
      per_page: limit,
      _embed: 1,
    },
  }),
  tagBySlug: (slug: string) => ({
    endpoint: 'tags',
    params: { slug },
  }),
  postsByTag: (id: number | string, limit = 20) => ({
    endpoint: 'posts',
    params: { tags: id, per_page: limit, _embed: 1 },
  }),
  tags: () => ({
    endpoint: 'tags',
    params: { per_page: 100, hide_empty: true },
  }),
  authors: () => ({
    endpoint: 'users',
    params: { per_page: 100 },
  }),
  featuredPosts: (tagId: number | string, limit = 10) => ({
    endpoint: 'posts',
    params: { tags: tagId, per_page: limit, _embed: 1 },
  }),
}
export type WordpressQuery = ReturnType<typeof wordpressQueries.recentPosts>
