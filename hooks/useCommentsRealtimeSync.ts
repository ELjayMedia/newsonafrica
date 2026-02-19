"use client"

import { useEffect } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase/browser-helpers"
import type { Comment } from "@/lib/supabase-schema"

interface UseCommentsRealtimeSyncOptions {
  postId: string
  upsertComment: (comment: Comment) => void
  removeComment: (commentId: string) => void
}

export function useCommentsRealtimeSync({ postId, upsertComment, removeComment }: UseCommentsRealtimeSyncOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `wp_post_id=eq.${postId}` },
        (payload: RealtimePostgresChangesPayload<Comment>) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            removeComment(payload.old.id)
            return
          }

          if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && payload.new) {
            upsertComment(payload.new)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, removeComment, upsertComment])
}
