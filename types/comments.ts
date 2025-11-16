import type { Database } from "@/types/supabase"

export type CommentRow = Database["public"]["Tables"]["comments"]["Row"]
export type CommentInsert = Database["public"]["Tables"]["comments"]["Insert"]
export type CommentUpdate = Database["public"]["Tables"]["comments"]["Update"]
export type CommentStatus = Database["public"]["Enums"]["comment_status"]
export type CommentReactionRow = Database["public"]["Tables"]["comment_reactions"]["Row"]
export type CommentReactionType = Database["public"]["Enums"]["comment_reaction_type"]

export type CommentListRow = Pick<
  CommentRow,
  | "id"
  | "wp_post_id"
  | "edition_code"
  | "user_id"
  | "body"
  | "parent_id"
  | "status"
  | "created_at"
  | "reported_by"
  | "report_reason"
  | "reviewed_at"
  | "reviewed_by"
  | "replies_count"
  | "reactions_count"
>

export type CommentListRecord = CommentListRow & {
  profile?: { username: string | null; avatar_url: string | null } | null
}
