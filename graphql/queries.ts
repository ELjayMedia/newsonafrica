import { gql } from "@apollo/client"

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
