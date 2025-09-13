import { gql } from "graphql-tag"

export const typeDefs = gql`
  type Query {
    posts(limit: Int, offset: Int, category: String): PostConnection!
    post(slug: String!): Post
    categories: [Category!]!
    category(slug: String!): Category
    authors: [Author!]!
    author(slug: String!): Author
    tags: [Tag!]!
    tag(slug: String!): Tag
    search(query: String!, limit: Int, offset: Int): PostConnection!
    me: User
  }

  type Mutation {
    createComment(input: CommentInput!): Comment
    updateProfile(input: ProfileInput!): User
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
    slug: String!
    excerpt: String!
    content: String
    date: String!
    modified: String!
    featuredImage: Image
    author: Author!
    categories: [Category!]!
    tags: [Tag!]!
    comments(limit: Int): [Comment!]!
    commentCount: Int!
    seo: SEO
  }

  type Image {
    sourceUrl: String!
    altText: String
    width: Int
    height: Int
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    description: String
    posts(limit: Int, offset: Int): PostConnection!
    parent: Category
    children: [Category!]!
  }

  type Author {
    id: ID!
    name: String!
    slug: String!
    description: String
    avatar: String
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
  }

  type CommentAuthor {
    id: ID
    name: String!
    avatar: String
    isRegistered: Boolean!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
    comments: [Comment!]!
  }

  type SEO {
    title: String
    description: String
    canonical: String
    ogImage: String
  }


  input CommentInput {
    postId: ID!
    content: String!
    parentId: ID
  }

  input ProfileInput {
    name: String
    email: String
    avatar: String
    bio: String
  }
`
