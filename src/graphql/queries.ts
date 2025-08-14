import { gql } from '@apollo/client';

export const GET_RECENT_POSTS = gql`
  query GetRecentPosts($count: Int) {
    posts(first: $count) {
      nodes {
        id
        title
        slug
        date
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
    }
  }
`;

export const GET_BOOKMARKS = gql`
  query GetBookmarks($userId: ID!) {
    bookmarks(where: { userId: $userId }) {
      nodes {
        id
        postId
        userId
        createdAt
        post {
          id
          title
          slug
          excerpt
          date
          featuredImage {
            node {
              sourceUrl
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  }
`;

export const ADD_BOOKMARK = gql`
  mutation AddBookmark($postId: ID!, $userId: ID!) {
    createBookmark(input: { postId: $postId, userId: $userId }) {
      bookmark {
        id
        postId
        userId
        createdAt
      }
    }
  }
`;

export const REMOVE_BOOKMARK = gql`
  mutation RemoveBookmark($id: ID!) {
    deleteBookmark(input: { id: $id }) {
      deletedId
    }
  }
`;

export const LATEST_POSTS_QUERY = gql`
  query LatestPosts($first: Int, $after: String) {
    posts(first: $first, after: $after, where: { status: PUBLISH }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        modified
        published_at: date
        updated_at: modified
        post_type: contentTypeName
        country
        source_links: sourceLinks
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        featured_image: featuredImage {
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
`;

export const POST_BY_SLUG_QUERY = gql`
  query GetPostBySlug($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      id
      title
      content
      excerpt
      slug
      date
      modified
      published_at: date
      updated_at: modified
      post_type: contentTypeName
      country
      source_links: sourceLinks
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      featured_image: featuredImage {
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
`;

export const CATEGORIES_QUERY = gql`
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
            name
            slug
          }
        }
      }
    }
  }
`;

export const POSTS_BY_CATEGORY_QUERY = gql`
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
          published_at: date
          updated_at: modified
          post_type: contentTypeName
          country
          source_links: sourceLinks
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          featured_image: featuredImage {
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
`;

export const FEATURED_POSTS_QUERY = gql`
  query GetFeaturedPosts($first: Int = 10) {
    posts(first: $first, where: { status: PUBLISH, sticky: true }) {
      nodes {
        id
        title
        excerpt
        slug
        date
        published_at: date
        updated_at: modified
        post_type: contentTypeName
        country
        source_links: sourceLinks
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        featured_image: featuredImage {
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
`;
