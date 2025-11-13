const gql = String.raw

export const POST_SUMMARY_FIELDS_FRAGMENT = gql`
  fragment PostSummaryFields on Post {
    databaseId
    id
    slug
    date
    modified
    title(format: RENDERED)
    excerpt(format: RENDERED)
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
  }
`

export const POST_FIELDS_FRAGMENT = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
  fragment PostFields on Post {
    ...PostSummaryFields
    content(format: RENDERED)
  }
`

export const LATEST_POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const TAGGED_POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const RELATED_POSTS_BY_TAGS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const FP_TAGGED_POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const FRONT_PAGE_SLICES_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
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
          ...PostSummaryFields
        }
      }
    }
  }
`

export const POSTS_BY_CATEGORY_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
  query PostsByCategory($category: String!, $first: Int!, $after: String) {
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
      }
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
      nodes {
        ...PostSummaryFields
      }
    }
  }
`

export const CATEGORY_POSTS_BATCH_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
  query CategoryPostsBatch($slugs: [String!]!, $first: Int!) {
    categories(where: { slug: $slugs }) {
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
            ...PostSummaryFields
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
        parentDatabaseId
        children {
          nodes {
            databaseId
            name
            slug
            description
            count
            parentDatabaseId
          }
        }
      }
    }
  }
`

export const POST_CATEGORIES_QUERY = gql`
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
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const FEATURED_POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`

export const POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
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
  query PostBySlug($slug: ID!, $asPreview: Boolean = false) {
    post(id: $slug, idType: SLUG, asPreview: $asPreview) {
      ...PostFields
    }
    posts(
      first: 1
      where: {
        status: PUBLISH
        nameIn: [$slug]
      }
    ) {
      nodes {
        ...PostFields
      }
    }
  }
`

export const AUTHOR_DATA_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
  query AuthorData($slug: String!, $after: String, $first: Int!) {
    user(id: $slug, idType: SLUG) {
      id
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
          ...PostSummaryFields
        }
      }
    }
  }
`

export const AUTHORS_QUERY = gql`
  query Authors($first: Int!) {
    users(
      first: $first
      where: { orderby: { field: DISPLAY_NAME, order: ASC }, hasPublishedPosts: true }
    ) {
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
`

export const CATEGORY_POSTS_QUERY = gql`
  ${POST_SUMMARY_FIELDS_FRAGMENT}
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
        ...PostSummaryFields
      }
    }
  }
`
