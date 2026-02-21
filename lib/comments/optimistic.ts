import { v4 as uuidv4 } from "uuid"

import type { Comment, NewComment } from "@/lib/supabase-schema"

export function createOptimisticComment(comment: NewComment, username: string, avatarUrl?: string | null): Comment {
  return {
    id: `optimistic-${uuidv4()}`,
    wp_post_id: comment.wp_post_id,
    edition_code: comment.edition_code,
    user_id: comment.user_id,
    body: comment.body,
    parent_id: comment.parent_id || null,
    created_at: new Date().toISOString(),
    status: "active",
    is_rich_text: comment.is_rich_text || false,
    reactions_count: 0,
    replies_count: 0,
    isOptimistic: true,
    profile: { username, avatar_url: avatarUrl || null },
    reactions: [],
    user_reaction: null,
    replies: [],
  }
}
