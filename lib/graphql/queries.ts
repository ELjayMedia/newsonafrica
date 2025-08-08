// GraphQL query strings for WordPress API
export const LATEST_POSTS_QUERY = `
  query LatestPosts($first: Int, $after: String) {
    posts(first: $first, after: $after, where: { status: PUBLISH }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        modified
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        tags {
          nodes {
            id
            name
            slug
          }
        }
        author {
          node {
            id
            name
            slug
            description
            avatar {
              url
            }
          }
        }
        categories {
          nodes {
            id
            name
            slug
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const POST_BY_SLUG_QUERY = `
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      id
      title
      content
      excerpt
      slug
      date
      modified
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      author {
        node {
          id
          name
          slug
          description
          avatar {
            url
          }
        }
      }
      categories {
        nodes {
          id
          name
          slug
        }
      }
      tags {
        nodes {
          id
          name
          slug
        }
      }
      seo {
        title
        metaDesc
        opengraphImage {
          sourceUrl
        }
      }
    }
  }
`

export const CATEGORIES_QUERY = `
  query GetCategories($first: Int = 100) {
    categories(first: $first, where: { hideEmpty: true }) {
      nodes {
        id
        name
        slug
        description
        count
        parent {
          node {
            id
            name
            slug
          }
        }
      }
    }
  }
`

export const POSTS_BY_CATEGORY_QUERY = `
  query GetPostsByCategory($slug: ID!, $first: Int = 20, $after: String) {
    category(id: $slug, idType: SLUG) {
      id
      name
      slug
      description
      posts(first: $first, after: $after, where: { status: PUBLISH }) {
        nodes {
          id
          title
          excerpt
          slug
          date
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          author {
            node {
              id
              name
              slug
            }
          }
          categories {
            nodes {
              id
              name
              slug
            }
          }
          tags {
            nodes {
              id
              name
              slug
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`

export const SEARCH_POSTS_QUERY = `
  query SearchPosts($search: String!, $first: Int = 20, $after: String) {
    posts(first: $first, after: $after, where: { search: $search, status: PUBLISH }) {
      nodes {
        id
        title
        excerpt
        slug
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            id
            name
            slug
          }
        }
        categories {
          nodes {
            id
            name
            slug
          }
        }
        tags {
          nodes {
            id
            name
            slug
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`

export const FEATURED_POSTS_QUERY = `
  query GetFeaturedPosts($first: Int = 10) {
    posts(first: $first, where: { status: PUBLISH, sticky: true }) {
      nodes {
        id
        title
        excerpt
        slug
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            id
            name
            slug
          }
        }
        categories {
          nodes {
            id
            name
            slug
          }
        }
        tags {
          nodes {
            id
            name
            slug
          }
        }
      }
    }
  }
`
