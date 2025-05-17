export const queries = {
  categoryPosts: `
    query CategoryPosts($slug: ID!, $after: String) {
      category(id: $slug, idType: SLUG) {
        name
        description
        posts(first: 10, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                sourceUrl
              }
            }
          }
        }
      }
    }
  `,
  allCategories: `
    query AllCategories {
      categories(first: 1000) {
        nodes {
          id
          name
          slug
          count
        }
      }
    }
  `,
  pendingComments: `
    query PendingComments {
      comments(where: { status: HOLD }, first: 100) {
        nodes {
          id
          content
          date
          author {
            node {
              name
            }
          }
          post {
            node {
              title
            }
          }
        }
      }
    }
  `,
  postComments: `
    query PostComments($postId: Int!) {
      comments(where: { postId: $postId }, first: 100) {
        nodes {
          id
          content
          date
          author {
            node {
              name
            }
          }
        }
      }
    }
  `,
  searchPosts: `
    query SearchPosts($query: String!, $after: String) {
      posts(where: {search: $query}, first: 20, after: $after) {
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
          tags {
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
  `,
  taggedPosts: `
    query TaggedPosts($tag: String!, $limit: Int!) {
      posts(first: $limit, where: { tag: $tag }) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  `,
  recentPosts: `
    query RecentPosts($limit: Int!) {
      posts(first: $limit, where: { orderby: { field: DATE, order: DESC } }) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  `,
  authorData: `
    query AuthorData($slug: ID!, $after: String) {
      user(id: $slug, idType: SLUG) {
        name
        description
        avatar {
          url
        }
        posts(first: 10, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            slug
            date
            excerpt
            featuredImage {
              node {
                sourceUrl
              }
            }
          }
        }
      }
    }
  `,
  featuredPosts: `
    query FeaturedPosts {
      posts(first: 5, where: { tag: "featured" }) {
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  `,
  categorizedPosts: `
    query CategorizedPosts {
      categories(first: 100) {
        nodes {
          id
          name
          slug
          parent {
            node {
              name
            }
          }
          posts(first: 5) {
            nodes {
              id
              title
              excerpt
              slug
              date
              featuredImage {
                node {
                  sourceUrl
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
              tags {
                nodes {
                  name
                  slug
                }
              }
            }
          }
        }
      }
    }
  `,
  singlePost: `
    query SinglePost($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id
        title
        slug
        date
        modified
        content
        excerpt
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
            description
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
        seo {
          title
          metaDesc
          opengraphImage {
            sourceUrl
          }
          schema {
            raw
          }
        }
      }
    }
  `,
  currentUser: `
    query CurrentUser {
      viewer {
        id
        name
        email
        description
      }
    }
  `,
  postsByTag: `
    query PostsByTag($tag: String!, $after: String) {
      posts(first: 10, after: $after, where: { tag: $tag }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          slug
          date
          excerpt
          featuredImage {
            node {
              sourceUrl
            }
          }
        }
      }
    }
  `,
  singleTag: `
    query SingleTag($slug: ID!) {
      tag(id: $slug, idType: SLUG) {
        name
        description
      }
    }
  `,
  singleCategory: `
    query SingleCategory($slug: ID!) {
      category(id: $slug, idType: SLUG) {
        name
        description
      }
    }
  `,
  allPosts: `
    query AllPosts($limit: Int!) {
      posts(first: $limit) {
        nodes {
          id
          title
          slug
          date
          modified
          categories {
            nodes {
              name
              slug
            }
          }
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    }
  `,
  allTags: `
    query AllTags {
      tags(first: 1000) {
        nodes {
          id
          name
          slug
          count
        }
      }
    }
  `,
  allAuthors: `
    query AllAuthors {
      users(first: 100) {
        nodes {
          id
          name
          slug
          description
        }
      }
    }
  `,
  searchPostsWithCategory: `
    query SearchPostsWithCategory($query: String!, $category: String!, $after: String) {
      posts(where: {search: $query, categoryName: $category}, first: 20, after: $after) {
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
          tags {
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
  `,
}

export const mutations = {
  approveComment: `
    mutation ApproveComment($id: ID!) {
      updateComment(input: { id: $id, status: APPROVE }) {
        success
      }
    }
  `,
  deleteComment: `
    mutation DeleteComment($id: ID!) {
      deleteComment(input: { id: $id }) {
        success
      }
    }
  `,
  createComment: `
    mutation CreateComment($input: CreateCommentInput!) {
      createComment(input: $input) {
        success
        comment {
          id
          content
          date
          author {
            node {
              name
            }
          }
        }
      }
    }
  `,
  updateUser: `
    mutation UpdateUser($input: UpdateUserInput!) {
      updateUser(input: $input) {
        user {
          id
          name
          email
          description
        }
      }
    }
  `,
}
