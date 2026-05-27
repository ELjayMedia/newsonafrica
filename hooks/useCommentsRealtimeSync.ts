"use client"

import { useEffect } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase/browser-helpers"
import type { Comment } from "@/lib/supabase-schema"
import type { CommentStatus } from "@/types/comments"

interface UseCommentsRealtimeSyncOptions {
  postId: string
  upsertComment: (comment: Comment) => void
  removeComment: (commentId: string) => void
  onStatusChange?: () => void | Promise<void>
}

const getCommentStatus = (value: Partial<Comment> | null | undefined): CommentStatus | undefined => value?.status

export function useCommentsRealtimeSync({
  postId,
  upsertComment,
  removeComment,
  onStatusChange,
}: UseCommentsRealtimeSyncOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `wp_post_id=eq.${postId}` },
        (payload: RealtimePostgresChangesPayload<Comment>) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            removeComment(payload.old.id)
            void onStatusChange?.()
            return
          }

          if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && payload.new) {
            if (payload.new.status === "active") {
              upsertComment(payload.new)
            } else if (payload.new.id) {
              removeComment(payload.new.id)
            }

            void onStatusChange?.()
          }

          if (payload.eventType === "UPDATE" && onStatusChange) {
            const previousStatus = getCommentStatus(payload.old)
            const nextStatus = getCommentStatus(payload.new)

            if (previousStatus && nextStatus && previousStatus !== nextStatus) {
              void onStatusChange()
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [postId, removeComment, onStatusChange, upsertComment])
}
