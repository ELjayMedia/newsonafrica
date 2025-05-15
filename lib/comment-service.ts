import { supabase } from "@/lib/supabase"
import type { Comment, NewComment, ReportCommentData, CommentSortOption } from "@/lib/supabase-schema"
import { v4 as uuidv4 } from "uuid"
import { createCommentReplyNotification } from "@/services/notification-service"

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
let hasRichTextColumn: boolean | null = null

async function checkColumns(): Promise<{ hasStatus: boolean; hasRichText: boolean }> {
  if (hasStatusColumn !== null && hasRichTextColumn !== null) {
    return { hasStatus: hasStatusColumn, hasRichText: hasRichTextColumn }
  }

  try {
    // Try to select the status column
    const { data: statusData, error: statusError } = await supabase.from("comments").select("status").limit(1)
    hasStatusColumn = !statusError

    // Try to select the is_rich_text column
    const { data: richTextData, error: richTextError } = await supabase.from("comments").select("is_rich_text").limit(1)
    hasRichTextColumn = !richTextError

    return { hasStatus: hasStatusColumn, hasRichText: hasRichTextColumn }
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

    // Fetch reactions for all comments
    let reactions = []
    try {
      const { data: reactionData, error: reactionError } = await supabase
        .from("comment_reactions")
        .select("*")
        .in("comment_id", allCommentIds)

      if (!reactionError && reactionData) {
        reactions = reactionData
      }
    } catch (error) {
      console.error("Error fetching reactions (table might not exist):", error)
      // Continue without reactions if table doesn't exist
    }

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

    // Create a map of comment_id to reactions
    const reactionMap = new Map()
    reactions.forEach((reaction) => {
      if (!reactionMap.has(reaction.comment_id)) {
        reactionMap.set(reaction.comment_id, [])
      }
      reactionMap.get(reaction.comment_id).push(reaction)
    })

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
        reactions: reactionMap.get(comment.id) || [],
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
          reactions: reactionMap.get(reply.id) || [],
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

    // If this is a reply, create a notification for the parent comment author
    if (comment.parent_id) {
      try {
        // Get the parent comment to find its author
        const { data: parentComment, error: parentError } = await supabase
          .from("comments")
          .select("user_id, post_id")
          .eq("id", comment.parent_id)
          .single()

        if (!parentError && parentComment) {
          // Get the post title
          const { data: post, error: postError } = await supabase
            .from("posts")
            .select("title")
            .eq("id", comment.post_id)
            .single()

          // If we can't get the post from Supabase, try WordPress
          let postTitle = "a post"
          if (postError || !post) {
            try {
              // Try to get the post title from WordPress
              const response = await fetch(`${process.env.WORDPRESS_API_URL}/wp/v2/posts/${comment.post_id}`)
              if (response.ok) {
                const wpPost = await response.json()
                postTitle = wpPost.title.rendered || "a post"
              }
            } catch (wpError) {
              console.error("Error fetching post from WordPress:", wpError)
            }
          } else {
            postTitle = post.title
          }

          // Create notification
          await createCommentReplyNotification({
            recipientId: parentComment.user_id,
            senderId: comment.user_id,
            senderName: profile?.username || "Someone",
            senderAvatar: profile?.avatar_url || undefined,
            postId: comment.post_id,
            postTitle,
            commentId: newComment.id,
            commentContent: comment.content,
          })
        }
      } catch (notifError) {
        console.error("Error creating notification:", notifError)
        // Don't throw here, we still want to return the comment
      }
    }

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

    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from("comments")
      .update(updateData)
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
  const { hasStatus } = await checkColumns()

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

// Add a reaction to a comment
export async function addReaction(
  commentId: string,
  userId: string,
  reactionType: "like" | "love" | "laugh" | "sad" | "angry",
): Promise<void> {
  try {
    // First check if the user already has a reaction on this comment
    const { data: existingReaction, error: checkError } = await supabase
      .from("comment_reactions")
      .select("id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error checking existing reaction:", checkError)
      throw checkError
    }

    // If user already has a reaction, update it
    if (existingReaction) {
      const { error: updateError } = await supabase
        .from("comment_reactions")
        .update({ reaction_type: reactionType })
        .eq("id", existingReaction.id)

      if (updateError) {
        console.error("Error updating reaction:", updateError)
        throw updateError
      }
    } else {
      // Otherwise, insert a new reaction
      const { error: insertError } = await supabase.from("comment_reactions").insert({
        comment_id: commentId,
        user_id: userId,
        reaction_type: reactionType,
      })

      if (insertError) {
        console.error("Error adding reaction:", insertError)
        throw insertError
      }
    }

    // Update the reaction_count on the comment
    await updateReactionCount(commentId)
  } catch (error) {
    console.error("Error in addReaction:", error)
    throw error
  }
}

// Remove a reaction from a comment
export async function removeReaction(commentId: string, userId: string): Promise<void> {
  try {
    // Delete the reaction
    const { error } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error removing reaction:", error)
      throw error
    }

    // Update the reaction_count on the comment
    await updateReactionCount(commentId)
  } catch (error) {
    console.error("Error in removeReaction:", error)
    throw error
  }
}

// Update the reaction count on a comment
async function updateReactionCount(commentId: string): Promise<void> {
  try {
    // Count the reactions for this comment
    const { count, error: countError } = await supabase
      .from("comment_reactions")
      .select("*", { count: "exact", head: true })
      .eq("comment_id", commentId)

    if (countError) {
      console.error("Error counting reactions:", countError)
      throw countError
    }

    // Update the comment with the new count
    const { error: updateError } = await supabase
      .from("comments")
      .update({ reaction_count: count || 0 })
      .eq("id", commentId)

    if (updateError) {
      console.error("Error updating reaction count:", updateError)
      throw updateError
    }
  } catch (error) {
    console.error("Error in updateReactionCount:", error)
    // Don't throw here, as this is a background operation
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
