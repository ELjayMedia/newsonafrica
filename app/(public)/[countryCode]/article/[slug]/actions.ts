"use server"

import type { CommentSortOption } from "@/lib/supabase-schema"
import { listCommentsService } from "@/lib/comments/service"
import { createServerComponentSupabaseClient } from "@/lib/supabase/server-component-client"

interface FetchCommentsPageActionInput {
  postId: string
  editionCode: string
  page?: number
  pageSize?: number
  sortOption?: CommentSortOption
  cursor?: string | null
}

export async function fetchCommentsPageAction({
  postId,
  editionCode,
  page = 0,
  pageSize = 10,
  sortOption = "newest",
  cursor = null,
}: FetchCommentsPageActionInput) {
  void sortOption

  const supabase = createServerComponentSupabaseClient()
  if (!supabase) {
    return { comments: [], hasMore: false, nextCursor: null, total: 0 }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const result = await listCommentsService(supabase, {
    wpPostId: postId,
    editionCode,
    page,
    limit: pageSize,
    parentId: null,
    status: "active",
    cursor: cursor ?? undefined,
    session,
  })

  return {
    comments: result.comments,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
    total: result.totalCount,
  }
}
