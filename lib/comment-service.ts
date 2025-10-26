import type { SupabaseClient } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase"
import type { Comment, NewComment, ReportCommentData, CommentSortOption, CommentReaction } from "@/lib/supabase-schema"
import type { Database } from "@/types/supabase"
import { v4 as uuidv4 } from "uuid"
import { clearQueryCache } from "@/utils/supabase-query-utils"
import { toast } from "@/hooks/use-toast"

// Store recent comment submissions for rate limiting
const recentSubmissions = new Map<string, number>()

// Rate limit configuration
const RATE_LIMIT_SECONDS = 10

// Cache TTLs
const COMMENT_SYNC_QUEUE = "comments-write-queue"

type ApiResult<T> = {
  success?: boolean
  data?: T
  error?: string
  meta?: Record<string, any>
}

const isOfflineError = (error: unknown) => {
  if (typeof navigator === "undefined") return false
  if (!navigator.onLine) return true
  if (error instanceof TypeError && error.message?.includes("Failed to fetch")) {
    return true
  }
  return false
}

const readJson = async <T = any>(response: Response): Promise<T | null> => {
  try {
    const text = await response.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

let commentSyncListenerRegistered = false

const registerCommentSyncListener = () => {
  if (commentSyncListenerRegistered) return
  if (typeof window === "undefined") return
  if (!("serviceWorker" in navigator)) return

  const handleMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; queue?: string; error?: string } | null
    if (!data || typeof data !== "object") return
    if (data.queue !== COMMENT_SYNC_QUEUE) return

    switch (data.type) {
      case "BACKGROUND_SYNC_ENQUEUE":
        toast({
          title: "Comment queued",
          description: "We'll post your comment once you're back online.",
        })
        break
      case "BACKGROUND_SYNC_QUEUE_REPLAYED":
        toast({
          title: "Comments synced",
          description: "Your offline comments have been posted.",
        })
        break
      case "BACKGROUND_SYNC_QUEUE_ERROR":
        toast({
          title: "Comment sync failed",
          description: data.error || "We couldn't sync your pending comments.",
          variant: "destructive",
        })
        break
      default:
        break
    }
  }

  navigator.serviceWorker.addEventListener("message", handleMessage)
  commentSyncListenerRegistered = true
}

if (typeof window !== "undefined") {
  registerCommentSyncListener()
}

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

