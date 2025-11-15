export type CommentReactionType = "like" | "love" | "laugh" | "sad" | "angry"

export type CommentReaction = {
  type: CommentReactionType
  count: number
  reactedByCurrentUser: boolean
}

export type CommentStatus = "active" | "flagged" | "deleted" | "pending"

export type Comment = {
  id: string
  wp_post_id: string
  edition_code: string
  user_id: string
  body: string
  parent_id: string | null
  created_at: string
  // Moderation fields
  status: CommentStatus
  reported_by?: string
  report_reason?: string
  reviewed_at?: string
  reviewed_by?: string
  // New fields
  is_rich_text: boolean
  reactions_count: number
  replies_count: number
  user_reaction?: CommentReactionType | null
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
  wp_post_id: string
  edition_code: string
  user_id: string
  body: string
  parent_id?: string | null
  status?: CommentStatus
  is_rich_text?: boolean
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
