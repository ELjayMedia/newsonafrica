import { gql } from 'graphql-request';

export const PostCardFragment = gql`
  fragment PostCard on Post {
    id
    slug
    date
    title
    excerpt
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
`;

export const PostsByCountryDocument = gql`
  ${PostCardFragment}
  query PostsByCountry($countrySlug: [String!], $first: Int = 20, $after: String, $category: String) {
    posts(
      first: $first
      after: $after
      where: {
        status: PUBLISH
        orderby: { field: DATE, order: DESC }
        taxQuery: {
          taxArray: [
            { taxonomy: COUNTRY, field: SLUG, terms: $countrySlug, operator: IN }
            { taxonomy: CATEGORY, field: SLUG, terms: [$category], operator: IN }
          ]
        }
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostCard
      }
    }
  }
`;

export const PostBySlugDocument = gql`
  query PostBySlug($slug: String!) {
    postBy(slug: $slug) {
      id
      slug
      date
      title
      excerpt
      content
      featuredImage {
        node {
          sourceUrl
        }
      }
      tags {
        nodes {
          slug
        }
      }
    }
  }
`;
