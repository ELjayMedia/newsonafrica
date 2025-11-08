"use server"

import type { CommentSortOption } from "@/lib/supabase-schema"
import { fetchComments } from "@/lib/comment-service"
import { createServerComponentSupabaseClient } from "@/lib/supabase/server-component-client"

interface FetchCommentsPageActionInput {
  postId: string
  page?: number
  pageSize?: number
  sortOption?: CommentSortOption
  cursor?: string | null
}

export async function fetchCommentsPageAction({
  postId,
  page = 0,
  pageSize = 10,
  sortOption = "newest",
  cursor = null,
}: FetchCommentsPageActionInput) {
  const supabase = createServerComponentSupabaseClient()
  return fetchComments(postId, page, pageSize, sortOption, supabase, cursor ?? undefined)
}
