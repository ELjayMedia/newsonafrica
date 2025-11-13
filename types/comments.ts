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
  | "reviewed_at"
  | "reviewed_by"
>

export type CommentReportRow = Database["public"]["Tables"]["comment_reports"]["Row"]

export type CommentListRecord = CommentListRow & {
  profile?: { username: string | null; avatar_url: string | null } | null
  reports?: CommentReportRow[] | null
}
