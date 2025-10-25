"use server"

import type { CommentSortOption } from "@/lib/supabase-schema"
import { fetchComments } from "@/lib/comment-service"
import { getSupabaseClient } from "@/lib/supabase/server-component-client"

interface FetchCommentsPageActionInput {
  postId: string
  page?: number
  pageSize?: number
  sortOption?: CommentSortOption
}

export async function fetchCommentsPageAction({
  postId,
  page = 0,
  pageSize = 10,
  sortOption = "newest",
}: FetchCommentsPageActionInput) {
  const supabase = getSupabaseClient()

  return fetchComments(postId, page, pageSize, sortOption, supabase)
}
