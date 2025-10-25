"use server"

import { fetchTaggedPosts } from "@/lib/wp-server/tags"

interface FetchTaggedPostsPageActionInput {
  slug: string
  after?: string | null
  first?: number
  countryCode?: string
}

export async function fetchTaggedPostsPageAction({
  slug,
  after = null,
  first = 10,
  countryCode,
}: FetchTaggedPostsPageActionInput) {
  return fetchTaggedPosts({ slug, after, first, countryCode })
}
