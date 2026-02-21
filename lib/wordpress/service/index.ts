export * from "./posts"
export * from "./categories"
export * from "./tags"
export * from "./authors"
export * from "./frontpage"

export { COUNTRIES } from "@/lib/wordpress/countries"
export type { CountryConfig } from "@/lib/wordpress/countries"

export {
  DEFAULT_COUNTRY,
  FP_TAG_SLUG,
  mapGraphqlNodeToHomePost,
  mapPostsToHomePosts,
  mapWordPressPostToHomePost,
  resolveHomePostId,
} from "@/lib/wordpress/shared"

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
} from "@/lib/wordpress/types"

export type { HomePost } from "@/types/home"
export type { WordPressPost } from "@/types/wp"
