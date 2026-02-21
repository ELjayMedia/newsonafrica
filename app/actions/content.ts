"use server"

import { mapWordPressPostsToPostListItems } from "@/lib/data/post-list"
import { getPostsByCategoryForCountry } from "@/lib/wordpress/service"
import { fetchTaggedPosts } from "@/lib/wordpress/service"
import type { PostListItemData } from "@/lib/data/post-list"
import type { FetchTaggedPostsInput, FetchTaggedPostsResult } from "@/lib/wordpress/service"

export interface FetchCategoryPostsInput {
  countryCode: string
  slug: string
  first?: number
  after?: string | null
}

export interface FetchCategoryPostsResult {
  posts: PostListItemData[]
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
}

export async function fetchCategoryPostsAction({
  countryCode,
  slug,
  first = 10,
  after,
}: FetchCategoryPostsInput): Promise<FetchCategoryPostsResult> {
  const result = await getPostsByCategoryForCountry(countryCode, slug, first, after ?? undefined)

  return {
    posts: mapWordPressPostsToPostListItems(result.posts, countryCode),
    pageInfo: {
      hasNextPage: result.hasNextPage,
      endCursor: result.endCursor ?? null,
    },
  }
}

export type FetchTaggedPostsActionInput = FetchTaggedPostsInput

export async function fetchTaggedPostsAction(
  input: FetchTaggedPostsActionInput,
): Promise<FetchTaggedPostsResult> {
  return fetchTaggedPosts(input)
}
