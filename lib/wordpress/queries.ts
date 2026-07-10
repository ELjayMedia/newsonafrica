/**
 * WPGraphQL operation strings used by the GraphQL client (NOA-85).
 *
 * REST remains the primary transport for the DAL (NOA-86) since it needs no
 * plugin beyond core WordPress; these operations are available for callers
 * that prefer/require GraphQL (e.g. batched nested queries) against
 * instances running WPGraphQL.
 */

const POST_FIELDS = /* GraphQL */ `
  id
  databaseId
  slug
  date
  title
  excerpt
  featuredImage {
    node {
      sourceUrl
      altText
    }
  }
  categories {
    nodes {
      id
      databaseId
      name
      slug
    }
  }
  tags {
    nodes {
      id
      databaseId
      name
      slug
    }
  }
  author {
    node {
      id
      databaseId
      name
      slug
    }
  }
`;

export const POSTS_LIST_QUERY = /* GraphQL */ `
  query PostsList($first: Int!, $after: String, $categoryName: String) {
    posts(
      first: $first
      after: $after
      where: { categoryName: $categoryName, status: PUBLISH }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ${POST_FIELDS}
      }
    }
  }
`;

export const POST_BY_SLUG_QUERY = /* GraphQL */ `
  query PostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      ${POST_FIELDS}
      content
    }
  }
`;

export const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories($first: Int!) {
    categories(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        count
        description
      }
    }
  }
`;

export const TAGS_QUERY = /* GraphQL */ `
  query Tags($first: Int!) {
    tags(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        count
      }
    }
  }
`;

export const TAG_BY_SLUG_QUERY = /* GraphQL */ `
  query TagBySlug($slug: [String]) {
    tags(where: { slug: $slug }) {
      nodes {
        id
        databaseId
        name
        slug
        count
      }
    }
  }
`;

export const AUTHORS_QUERY = /* GraphQL */ `
  query Authors($first: Int!) {
    users(first: $first) {
      nodes {
        id
        databaseId
        name
        slug
        description
        avatar {
          url
        }
      }
    }
  }
`;
