import { CACHE_DURATIONS } from "@/lib/cache/constants"

export const TAG_PAGE_REVALIDATE = CACHE_DURATIONS.MEDIUM

export { fetchSingleTag, fetchTaggedPosts, fetchAllTags } from "@/lib/wordpress/posts"
export type { FetchTaggedPostsInput, FetchTaggedPostsResult } from "@/lib/wordpress/posts"
