import { gql } from "@apollo/client"

export const GET_POSTS = gql`
  query GetPosts($first: Int, $after: String, $categoryName: String) {
    posts(first: $first, after: $after, where: { categoryName: $categoryName }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            slug
          }
        }
        categories {
          nodes {
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

export const GET_POST = gql`
  query GetPost($slug: String!) {
    postBy(slug: $slug) {
      id
      title
      content
      excerpt
      date
      slug
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      author {
        node {
          name
          slug
          avatar {
            url
          }
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
      tags {
        nodes {
          name
          slug
        }
      }
    }
  }
`

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
              altText
            }
          }
          author {
            node {
              name
              slug
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
`

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
`

export const REMOVE_BOOKMARK = gql`
  mutation RemoveBookmark($id: ID!) {
    deleteBookmark(input: { id: $id }) {
      deletedId
    }
  }
`

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      nodes {
        id
        name
        slug
        count
        description
      }
    }
  }
`

export const GET_FEATURED_POSTS = gql`
  query GetFeaturedPosts($first: Int = 5) {
    posts(first: $first, where: { metaKey: "featured", metaValue: "1" }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            slug
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
`

export const SEARCH_POSTS = gql`
  query SearchPosts($search: String!, $first: Int = 10) {
    posts(first: $first, where: { search: $search }) {
      nodes {
        id
        title
        slug
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            slug
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
`