async function checkColumns(
  client: SupabaseClient<Database> = supabase,
): Promise<{ hasStatus: boolean; hasRichText: boolean }> {
  if (hasStatusColumn !== null && hasRichTextColumn !== null) {
    return { hasStatus: hasStatusColumn, hasRichText: hasRichTextColumn }
  }

  try {
    // Check for status column
    try {
      await client.from("comments").select("id").limit(1)

      // Try to access the status column to see if it exists
      try {
        const { data: statusCheckData, error: statusCheckError } = await client
          .rpc("column_exists", { table_name: "comments", column_name: "status" })
          .single()

        hasStatusColumn = Boolean(statusCheckData?.exists)

        if (statusCheckError) {
          // Fallback method if RPC is not available
          try {
            await client.from("comments").select("status").limit(1)
            hasStatusColumn = true
          } catch {
            hasStatusColumn = false
          }
        }
      } catch {
        // If RPC fails, try direct query
        try {
          await client.from("comments").select("status").limit(1)
          hasStatusColumn = true
        } catch {
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
        const { data: richTextCheckData, error: richTextCheckError } = await client
          .rpc("column_exists", { table_name: "comments", column_name: "is_rich_text" })
          .single()

        hasRichTextColumn = Boolean(richTextCheckData?.exists)

        if (richTextCheckError) {
          // Fallback method if RPC is not available
          try {
            await client.from("comments").select("is_rich_text").limit(1)
            hasRichTextColumn = true
          } catch {
            hasRichTextColumn = false
          }
        }
      } catch {
        // If RPC fails, try direct query
        try {
          await client.from("comments").select("is_rich_text").limit(1)
          hasRichTextColumn = true
        } catch {
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
  client: SupabaseClient<Database> = supabase,
): Promise<{ comments: Comment[]; hasMore: boolean; total: number }> {
  try {
    // Check if columns exist
    const { hasStatus, hasRichText } = await checkColumns(client)

    // Get total count first - using a more robust approach
    let count = 0
    try {
      // Build the count query
      let countQuery = client
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
    let commentsQuery = client
      .from("comments")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("post_id", postId)
      .is("parent_id", null) // Only fetch root comments for pagination

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

    const { data: commentsData, error } = await commentsQuery

    if (error) {
      console.error("Error fetching comments:", error)
      throw error
    }

    const comments = (commentsData ?? []) as Comment[]

    if (comments.length === 0) {
      return { comments: [], hasMore: false, total: 0 }
    }

    // Fetch all replies for these comments in a single query
    const rootCommentIds = comments.map((comment) => comment.id)

    let repliesQuery = client
      .from("comments")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("post_id", postId)
      .in("parent_id", rootCommentIds)

    // Add status filter only if the column exists
    if (hasStatus) {
      repliesQuery = repliesQuery.eq("status", "active")
    }

    const { data: repliesData, error: repliesError } = await repliesQuery

    if (repliesError) {
      console.error("Error fetching replies:", repliesError)
      throw repliesError
    }

    const replies = (repliesData ?? []) as Comment[]

    // Combine all comment IDs (root comments and replies)
    const allCommentIds = [...comments.map((c) => c.id), ...replies.map((r) => r.id)]

    // Determine the current authenticated user (if any) for reaction metadata
    let currentUserId: string | null = null
    try {
      const {
        data: { user },
        error: authError,
      } = await client.auth.getUser()

      if (!authError && user) {
        currentUserId = user.id
      }
    } catch (authError) {
      console.error("Error fetching authenticated user for reactions:", authError)
    }

    // Fetch reactions for all comments in a single query
    const reactionsByComment = new Map<string, Map<string, CommentReaction>>()

    if (allCommentIds.length > 0) {
      try {
        const { data: reactionRows, error: reactionsError } = await client
          .from("comment_reactions")
          .select("comment_id, reaction_type, user_id")
          .in("comment_id", allCommentIds)

        if (reactionsError) {
          console.error("Error fetching comment reactions:", reactionsError)
        } else if (reactionRows) {
          const normalizedReactions = reactionRows as Array<{
            comment_id: string
            reaction_type: string
            user_id: string
          }>

          normalizedReactions.forEach((reaction) => {
            const commentMap = reactionsByComment.get(reaction.comment_id) || new Map<string, CommentReaction>()
            const existingReaction = commentMap.get(reaction.reaction_type) || {
              type: reaction.reaction_type,
              count: 0,
              reactedByCurrentUser: false,
            }

            existingReaction.count += 1

            if (currentUserId && reaction.user_id === currentUserId) {
              existingReaction.reactedByCurrentUser = true
            }

            commentMap.set(reaction.reaction_type, existingReaction)
            reactionsByComment.set(reaction.comment_id, commentMap)
          })
        }
      } catch (reactionsError) {
        console.error("Error loading comment reactions:", reactionsError)
      }
    }

    // Create a map of comment_id to reactions
    // Process all comments with profile data and reactions
    const processedComments: Comment[] = comments.map((comment) => {
      const reactionsForComment = reactionsByComment.get(comment.id)
      const reactionList = reactionsForComment
        ? Array.from(reactionsForComment.values())
        : comment.reactions ?? []
      const reactionCount = reactionList.reduce((total, reaction) => total + reaction.count, 0)
      const userReaction = reactionList.find((reaction) => reaction.reactedByCurrentUser)?.type ?? null

      return {
        ...comment,
        status: comment.status ?? "active",
        is_rich_text: hasRichText ? comment.is_rich_text ?? false : false,
        profile: comment.profile ?? undefined,
        reactions: reactionList,
        reaction_count: reactionCount,
        user_reaction: userReaction,
      }
    })

    // Process all replies with profile data and reactions
    const processedReplies: Comment[] = replies.map((reply) => {
      const reactionsForReply = reactionsByComment.get(reply.id)
      const reactionList = reactionsForReply
        ? Array.from(reactionsForReply.values())
        : reply.reactions ?? []
      const reactionCount = reactionList.reduce((total, reaction) => total + reaction.count, 0)
      const userReaction = reactionList.find((reaction) => reaction.reactedByCurrentUser)?.type ?? null

      return {
        ...reply,
        status: reply.status ?? "active",
        is_rich_text: hasRichText ? reply.is_rich_text ?? false : false,
        profile: reply.profile ?? undefined,
        reactions: reactionList,
        reaction_count: reactionCount,
        user_reaction: userReaction,
      }
    })

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
export async function addComment(comment: NewComment): Promise<Comment | undefined> {
  const { hasRichText } = await checkColumns()

  try {
    const payload: Record<string, any> = {
      postId: comment.post_id,
      content: comment.content,
      parentId: comment.parent_id ?? null,
    }

    if (hasRichText && comment.is_rich_text !== undefined) {
      payload.isRichText = comment.is_rich_text
    }

    let response: Response
    try {
      response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn("Comment creation queued for background sync", error)
        return undefined
      }
      throw error
    }

    const result = await readJson<ApiResult<Comment>>(response)

    if (!response.ok || !result?.success || !result.data) {
      const message = result?.error || `Failed to create comment (HTTP ${response.status})`
      throw new Error(message)
    }

    const createdComment = result.data

    recordSubmission(comment.user_id)
    clearCommentCache(comment.post_id)

    return {
      ...createdComment,
      status: createdComment.status || "active",
      is_rich_text: hasRichText ? createdComment.is_rich_text ?? Boolean(comment.is_rich_text) : false,
      reaction_count: createdComment.reaction_count ?? 0,
      reactions: createdComment.reactions ?? [],
      user_reaction: createdComment.user_reaction ?? null,
    }
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn("Comment creation will retry when back online", error)
      return undefined
    }
    console.error("Error in addComment:", error)
    throw error
  }
}

// Update an existing comment
export async function updateComment(
  id: string,
  content: string,
  isRichText?: boolean,
): Promise<Comment | undefined> {
  const { hasRichText } = await checkColumns()

  const payload: Record<string, any> = { content }
  if (hasRichText && isRichText !== undefined) {
    payload.isRichText = isRichText
  }

  try {
    let response: Response
    try {
      response = await fetch(`/api/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn("Comment update queued for background sync", error)
        return undefined
      }
      throw error
    }

    const result = await readJson<Comment | { error?: string }>(response)

    if (!response.ok || !result) {
      const message =
        result && typeof result === "object" && "error" in result && result.error
          ? result.error
          : `Failed to update comment (HTTP ${response.status})`
      throw new Error(message)
    }

    const updatedComment = result as Comment
    clearCommentCache(updatedComment.post_id)

    return {
      ...updatedComment,
      status: updatedComment.status || "active",
      is_rich_text: hasRichText ? updatedComment.is_rich_text ?? Boolean(isRichText) : false,
      reaction_count: updatedComment.reaction_count ?? 0,
      reactions: updatedComment.reactions ?? [],
      user_reaction: updatedComment.user_reaction ?? null,
    }
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn("Comment update will retry when online", error)
      return undefined
    }
    console.error("Error in updateComment:", error)
    throw error
  }
}

// Delete a comment (soft delete by updating status if the column exists, otherwise hard delete)
export async function deleteComment(id: string): Promise<void> {
  await checkColumns() // Ensure schema cache warmed, though deletion handled via API

  try {
    let response: Response
    try {
      response = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn("Comment delete queued for background sync", error)
        return
      }
      throw error
    }

    const result = await readJson<{ success?: boolean; error?: string }>(response)

    if (!response.ok || result?.success === false) {
      const message = result?.error || `Failed to delete comment (HTTP ${response.status})`
      throw new Error(message)
    }

    clearCommentCache()
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn("Comment delete will retry when online", error)
      return
    }
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

  const { commentId, reportedBy: _reportedBy, reason } = data

  try {
    let response: Response
    try {
      response = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, action: "report", reason }),
        credentials: "include",
      })
    } catch (error) {
      if (isOfflineError(error)) {
        console.warn("Comment report queued for background sync", error)
        return
      }
      throw error
    }

    const result = await readJson<ApiResult<{ success: boolean }>>(response)

    if (!response.ok || !result?.success) {
      const message = result?.error || `Failed to report comment (HTTP ${response.status})`
      throw new Error(message)
    }
  } catch (error) {
    if (isOfflineError(error)) {
      console.warn("Comment report will retry when online", error)
      return
    }
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
    user_reaction: null,
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
