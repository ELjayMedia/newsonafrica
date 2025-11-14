import type { Database } from "@/types/supabase"

export type CommentRow = Database["public"]["Tables"]["comments"]["Row"]

export type CommentListRow = Pick<
  CommentRow,
  | "id"
  | "post_id"
  | "user_id"
  | "content"
  | "parent_id"
  | "country"
  | "status"
  | "created_at"
  | "reported_by"
  | "report_reason"
  | "reviewed_at"
  | "reviewed_by"
>

export type CommentListRecord = CommentListRow & {
  profile?: { username: string | null; avatar_url: string | null } | null
}
