export * from "./wordpress/frontpage"
export * from "./wp-server/categories"
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

export { fetchWordPressGraphQL } from "./wordpress/client"
export { COUNTRIES } from "./wordpress/countries"
export type { CountryConfig } from "./wordpress/countries"
export type { WordPressPost } from "@/types/wp"

export async function updateUserProfile() {
  return null
}
