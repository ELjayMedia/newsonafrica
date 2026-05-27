"use client"

import { useEffect, useRef } from "react"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase/browser-helpers"
import type { Comment } from "@/lib/supabase-schema"

interface UseCommentsRealtimeSyncOptions {
  postId: string
  upsertComment: (comment: Comment) => void
  removeComment: (commentId: string) => void
  onRefreshNeeded?: () => void | Promise<void>
}

const REALTIME_REFRESH_DEBOUNCE_MS = 750

export function useCommentsRealtimeSync({
  postId,
  upsertComment,
  removeComment,
  onRefreshNeeded,
}: UseCommentsRealtimeSyncOptions) {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const scheduleRefresh = () => {
      if (!onRefreshNeeded) return

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }

      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null
        void onRefreshNeeded()
      }, REALTIME_REFRESH_DEBOUNCE_MS)
    }

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
            if (payload.new.status === "active") {
              upsertComment(payload.new)
            } else if (payload.new.id) {
              removeComment(payload.new.id)
            }

            scheduleRefresh()
          }
        },
      )
      .subscribe()

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [postId, removeComment, upsertComment, onRefreshNeeded])
}
