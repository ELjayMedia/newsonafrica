/**
 * WPGraphQL operations used by the data access layer (NOA-86).
 *
 * WPGraphQL is the primary (and proven) content transport for this WordPress
 * multisite — the legacy app fetched all posts/terms/authors this way and REST
 * v2 is not reliably exposed for content on the install. Each country edition
 * answers at `${WORDPRESS_API_URL}/<country>/graphql`.
 *
 * Listing operations use the WPGraphQL Offset Pagination plugin
 * (`where: { offsetPagination: { offset, size } }` + `pageInfo.offsetPagination.total`)
 * so the DAL can keep page-number pagination with real totals.
 */

/** Summary fields for a post card / feed item (no body content). */
const POST_SUMMARY_FIELDS = /* GraphQL */ `
  databaseId
  id
  slug
  date
  modified
  title(format: RENDERED)
  excerpt(format: RENDERED)
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
      description
      avatar {
        url
      }
    }
  }
`;

/** Summary fields plus the rendered body + status, for article + sync reads. */
const POST_DETAIL_FIELDS = /* GraphQL */ `
  ${POST_SUMMARY_FIELDS}
  status
  content(format: RENDERED)
`;

const TERM_FIELDS = /* GraphQL */ `
  databaseId
  name
  slug
  description
  count
`;

const AUTHOR_FIELDS = /* GraphQL */ `
  databaseId
  name
  slug
  description
  avatar {
    url
  }
`;

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export const POSTS_LIST_QUERY = /* GraphQL */ `
  query PostsList(
    $size: Int!
    $offset: Int!
    $categoryName: String
    $tagSlugs: [String]
    $authorName: String
    $search: String
  ) {
    posts(
      first: $size
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryName: $categoryName
        tagSlugIn: $tagSlugs
        authorName: $authorName
        search: $search
        offsetPagination: { offset: $offset, size: $size }
      }
    ) {
      pageInfo {
        offsetPagination {
          total
        }
      }
      nodes {
        ${POST_SUMMARY_FIELDS}
      }
    }
  }
`;

/** Post listing including body content + status — used by content-sync. */
export const POSTS_WITH_CONTENT_QUERY = /* GraphQL */ `
  query PostsWithContent($size: Int!, $offset: Int!) {
    posts(
      first: $size
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        offsetPagination: { offset: $offset, size: $size }
      }
    ) {
      pageInfo {
        offsetPagination {
          total
        }
      }
      nodes {
        ${POST_DETAIL_FIELDS}
      }
    }
  }
`;

export const POST_BY_SLUG_QUERY = /* GraphQL */ `
  query PostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${POST_DETAIL_FIELDS}
    }
  }
`;

export const POST_BY_DATABASE_ID_QUERY = /* GraphQL */ `
  query PostByDatabaseId($id: ID!) {
    post(id: $id, idType: DATABASE_ID) {
      ${POST_DETAIL_FIELDS}
    }
  }
`;

export const RELATED_BY_CATEGORIES_QUERY = /* GraphQL */ `
  query RelatedByCategories($catIds: [ID!], $exclude: ID!, $first: Int!) {
    posts(
      first: $first
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        categoryIn: $catIds
        notIn: [$exclude]
      }
    ) {
      nodes {
        ${POST_SUMMARY_FIELDS}
      }
    }
  }
`;

export const RELATED_BY_TAGS_QUERY = /* GraphQL */ `
  query RelatedByTags($tagSlugs: [String], $exclude: ID!, $first: Int!) {
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
        ${POST_SUMMARY_FIELDS}
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories($size: Int!, $offset: Int!) {
    categories(
      first: $size
      where: { hideEmpty: false, offsetPagination: { offset: $offset, size: $size } }
    ) {
      pageInfo {
        offsetPagination {
          total
        }
      }
      nodes {
        ${TERM_FIELDS}
      }
    }
  }
`;

export const CATEGORY_BY_SLUG_QUERY = /* GraphQL */ `
  query CategoryBySlug($slug: [String]) {
    categories(first: 1, where: { slug: $slug }) {
      nodes {
        ${TERM_FIELDS}
      }
    }
  }
`;

export const CATEGORY_BY_ID_QUERY = /* GraphQL */ `
  query CategoryById($id: ID!) {
    category(id: $id, idType: DATABASE_ID) {
      ${TERM_FIELDS}
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

export const TAGS_QUERY = /* GraphQL */ `
  query Tags($size: Int!, $offset: Int!) {
    tags(first: $size, where: { hideEmpty: false, offsetPagination: { offset: $offset, size: $size } }) {
      pageInfo {
        offsetPagination {
          total
        }
      }
      nodes {
        ${TERM_FIELDS}
      }
    }
  }
`;

export const TAG_BY_SLUG_QUERY = /* GraphQL */ `
  query TagBySlug($slug: [String]) {
    tags(first: 1, where: { slug: $slug }) {
      nodes {
        ${TERM_FIELDS}
      }
    }
  }
`;

/* ------------------------------------------------------------------ */
/* Authors (WordPress users)                                           */
/* ------------------------------------------------------------------ */

export const AUTHORS_QUERY = /* GraphQL */ `
  query Authors($size: Int!, $offset: Int!) {
    users(
      first: $size
      where: {
        hasPublishedPosts: true
        orderby: { field: DISPLAY_NAME, order: ASC }
        offsetPagination: { offset: $offset, size: $size }
      }
    ) {
      pageInfo {
        offsetPagination {
          total
        }
      }
      nodes {
        ${AUTHOR_FIELDS}
      }
    }
  }
`;

export const AUTHOR_BY_SLUG_QUERY = /* GraphQL */ `
  query AuthorBySlug($slug: ID!) {
    user(id: $slug, idType: SLUG) {
      ${AUTHOR_FIELDS}
    }
  }
`;
