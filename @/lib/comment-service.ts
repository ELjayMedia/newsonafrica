import { supabase } from "@/lib/supabase"
import type { Comment, NewComment, ReportCommentData } from "@/lib/supabase-schema"
import { v4 as uuidv4 } from "uuid"

// Store recent comment submissions for rate limiting
const recentSubmissions = new Map<string, number>()

// Rate limit configuration
const RATE_LIMIT_SECONDS = 10

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

async function checkStatusColumn(): Promise<boolean> {
  if (hasStatusColumn !== null) return hasStatusColumn

  try {
    // Try to select the status column
    const { data, error } = await supabase.from("comments").select("status").limit(1)

    // If there's no error, the column exists
    hasStatusColumn = !error
    return hasStatusColumn
  } catch (error) {
    console.error("Error checking status column:", error)
    hasStatusColumn = false
    return false
  }
}

// Fetch comments for a specific post with pagination
export async function fetchComments(
  postId: string,
  page = 0,
  pageSize = 10,
): Promise<{ comments: Comment[]; hasMore: boolean; total: number }> {
  try {
    // Check if status column exists
    const hasStatus = await checkStatusColumn()

    // Get total count first
    let countQuery = supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .is("parent_id", null) // Only count root comments for pagination

    // Add status filter only if the column exists
    if (hasStatus) {
      countQuery = countQuery.eq("status", "active")
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error("Error counting comments:", countError)
      throw countError
    }

    // Then fetch paginated comments
    let commentsQuery = supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .is("parent_id", null) // Only fetch root comments for pagination
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

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

    // Fetch all replies for these comments
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

    // Extract all user IDs from comments and replies
    const userIds = [
      ...new Set([...comments.map((comment) => comment.user_id), ...(replies?.map((reply) => reply.user_id) || [])]),
    ]

    // Fetch profiles for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      throw profilesError
    }

    // Create a map of user_id to profile data
    const profileMap = new Map()
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile)
    })

    // Process all comments with profile data
    const processedComments = comments.map((comment) => {
      const profile = profileMap.get(comment.user_id)
      return {
        ...comment,
        // Add status if it doesn't exist
        status: comment.status || "active",
        profile: profile
          ? {
              username: profile.username,
              avatar_url: profile.avatar_url,
            }
          : undefined,
      }
    })

    // Process all replies with profile data
    const processedReplies =
      replies?.map((reply) => {
        const profile = profileMap.get(reply.user_id)
        return {
          ...reply,
          // Add status if it doesn't exist
          status: reply.status || "active",
          profile: profile
            ? {
                username: profile.username,
                avatar_url: profile.avatar_url,
              }
            : undefined,
        }
      }) || []

    // Organize comments into a hierarchical structure
    const organizedComments = organizeComments([...processedComments, ...processedReplies])

    return {
      comments: organizedComments,
      hasMore: (count || 0) > (page + 1) * pageSize,
      total: count || 0,
    }
  } catch (error) {
    console.error("Error in fetchComments:", error)
    throw error
  }
}

// Add a new comment
export async function addComment(comment: NewComment): Promise<Comment> {
  try {
    // Check if status column exists
    const hasStatus = await checkStatusColumn()

    // Only include status if the column exists
    const commentData = hasStatus ? { ...comment, status: "active" } : comment

    // Insert the comment
    const { data: newComment, error } = await supabase.from("comments").insert(commentData).select().single()

    if (error) {
      console.error("Error adding comment:", error)
      throw error
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", comment.user_id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Don't throw here, we can still return the comment without profile data
    }

    // Record this submission for rate limiting
    recordSubmission(comment.user_id)

    // Return the comment with profile data
    return {
      ...newComment,
      // Add status if it doesn't exist
      status: newComment.status || "active",
      profile: profile
        ? {
            username: profile.username,
            avatar_url: profile.avatar_url,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error in addComment:", error)
    throw error
  }
}

// Update an existing comment
export async function updateComment(id: string, content: string): Promise<Comment> {
  try {
    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from("comments")
      .update({ content })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating comment:", error)
      throw error
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", updatedComment.user_id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      // Don't throw here, we can still return the comment without profile data
    }

    // Return the updated comment with profile data
    return {
      ...updatedComment,
      // Add status if it doesn't exist
      status: updatedComment.status || "active",
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
  // Check if status column exists
  const hasStatus = await checkStatusColumn()

  if (hasStatus) {
    // Soft delete
    const { error } = await supabase.from("comments").update({ status: "deleted" }).eq("id", id)

    if (error) {
      console.error("Error soft deleting comment:", error)
      throw error
    }
  } else {
    // Hard delete
    const { error } = await supabase.from("comments").delete().eq("id", id)

    if (error) {
      console.error("Error hard deleting comment:", error)
      throw error
    }
  }
}

// Report a comment
export async function reportComment(data: ReportCommentData): Promise<void> {
  // Check if status column exists
  const hasStatus = await checkStatusColumn()

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
    isOptimistic: true, // Flag to identify optimistic comments
    profile: {
      username,
      avatar_url: avatarUrl || null,
    },
    replies: [],
  }
}
