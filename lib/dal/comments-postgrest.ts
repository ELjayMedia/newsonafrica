// POSTGREST CONTRACT SNAPSHOT: comments (Comment Creation with Author Validation)
// ================================================================================
// Endpoint: POST /rest/v1/comments
// Auth: JWT (authenticated users only)
// RLS: created_by = auth.uid() (enforced at DB level)
// Columns: id, wp_post_id, created_by, content, edition, parent_id, created_at

import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface CommentData {
  id: string
  wp_post_id: number
  created_by: string
  content: string
  edition: string
  parent_id: string | null
  created_at: string
}

export async function createComment(
  accessToken: string,
  userId: string,
  comment: { wp_post_id: number; content: string; edition: string; parent_id?: string },
): Promise<CommentData> {
  // Validate content length
  if (!comment.content || comment.content.length < 1 || comment.content.length > 5000) {
    throw new Error("Comment must be between 1 and 5000 characters")
  }

  const url = `${SUPABASE_URL}/rest/v1/comments?select=id,wp_post_id,created_by,content,edition,parent_id,created_at`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      wp_post_id: comment.wp_post_id,
      created_by: userId, // MUST match authenticated user (RLS enforced)
      content: comment.content,
      edition: comment.edition,
      parent_id: comment.parent_id || null,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create comment: ${error}`)
  }

  const data = await response.json()
  revalidateTag(cacheTags.comments(comment.wp_post_id, comment.edition))
  return data[0] as CommentData
}

export async function listPostComments(
  accessToken: string,
  postId: number,
  edition: string,
  options?: { limit?: number },
): Promise<CommentData[]> {
  const requestedLimit = options?.limit ?? 20
  const limit = Math.min(Math.max(requestedLimit, 1), 100)
  const params = new URLSearchParams({
    wp_post_id: `eq.${postId}`,
    edition: `eq.${edition}`,
    select: "id,wp_post_id,created_by,content,edition,parent_id,created_at",
    order: "created_at.desc",
    limit: String(limit),
  })

  const url = `${SUPABASE_URL}/rest/v1/comments?${params.toString()}`

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`)
  }

  return (await response.json()) as CommentData[]
}
