"use server"

import type { CommentSortOption } from "@/lib/supabase-schema"
import { fetchComments } from "@/lib/comment-service"
import {
  SUPABASE_CONFIGURATION_ERROR_MESSAGE,
  getSupabaseClient,
} from "@/lib/supabase/server-component-client"

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
  const { client: supabase, isFallback, error } = getSupabaseClient()

  if (isFallback) {
    console.error("Comments cannot be loaded because Supabase is not configured.", error)
    throw new Error(SUPABASE_CONFIGURATION_ERROR_MESSAGE)
  }

  return fetchComments(postId, page, pageSize, sortOption, supabase, cursor ?? undefined)
}
