import { gql } from "@apollo/client";

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