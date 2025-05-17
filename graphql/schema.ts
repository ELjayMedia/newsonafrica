export const typeDefs = `#graphql
  type Query {
    posts(limit: Int, offset: Int, category: String): PostConnection!
    post(slug: String!): Post
    categories: [Category!]!
    category(slug: String!): Category
    authors: [Author!]!
    author(slug: String!): Author
    tags: [Tag!]!
    tag(slug: String!): Tag
    search(query: String!, limit: Int, offset: Int, category: String): PostConnection!
    me: User
  }

  type Mutation {
    createComment(input: CommentInput!): CommentResponse!
    bookmarkPost(postId: ID!): BookmarkResponse!
    removeBookmark(postId: ID!): BookmarkResponse!
    updateProfile(input: ProfileInput!): User!
  }

  type PostConnection {
    edges: [Post!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type Post {
    id: ID!
    title: String!
    content: String
    excerpt: String
    slug: String!
    date: String!
    modified: String
    featuredImage: FeaturedImage
    author: Author!
    categories: [Category!]!
    tags: [Tag!]!
    comments(limit: Int): [Comment!]!
    commentCount: Int!
    isBookmarked: Boolean!
    seo: SEO
  }

  type FeaturedImage {
    sourceUrl: String!
    altText: String
  }

  type Author {
    id: ID
    name: String!
    slug: String!
    description: String
    avatar: Avatar
    posts(limit: Int, offset: Int): PostConnection!
  }

  type Avatar {
    url: String
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    parent: Category
    children: [Category!]!
    posts(limit: Int, offset: Int): PostConnection!
  }

  type Tag {
    id: ID!
    name: String!
    slug: String!
    description: String
    posts(limit: Int, offset: Int): PostConnection!
  }

  type Comment {
    id: ID!
    content: String!
    date: String!
    author: CommentAuthor!
    post: Post!
    parent: Comment
    replies: [Comment!]!
    status: String!
  }

  type CommentAuthor {
    id: ID
    name: String!
    avatar: String
    isRegistered: Boolean!
  }

  type SEO {
    title: String
    metaDesc: String
    opengraphImage: SEOImage
  }

  type SEOImage {
    sourceUrl: String
  }

  type User {
    id: ID!
    email: String!
    name: String
    avatar: String
    bookmarks: [Post!]!
    comments: [Comment!]!
  }

  type BookmarkResponse {
    success: Boolean!
    message: String!
    post: Post
  }

  type CommentResponse {
    success: Boolean!
    message: String!
    comment: Comment
  }

  input CommentInput {
    postId: ID!
    content: String!
    parentId: ID
  }

  input ProfileInput {
    name: String
    avatar: String
  }
`
