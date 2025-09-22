export const wordpressQueries = {
  recentPosts: (limit = 20) => ({
    endpoint: 'posts',
    params: { per_page: limit, _embed: 1, order: 'desc', orderby: 'date' },
  }),
  posts: ({
    page = 1,
    perPage = 10,
    category,
    tag,
    search,
    author,
    featured,
    ids,
    countryTermId,
  }: {
    page?: number
    perPage?: number
    category?: string
    tag?: string
    search?: string
    author?: string
    featured?: boolean
    ids?: Array<number | string>
    countryTermId?: number
  }) => ({
    endpoint: 'posts',
    params: {
      page,
      per_page: perPage,
      _embed: 1,
      ...(search ? { search } : {}),
      ...(category ? { categories: category } : {}),
      ...(tag ? { tags: tag } : {}),
      ...(author ? { author } : {}),
      ...(featured ? { sticky: 'true' } : {}),
      ...(ids && ids.length ? { include: ids.join(',') } : {}),
      ...(countryTermId ? { countries: countryTermId } : {}),
    },
  }),
  categoryBySlug: (slug: string) => ({
    endpoint: 'categories',
    params: { slug },
  }),
  postsByCategory: (id: number | string, limit = 20) => ({
    endpoint: 'posts',
    params: { categories: id, per_page: limit, _embed: 1 },
  }),
  categoriesBySlugs: (slugs: string[]) => ({
    endpoint: 'categories',
    params: {
      slug: slugs.join(','),
      per_page: Math.max(slugs.length, 1),
      hide_empty: false,
    },
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
  relatedPostsByTags: (
    tagIds: Array<number | string>,
    excludeId: number | string,
    limit = 6,
  ) => ({
    endpoint: 'posts',
    params: {
      tags: tagIds.join(','),
      tags_relation: 'AND',
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
export type WordpressQuery = ReturnType<(typeof wordpressQueries)[keyof typeof wordpressQueries]>
