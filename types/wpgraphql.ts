/* eslint-disable */
// This file is generated via GraphQL Code Generator. Do not edit manually.
export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] }
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> }
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> }

export type Scalars = {
  readonly ID: string
  readonly String: string
  readonly Boolean: boolean
  readonly Int: number
  readonly Float: number
}

export type MediaDetails = {
  readonly __typename?: "MediaDetails"
  readonly height?: Maybe<Scalars["Int"]>
  readonly width?: Maybe<Scalars["Int"]>
}

export type MediaItem = {
  readonly __typename?: "MediaItem"
  readonly altText?: Maybe<Scalars["String"]>
  readonly mediaDetails?: Maybe<MediaDetails>
  readonly sourceUrl?: Maybe<Scalars["String"]>
}

export type MediaItemEdge = {
  readonly __typename?: "NodeWithFeaturedImageToMediaItemConnectionEdge"
  readonly node?: Maybe<MediaItem>
}

export type Category = {
  readonly __typename?: "Category"
  readonly databaseId?: Maybe<Scalars["Int"]>
  readonly description?: Maybe<Scalars["String"]>
  readonly count?: Maybe<Scalars["Int"]>
  readonly name?: Maybe<Scalars["String"]>
  readonly slug?: Maybe<Scalars["String"]>
}

export type CategoryConnection = {
  readonly __typename?: "PostToCategoryConnection"
  readonly nodes?: Maybe<ReadonlyArray<Maybe<Category>>>
}

export type Tag = {
  readonly __typename?: "Tag"
  readonly databaseId?: Maybe<Scalars["Int"]>
  readonly name?: Maybe<Scalars["String"]>
  readonly slug?: Maybe<Scalars["String"]>
}

export type TagConnection = {
  readonly __typename?: "PostToTagConnection"
  readonly nodes?: Maybe<ReadonlyArray<Maybe<Tag>>>
}

export type User = {
  readonly __typename?: "User"
  readonly avatar?: Maybe<{ readonly __typename?: "Avatar"; readonly url?: Maybe<Scalars["String"]> }>
  readonly databaseId?: Maybe<Scalars["Int"]>
  readonly description?: Maybe<Scalars["String"]>
  readonly name?: Maybe<Scalars["String"]>
  readonly slug?: Maybe<Scalars["String"]>
  readonly posts: PostConnection
}

export type UserEdge = {
  readonly __typename?: "NodeWithAuthorToUserConnectionEdge"
  readonly node?: Maybe<User>
}

export type PageInfo = {
  readonly __typename?: "WPPageInfo"
  readonly endCursor?: Maybe<Scalars["String"]>
  readonly hasNextPage: Scalars["Boolean"]
}

export type Post = {
  readonly __typename?: "Post"
  readonly author?: Maybe<UserEdge>
  readonly categories?: Maybe<CategoryConnection>
  readonly content?: Maybe<Scalars["String"]>
  readonly databaseId?: Maybe<Scalars["Int"]>
  readonly date?: Maybe<Scalars["String"]>
  readonly excerpt?: Maybe<Scalars["String"]>
  readonly featuredImage?: Maybe<MediaItemEdge>
  readonly id?: Maybe<Scalars["ID"]>
  readonly slug?: Maybe<Scalars["String"]>
  readonly tags?: Maybe<TagConnection>
  readonly title?: Maybe<Scalars["String"]>
}

export type PostConnection = {
  readonly __typename?:
    | "RootQueryToPostConnection"
    | "CategoryToPostConnection"
    | "UserToPostConnection"
  readonly nodes?: Maybe<ReadonlyArray<Maybe<Post>>>
  readonly pageInfo: PageInfo
}

export type PostEdge = {
  readonly __typename?: "RootQueryToPostConnection"
  readonly nodes?: Maybe<ReadonlyArray<Maybe<Post>>>
  readonly pageInfo: PageInfo
}

export type PostFieldsFragment = {
  readonly __typename?: "Post"
  readonly databaseId?: Maybe<Scalars["Int"]>
  readonly id?: Maybe<Scalars["ID"]>
  readonly slug?: Maybe<Scalars["String"]>
  readonly date?: Maybe<Scalars["String"]>
  readonly modified?: Maybe<Scalars["String"]>
  readonly title?: Maybe<Scalars["String"]>
  readonly excerpt?: Maybe<Scalars["String"]>
  readonly content?: Maybe<Scalars["String"]>
  readonly uri?: Maybe<Scalars["String"]>
  readonly link?: Maybe<Scalars["String"]>
  readonly featuredImage?: Maybe<{
    readonly __typename?: "NodeWithFeaturedImageToMediaItemConnectionEdge"
    readonly node?: Maybe<{
      readonly __typename?: "MediaItem"
      readonly sourceUrl?: Maybe<Scalars["String"]>
      readonly altText?: Maybe<Scalars["String"]>
      readonly caption?: Maybe<Scalars["String"]>
      readonly mediaDetails?: Maybe<{
        readonly __typename?: "MediaDetails"
        readonly width?: Maybe<Scalars["Int"]>
        readonly height?: Maybe<Scalars["Int"]>
      }>
    }>
  }>
  readonly categories?: Maybe<{
    readonly __typename?: "PostToCategoryConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Category"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
    }>>>
  }>
  readonly tags?: Maybe<{
    readonly __typename?: "PostToTagConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Tag"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
    }>>>
  }>
  readonly author?: Maybe<{
    readonly __typename?: "NodeWithAuthorToUserConnectionEdge"
    readonly node?: Maybe<{
      readonly __typename?: "User"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
      readonly avatar?: Maybe<{
        readonly __typename?: "UserAvatar"
        readonly url?: Maybe<Scalars["String"]>
      }>
    }>
  }>
}

