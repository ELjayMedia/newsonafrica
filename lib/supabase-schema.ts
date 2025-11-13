export type CommentReaction = {
  type: string
  count: number
  reactedByCurrentUser: boolean
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  // Moderation fields
  status: "active" | "flagged" | "deleted"
  reviewed_at?: string
  reviewed_by?: string
  // New fields
  is_rich_text: boolean
  reaction_count: number
  user_reaction?: string | null
  report_summary?: CommentReportSummary
  reports?: CommentReport[]
  // For UI state
  isReplying?: boolean
  isEditing?: boolean
  isOptimistic?: boolean
  // Profile data
  profile?: {
    username: string | null
    avatar_url: string | null
  } | null
  // Replies
  replies?: Comment[]
  reactions: CommentReaction[]
}

export type NewComment = {
  post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  status?: "active" | "flagged" | "deleted"
  is_rich_text?: boolean
}

export type ReportCommentData = {
  commentId: string
  reason: string
}

export type CommentReport = {
  id: string
  comment_id: string
  reported_by: string
  reason: string | null
  created_at: string
}

export type CommentReportSummary = {
  total: number
  reasons: Array<{
    reason: string | null
    count: number
  }>
}

// For rate limiting
export interface CommentSubmission {
  userId: string
  timestamp: number
}

// Comment sort options
export type CommentSortOption = "newest" | "oldest" | "popular"
