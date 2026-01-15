import "server-only"
import { revalidateTag } from "next/cache"
import { cacheTags } from "@/lib/cache"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type SupabaseServerClient = SupabaseClient<Database>
export type Comment = Database["public"]["Tables"]["comments"]["Row"]

// POSTGREST CONTRACT: comments.listPostComments
export async function listPostComments(
  supabase: SupabaseServerClient,
  postId: string,
  editionCode: string,
  options?: { limit?: number; offset?: number },
): Promise<Comment[]> {
  const requestedLimit = options?.limit ?? 20
  const limit = Math.min(requestedLimit, 100)
  let query = supabase
    .from("comments")
    .select("*")
    .eq("wp_post_id", postId)
    .eq("edition_code", editionCode)
    .is("parent_id", null)
    .order("created_at", { ascending: false })

  query = query.limit(limit)

  if (options?.offset) {
    query = query.range(options.offset, options.offset + limit - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`)
  }

  return (data || []) as Comment[]
}

// POSTGREST CONTRACT: comments.addComment
export async function addComment(supabase: SupabaseServerClient, comment: Comment["Insert"]): Promise<Comment> {
  const { data, error } = await supabase.from("comments").insert(comment).select().single()

  if (error) {
    throw new Error(`Failed to add comment: ${error.message}`)
  }

  revalidateTag(cacheTags.comments(comment.wp_post_id, comment.edition_code))

  return data as Comment
}
