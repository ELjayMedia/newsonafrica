const gql = String.raw

export const POST_FIELDS_FRAGMENT = gql`
  fragment PostFields on Post {
    databaseId
    id
    slug
    date
    modified
    title
    excerpt
    content
    uri
    link
    featuredImage {
      node {
        sourceUrl
        altText
        caption
        mediaDetails {
          width
          height
        }
      }
    }
    countries {
      nodes {
        databaseId
        slug
      }
    }
    categories {
      nodes {
        databaseId
        name
        slug
      }
    }
    tags {
      nodes {
        databaseId
        name
        slug
      }
    }
    author {
      node {
        databaseId
        name
        slug
        avatar {
          url
        }
      }
    }
  }
`

export const LATEST_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query LatestPosts($first: Int!, $after: String) {
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export const TAGGED_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query TaggedPosts($tagSlugs: [String!]!, $first: Int!, $after: String) {
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: $tagSlugs
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export const RELATED_POSTS_BY_TAGS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query RelatedPostsByTags(
    $tagSlugs: [String!]!
    $exclude: ID!
    $first: Int!
  ) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: $tagSlugs
        notIn: [$exclude]
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const FP_TAGGED_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query FpTaggedPosts($tagSlugs: [String!]!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: $tagSlugs
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const FRONT_PAGE_SLICES_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query FrontPageSlices(
    $heroFirst: Int!
    $heroTagSlugs: [String!]
    $latestFirst: Int!
  ) {
    hero: posts(
      first: $heroFirst
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: $heroTagSlugs
      }
    ) {
      nodes {
        ...PostFields
      }
    }
    latest: posts(
      first: $latestFirst
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        cursor
        node {
          ...PostFields
        }
      }
    }
  }
`

export const POSTS_BY_CATEGORY_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query PostsByCategory($category: String!, $first: Int!, $tagSlugs: [String!]!, $after: String) {
    categories(where: { slug: [$category] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $category
        tagSlugIn: $tagSlugs
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export const CATEGORY_POSTS_BATCH_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query CategoryPostsBatch($slugs: [String!]!, $first: Int!) {
    categories(where: { slugIn: $slugs }) {
      nodes {
        databaseId
        name
        slug
        description
        count
        posts(
          first: $first
          where: {
            status: PUBLISH
            orderby: { field: DATE, order: DESC }
          }
        ) {
          pageInfo {
            endCursor
            hasNextPage
          }
          nodes {
            ...PostFields
          }
        }
      }
    }
  }
`

export const CATEGORIES_QUERY = gql`
  query AllCategories($first: Int = 100) {
    categories(first: $first, where: { hideEmpty: true }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
  }
`

export const POST_CATEGORIES_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query PostCategories($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      categories {
        nodes {
          databaseId
        }
      }
    }
  }
`

export const RELATED_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query RelatedPosts(
    $catIds: [ID!]
    $exclude: ID!
    $first: Int!
  ) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        notIn: [$exclude]
        categoryIn: $catIds
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const FEATURED_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query FeaturedPosts($tag: String!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        tagSlugIn: [$tag]
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query Posts(
    $first: Int!
    $after: String
    $category: String
    $tagSlugs: [String!]
    $search: String
    $authorIds: [ID!]
    $includeIds: [ID!]
    $onlySticky: Boolean
    $offset: Int
    $countryTermIds: [ID!]
  ) {
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $category
        tagSlugIn: $tagSlugs
        search: $search
        authorIn: $authorIds
        in: $includeIds
        onlySticky: $onlySticky
        offsetPagination: { offset: $offset, size: $first }
        taxQuery: {
          relation: AND
          taxArray: [
            {
              taxonomy: COUNTRIES
              field: TERM_ID
              terms: $countryTermIds
            }
          ]
        }
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
        offsetPagination {
          total
        }
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export const TAGS_QUERY = gql`
  query Tags($first: Int!, $hideEmpty: Boolean) {
    tags(first: $first, where: { hideEmpty: $hideEmpty }) {
      nodes {
        databaseId
        id
        name
        slug
        count
      }
    }
  }
`

export const TAG_BY_SLUG_QUERY = gql`
  query TagBySlug($slug: ID!) {
    tag(id: $slug, idType: SLUG) {
      databaseId
      id
      name
      slug
      count
    }
  }
`

export const POST_BY_SLUG_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query PostBySlug($slug: ID!, $countryTermIds: [ID!]) {
    posts(
      first: 1
      where: {
        status: PUBLISH
        nameIn: [$slug]
        taxQuery: {
          relation: AND
          taxArray: [
            {
              taxonomy: COUNTRIES
              field: TERM_ID
              terms: $countryTermIds
            }
          ]
        }
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const AUTHOR_DATA_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query AuthorData($slug: String!, $after: String, $first: Int!) {
    user(id: $slug, idType: SLUG) {
      databaseId
      name
      slug
      description
      avatar {
        url
      }
      posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          ...PostFields
        }
      }
    }
  }
`

export const CATEGORY_POSTS_QUERY = gql`
  ${POST_FIELDS_FRAGMENT}
  query CategoryPosts($slug: String!, $after: String, $first: Int!) {
    categories(where: { slug: [$slug] }) {
      nodes {
        databaseId
        name
        slug
        description
        count
      }
    }
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $slug
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostFields
      }
    }
  }
`

export const WORDPRESS_REST_MAX_PER_PAGE = 100

type RecentPostsOptions =
  | number
  | {
      perPage?: number
      page?: number
      offset?: number
    }

export const wordpressQueries = {
  recentPosts: (input: RecentPostsOptions = 20) => {
    const perPage = typeof input === 'number' ? input : input.perPage ?? 20
    const params: Record<string, string | number> = {
      per_page: Math.min(perPage, WORDPRESS_REST_MAX_PER_PAGE),
      _embed: 1,
      order: 'desc',
      orderby: 'date',
    }

    if (typeof input !== 'number') {
      if (typeof input.page === 'number') {
        params.page = input.page
      }

      if (typeof input.offset === 'number') {
        params.offset = input.offset
      }
    }

    return {
      endpoint: 'posts',
      params,
    }
  },
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
  postsByCategory: (id: number | string, limit = 20, options?: { tagId?: number | string }) => ({
    endpoint: 'posts',
    params: {
      categories: id,
      per_page: limit,
      _embed: 1,
      ...(options?.tagId ? { tags: options.tagId } : {}),
    },
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
