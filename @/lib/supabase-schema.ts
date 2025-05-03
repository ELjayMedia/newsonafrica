export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  // New moderation fields
  status: "active" | "flagged" | "deleted"
  reported_by?: string
  report_reason?: string
  reviewed_at?: string
  reviewed_by?: string
  // For UI state
  isReplying?: boolean
  isEditing?: boolean
  isOptimistic?: boolean // Flag for optimistic UI
  // Profile data
  profile?: {
    username: string
    avatar_url: string | null
  }
  // Replies
  replies?: Comment[]
}

export type NewComment = {
  post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  status?: "active" | "flagged" | "deleted"
}

export type ReportCommentData = {
  commentId: string
  reportedBy: string
  reason: string
}

// For rate limiting
export interface CommentSubmission {
  userId: string
  timestamp: number
}
