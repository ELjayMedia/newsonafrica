export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  // Moderation fields
  status: "active" | "flagged" | "deleted"
  reported_by?: string
  report_reason?: string
  reviewed_at?: string
  reviewed_by?: string
  // New fields
  is_rich_text: boolean
  reaction_count: number
  // For UI state
  isReplying?: boolean
  isEditing?: boolean
  isOptimistic?: boolean
  // Profile data
  profile?: {
    username: string
    avatar_url: string | null
  }
  // Reactions data
  reactions?: CommentReaction[]
  // Replies
  replies?: Comment[]
}

export type NewComment = {
  post_id: string
  user_id: string
  content: string
  parent_id?: string | null
  status?: "active" | "flagged" | "deleted"
  is_rich_text?: boolean
}

export type CommentReaction = {
  id: string
  comment_id: string
  user_id: string
  reaction_type: "like" | "love" | "laugh" | "sad" | "angry"
  created_at: string
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

// Comment sort options
export type CommentSortOption = "newest" | "oldest" | "popular"
