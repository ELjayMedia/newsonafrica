import { supabase } from "@/lib/supabase"
import type { Comment, NewComment, ReportCommentData, CommentSortOption } from "@/lib/supabase-schema"
import { v4 as uuidv4 } from "uuid"
import { fetchById, insertRecords, updateRecord, deleteRecord, clearQueryCache } from "@/utils/supabase-query-utils"

// Store recent comment submissions for rate limiting
const recentSubmissions = new Map<string, number>()

// Rate limit configuration
const RATE_LIMIT_SECONDS = 10

// Cache TTLs
const COMMENTS_CACHE_TTL = 2 * 60 * 1000 // 2 minutes
const SCHEMA_CHECK_CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// Check if a user is rate limited
export function isRateLimited(userId: string): boolean {
  const lastSubmission = recentSubmissions.get(userId)
  if (!lastSubmission) return false

  const now = Date.now()
  const timeSinceLastSubmission = now - lastSubmission
  return timeSinceLastSubmission < RATE_LIMIT_SECONDS * 1000
}

// Record a submission for rate limiting
export function recordSubmission(userId: string): void {
  recentSubmissions.set(userId, Date.now())

  // Clean up old entries every 5 minutes
  setTimeout(
    () => {
      const now = Date.now()
      recentSubmissions.forEach((timestamp, id) => {
        if (now - timestamp > 5 * 60 * 1000) {
          recentSubmissions.delete(id)
        }
      })
    },
    5 * 60 * 1000,
  )
}

// Check if the status column exists in the comments table
let hasStatusColumn: boolean | null = null
let hasRichTextColumn: boolean | null = null

async function checkColumns(): Promise<{ hasStatus: boolean; hasRichText: boolean }> {
  if (hasStatusColumn !== null && hasRichTextColumn !== null) {
    return { hasStatus: hasStatusColumn, hasRichText: hasRichTextColumn }
  }

  try {
    // Check for status column
    try {
      const { data: statusData, error: statusError } = await supabase
        .from("comments")
        .select("id") // Select a column we know exists
        .limit(1)

      // Try to access the status column to see if it exists
      try {
        const { data: statusCheckData, error: statusCheckError } = await supabase
          .rpc("column_exists", { table_name: "comments", column_name: "status" })
          .single()

        hasStatusColumn = statusCheckData?.exists || false

        if (statusCheckError) {
          // Fallback method if RPC is not available
          try {
            await supabase.from("comments").select("status").limit(1)
            hasStatusColumn = true
          } catch (e) {
            hasStatusColumn = false
          }
        }
      } catch (e) {
        // If RPC fails, try direct query
        try {
          await supabase.from("comments").select("status").limit(1)
          hasStatusColumn = true
        } catch (e) {
          hasStatusColumn = false
        }
      }
    } catch (error) {
      console.error("Error checking status column:", error)
      hasStatusColumn = false
    }

    // Check for rich_text column
    try {
      try {
        const { data: richTextCheckData, error: richTextCheckError } = await supabase
          .rpc("column_exists", { table_name: "comments", column_name: "is_rich_text" })
          .single()

        hasRichTextColumn = richTextCheckData?.exists || false

        if (richTextCheckError) {
          // Fallback method if RPC is not available
          try {
            await supabase.from("comments").select("is_rich_text").limit(1)
            hasRichTextColumn = true
          } catch (e) {
            hasRichTextColumn = false
          }
        }
      } catch (e) {
        // If RPC fails, try direct query
        try {
          await supabase.from("comments").select("is_rich_text").limit(1)
          hasRichTextColumn = true
        } catch (e) {
          hasRichTextColumn = false
        }
      }
    } catch (error) {
      console.error("Error checking is_rich_text column:", error)
      hasRichTextColumn = false
    }

    return {
      hasStatus: hasStatusColumn,
      hasRichText: hasRichTextColumn,
    }
  } catch (error) {
    console.error("Error checking columns:", error)
    hasStatusColumn = false
    hasRichTextColumn = false
    return { hasStatus: false, hasRichText: false }
  }
}

