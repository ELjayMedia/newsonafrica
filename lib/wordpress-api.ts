export * from "./wordpress/frontpage"
export * from "./wordpress/categories"
export * from "./wordpress/posts"
export * from "./wordpress/authors"
export * from "./wordpress/comments"

export {
  DEFAULT_COUNTRY,
  FP_TAG_SLUG,
  mapPostsToHomePosts,
  mapWordPressPostToHomePost,
  mapGraphqlNodeToHomePost,
  resolveHomePostId,
} from "./wordpress/shared"

export type {
  AggregatedHomeData,
  CategoryPostsResult,
  FrontPageSlicesResult,
  PaginatedPostsResult,
  WordPressAuthor,
  WordPressCategory,
  WordPressComment,
  WordPressImage,
  WordPressTag,
} from "./wordpress/types"

export { COUNTRIES, executeRestFallback, fetchFromWp, fetchFromWpGraphQL } from "./wordpress/client"
export type { CountryConfig, WordPressPost } from "./wordpress/client"

export async function updateUserProfile() {
  return null
}
