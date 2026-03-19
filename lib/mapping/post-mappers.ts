import type { WordPressPost } from "@/types/wp"
import {
  mapWordPressPostToPostListItem,
  mapWordPressPostsToPostListItems,
  type PostListItemData,
  type PostListAuthor,
  type PostListCategory,
} from "@/lib/data/post-list"
import { mapGraphqlPostToWordPressPost } from "@/lib/mapping/post-mappers.shared"

export { mapGraphqlPostToWordPressPost }
export type { GraphqlPostNode } from "@/lib/mapping/post-mappers.shared"

export type { PostListItemData, PostListAuthor, PostListCategory }

export function mapWpPostToPostListItem(post: WordPressPost, countryCode: string): PostListItemData {
  return mapWordPressPostToPostListItem(post, countryCode)
}

export function mapWpPostsToPostListItems(
  posts: WordPressPost[] | null | undefined,
  countryCode: string,
): PostListItemData[] {
  return mapWordPressPostsToPostListItems(posts, countryCode)
}