// Fetch comments for a specific post with pagination
export async function fetchComments(
  postId: string,
  page = 0,
  pageSize = 10,
  sortOption: CommentSortOption = "newest",
): Promise<{ comments: Comment[]; hasMore: boolean; total: number }> {
  try {
    // Check if columns exist
    const { hasStatus, hasRichText } = await checkColumns()

    // Get total count first - using a more robust approach
    let count = 0
    try {
      // Build the count query
      let countQuery = supabase
        .from("comments")
        .select("id", { count: "exact" }) // Only select ID for counting
        .eq("post_id", postId)
        .is("parent_id", null) // Only count root comments for pagination

      // Add status filter only if the column exists
      if (hasStatus) {
        countQuery = countQuery.eq("status", "active")
      }

      // Execute the count query
      const { count: commentCount, error: countError } = await countQuery

      if (countError) {
        console.error("Error in count query:", countError)
        // Continue with count = 0 instead of throwing
      } else {
        count = commentCount || 0
      }
    } catch (countErr) {
      console.error("Error counting comments:", countErr)
      // Continue with count = 0 instead of throwing
    }

    // Then fetch paginated comments
    let commentsQuery = supabase.from("comments").select("*").eq("post_id", postId).is("parent_id", null) // Only fetch root comments for pagination

    // Add sort order based on option
    switch (sortOption) {
      case "newest":
        commentsQuery = commentsQuery.order("created_at", { ascending: false })
        break
      case "oldest":
        commentsQuery = commentsQuery.order("created_at", { ascending: true })
        break
      case "popular":
        // If we have a reaction_count column, use it
        commentsQuery = commentsQuery
          .order("reaction_count", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
        break
      default:
        commentsQuery = commentsQuery.order("created_at", { ascending: false })
    }

    // Add pagination
    commentsQuery = commentsQuery.range(page * pageSize, (page + 1) * pageSize - 1)

    // Add status filter only if the column exists
    if (hasStatus) {
      commentsQuery = commentsQuery.eq("status", "active")
    }

    const { data: comments, error } = await commentsQuery

    if (error) {
      console.error("Error fetching comments:", error)
      throw error
    }

    if (!comments || comments.length === 0) {
      return { comments: [], hasMore: false, total: 0 }
    }

    // Fetch all replies for these comments in a single query
    const rootCommentIds = comments.map((comment) => comment.id)

    let repliesQuery = supabase.from("comments").select("*").eq("post_id", postId).in("parent_id", rootCommentIds)

    // Add status filter only if the column exists
    if (hasStatus) {
      repliesQuery = repliesQuery.eq("status", "active")
    }

    const { data: replies, error: repliesError } = await repliesQuery

    if (repliesError) {
      console.error("Error fetching replies:", repliesError)
      throw repliesError
    }

    // Combine all comment IDs (root comments and replies)
    const allCommentIds = [...comments.map((c) => c.id), ...(replies?.map((r) => r.id) || [])]

    // Fetch reactions for all comments in a single query
    const reactions = []

    // Extract all user IDs from comments and replies
    const userIds = [
      ...new Set([...comments.map((comment) => comment.user_id), ...(replies?.map((reply) => reply.user_id) || [])]),
    ]

    // Fetch profiles for these users in a single query
    let profiles = []
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)

      if (!profileError && profileData) {
        profiles = profileData
      }
    } catch (error) {
      console.error("Error fetching profiles:", error)
      // Continue without profiles if there's an error
    }

    // Create a map of user_id to profile data
    const profileMap = new Map()
    profiles.forEach((profile) => {
      profileMap.set(profile.id, profile)
    })

    // Create a map of comment_id to reactions
    const reactionMap = new Map()

    // Process all comments with profile data and reactions
    const processedComments = comments.map((comment) => {
      const profile = profileMap.get(comment.user_id)
      return {
        ...comment,
        // Add status if it doesn't exist
        status: comment.status || "active",
        // Add is_rich_text if it doesn't exist
        is_rich_text: hasRichText ? comment.is_rich_text : false,
        profile: profile
          ? {
              username: profile.username,
              avatar_url: profile.avatar_url,
            }
          : undefined,
        reactions: [],
      }
    })

    // Process all replies with profile data and reactions
    const processedReplies =
      replies?.map((reply) => {
        const profile = profileMap.get(reply.user_id)
        return {
          ...reply,
          // Add status if it doesn't exist
          status: reply.status || "active",
          // Add is_rich_text if it doesn't exist
          is_rich_text: hasRichText ? reply.is_rich_text : false,
          profile: profile
            ? {
                username: profile.username,
                avatar_url: profile.avatar_url,
              }
            : undefined,
          reactions: [],
        }
      }) || []

    // Organize comments into a hierarchical structure
    const organizedComments = organizeComments([...processedComments, ...processedReplies])

    // Calculate if there are more comments based on the count and current page
    const hasMore = count > (page + 1) * pageSize

    return {
      comments: organizedComments,
      hasMore,
      total: count,
    }
  } catch (error) {
    console.error("Error in fetchComments:", error)
    throw error
  }
}