export type LatestPostsQuery = {
  readonly __typename?: "RootQuery"
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly pageInfo: PageInfo
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type FpTaggedPostsQuery = {
  readonly __typename?: "RootQuery"
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type PostsByCategoryQuery = {
  readonly __typename?: "RootQuery"
  readonly categories?: Maybe<{
    readonly __typename?: "RootQueryToCategoryConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Category"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
      readonly description?: Maybe<Scalars["String"]>
      readonly count?: Maybe<Scalars["Int"]>
    }>>>
  }>
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly pageInfo: PageInfo
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type CategoryPostsBatchQuery = {
  readonly __typename?: "RootQuery"
  readonly categories?: Maybe<{
    readonly __typename?: "RootQueryToCategoryConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Category"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
      readonly description?: Maybe<Scalars["String"]>
      readonly count?: Maybe<Scalars["Int"]>
      readonly posts?: Maybe<{
        readonly __typename?: "CategoryToPostConnection"
        readonly pageInfo: PageInfo
        readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
      }>
    }>>>
  }>
}

export type CategoriesQuery = {
  readonly __typename?: "RootQuery"
  readonly categories?: Maybe<{
    readonly __typename?: "RootQueryToCategoryConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Category"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
      readonly description?: Maybe<Scalars["String"]>
      readonly count?: Maybe<Scalars["Int"]>
    }>>>
  }>
}

export type PostCategoriesQuery = {
  readonly __typename?: "RootQuery"
  readonly post?: Maybe<{
    readonly __typename?: "Post"
    readonly categories?: Maybe<CategoryConnection>
  }>
}

export type RelatedPostsQuery = {
  readonly __typename?: "RootQuery"
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type FeaturedPostsQuery = {
  readonly __typename?: "RootQuery"
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type AuthorDataQuery = {
  readonly __typename?: "RootQuery"
  readonly user?: Maybe<{
    readonly __typename?: "User"
    readonly id?: Maybe<Scalars["ID"]>
    readonly databaseId?: Maybe<Scalars["Int"]>
    readonly name?: Maybe<Scalars["String"]>
    readonly slug?: Maybe<Scalars["String"]>
    readonly description?: Maybe<Scalars["String"]>
    readonly avatar?: Maybe<{ readonly __typename?: "Avatar"; readonly url?: Maybe<Scalars["String"]> }>
    readonly posts: {
      readonly __typename?: "UserToPostConnection"
      readonly pageInfo: PageInfo
      readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
    }
  }>
}

export type AuthorsQuery = {
  readonly __typename?: "RootQuery"
  readonly users?: Maybe<{
    readonly __typename?: "RootQueryToUserConnection"
    readonly nodes?: Maybe<
      ReadonlyArray<
        Maybe<{
          readonly __typename?: "User"
          readonly id?: Maybe<Scalars["ID"]>
          readonly databaseId?: Maybe<Scalars["Int"]>
          readonly name?: Maybe<Scalars["String"]>
          readonly slug?: Maybe<Scalars["String"]>
          readonly description?: Maybe<Scalars["String"]>
          readonly avatar?: Maybe<{ readonly __typename?: "Avatar"; readonly url?: Maybe<Scalars["String"]> }>
        }>
      >
    >
  }>
}

export type CategoryPostsQuery = {
  readonly __typename?: "RootQuery"
  readonly categories?: Maybe<{
    readonly __typename?: "RootQueryToCategoryConnection"
    readonly nodes?: Maybe<ReadonlyArray<Maybe<{
      readonly __typename?: "Category"
      readonly databaseId?: Maybe<Scalars["Int"]>
      readonly name?: Maybe<Scalars["String"]>
      readonly slug?: Maybe<Scalars["String"]>
      readonly description?: Maybe<Scalars["String"]>
      readonly count?: Maybe<Scalars["Int"]>
    }>>>
  }>
  readonly posts?: Maybe<{
    readonly __typename?: "RootQueryToPostConnection"
    readonly pageInfo: PageInfo
    readonly nodes?: Maybe<ReadonlyArray<Maybe<PostFieldsFragment>>>
  }>
}

export type CategoryPostsQueryVariables = Exact<{
  readonly slug: Scalars["String"]
  readonly after?: InputMaybe<Scalars["String"]>
  readonly first: Scalars["Int"]
}>