// Add a new comment
export async function addComment(comment: NewComment): Promise<Comment> {
  try {
    // Check if columns exist
    const { hasStatus, hasRichText } = await checkColumns()

    // Build comment data based on available columns
    const commentData: any = {
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      parent_id: comment.parent_id || null,
    }

    // Add status if the column exists
    if (hasStatus) {
      commentData.status = "active"
    }

    // Add is_rich_text if the column exists
    if (hasRichText && comment.is_rich_text !== undefined) {
      commentData.is_rich_text = comment.is_rich_text
    }

    // Insert the comment using our optimized function
    const [newComment] = await insertRecords("comments", commentData, {
      clearCache: new RegExp(`^comments:.*${comment.post_id}`),
    })

    if (!newComment) {
      throw new Error("Failed to create comment")
    }

    // Fetch the profile for this user
    const profile = await fetchById("profiles", comment.user_id, {
      columns: "username, avatar_url",
    })

    // Record this submission for rate limiting
    recordSubmission(comment.user_id)

    // Return the comment with profile data
    return {
      ...newComment,
      // Add status if it doesn't exist
      status: newComment.status || "active",
      // Add is_rich_text if it doesn't exist
      is_rich_text: hasRichText ? newComment.is_rich_text : false,
      profile: profile
        ? {
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        : undefined,
      reactions: [],
    }
  } catch (error) {
    console.error("Error in addComment:", error)
    throw error
  }
}

// Update an existing comment
export async function updateComment(id: string, content: string, isRichText?: boolean): Promise<Comment> {
  try {
    // Check if columns exist
    const { hasRichText } = await checkColumns()

    // Build update data
    const updateData: any = { content }

    // Add is_rich_text if the column exists and value is provided
    if (hasRichText && isRichText !== undefined) {
      updateData.is_rich_text = isRichText
    }

    // Get the comment first to get its post_id for cache invalidation
    const existingComment = await fetchById("comments", id)
    if (!existingComment) {
      throw new Error("Comment not found")
    }

    // Update the comment using our optimized function
    const updatedComment = await updateRecord("comments", id, updateData, {
      clearCache: new RegExp(`^comments:.*${existingComment.post_id}`),
    })

    if (!updatedComment) {
      throw new Error("Failed to update comment")
    }

    // Fetch the profile for this user
    const profile = await fetchById("profiles", updatedComment.user_id, {
      columns: "username, avatar_url",
    })

    // Return the updated comment with profile data
    return {
      ...updatedComment,
      profile: profile
        ? {
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error in updateComment:", error)
    throw error
  }
}

// Delete a comment (soft delete by updating status if the column exists, otherwise hard delete)
export async function deleteComment(id: string): Promise<void> {
  try {
    // Check if status column exists
    const { hasStatus } = await checkColumns()

    // Get the comment first to get its post_id for cache invalidation
    const comment = await fetchById("comments", id)
    if (!comment) {
      throw new Error("Comment not found")
    }

    if (hasStatus) {
      // Soft delete
      await updateRecord(
        "comments",
        id,
        { status: "deleted" },
        {
          clearCache: new RegExp(`^comments:.*${comment.post_id}`),
        },
      )
    } else {
      // Hard delete
      await deleteRecord("comments", id, {
        clearCache: new RegExp(`^comments:.*${comment.post_id}`),
      })
    }
  } catch (error) {
    console.error("Error in deleteComment:", error)
    throw error
  }
}

// Report a comment
export async function reportComment(data: ReportCommentData): Promise<void> {
  // Check if status column exists
  const { hasStatus } = await checkColumns()

  if (!hasStatus) {
    throw new Error("Comment reporting requires database migration. Please run the migration script first.")
  }

  const { commentId, reportedBy, reason } = data

  const { error } = await supabase
    .from("comments")
    .update({
      status: "flagged",
      reported_by: reportedBy,
      report_reason: reason,
    })
    .eq("id", commentId)

  if (error) {
    console.error("Error reporting comment:", error)
    throw error
  }
}

// Organize comments into a hierarchical structure with replies
export function organizeComments(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>()
  const rootComments: Comment[] = []

  // First pass: create a map of all comments
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Second pass: organize into parent-child relationships
  comments.forEach((comment) => {
    const processedComment = commentMap.get(comment.id)!

    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      // This is a reply, add it to its parent's replies
      const parent = commentMap.get(comment.parent_id)!
      parent.replies!.push(processedComment)
    } else if (!comment.parent_id) {
      // This is a root comment
      rootComments.push(processedComment)
    }
  })

  return rootComments
}

// Create an optimistic comment (for UI purposes before server response)
export function createOptimisticComment(comment: NewComment, username: string, avatarUrl?: string | null): Comment {
  return {
    id: `optimistic-${uuidv4()}`, // Temporary ID
    post_id: comment.post_id,
    user_id: comment.user_id,
    content: comment.content,
    parent_id: comment.parent_id || null,
    created_at: new Date().toISOString(),
    status: "active",
    is_rich_text: comment.is_rich_text || false,
    reaction_count: 0,
    isOptimistic: true, // Flag to identify optimistic comments
    profile: {
      username,
      avatar_url: avatarUrl || null,
    },
    reactions: [],
    replies: [],
  }
}

// Clear comment cache for a specific post
export function clearCommentCache(postId?: string): void {
  if (postId) {
    clearQueryCache(undefined, new RegExp(`^comments:.*${postId}`))
  } else {
    clearQueryCache(undefined, /^comments:/)
  }
}
