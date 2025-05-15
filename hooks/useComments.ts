"use client"

import { useState, useEffect, useCallback } from "react"
import { optimizedSelect } from "@/lib/query-utils"
import type { Comment } from "@/lib/supabase-schema"

interface UseCommentsOptions {
  postId: string
  pageSize?: number
  sortOption?: "newest" | "oldest" | "popular"
}

export function useComments({ postId, pageSize = 10, sortOption = "newest" }: UseCommentsOptions) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalComments, setTotalComments] = useState(0)

  const fetchComments = useCallback(
    async (pageNum = 0, append = false) => {
      if (!postId) return

      setLoading(true)
      try {
        // First, get root comments
        const orderBy = {
          column: sortOption === "popular" ? "reaction_count" : "created_at",
          ascending: sortOption === "oldest",
        }

        const result = await optimizedSelect<Comment>("comments", {
          columns: "*",
          filters: {
            post_id: postId,
            parent_id: null,
            status: "active",
          },
          pagination: {
            page: pageNum,
            pageSize,
          },
          orderBy,
          cacheKey: `comments:${postId}:${pageNum}:${pageSize}:${sortOption}`,
          ttl: 60000, // 1 minute cache
        })

        if (result.error) {
          throw new Error(result.error.message)
        }

        const rootComments = result.data || []
        const rootCommentIds = rootComments.map((comment) => comment.id)

        // If we have root comments, fetch their replies
        let replies: Comment[] = []
        if (rootCommentIds.length > 0) {
          const repliesResult = await optimizedSelect<Comment>("comments", {
            columns: "*",
            filters: {
              post_id: postId,
              parent_id: rootCommentIds,
              status: "active",
            },
            cacheKey: `comments:replies:${postId}:${rootCommentIds.join(",")}`,
            ttl: 60000, // 1 minute cache
          })

          if (repliesResult.error) {
            throw new Error(repliesResult.error.message)
          }

          replies = repliesResult.data || []
        }

        // Fetch user profiles for all comments
        const allComments = [...rootComments, ...replies]
        const userIds = [...new Set(allComments.map((comment) => comment.user_id))]

        let profiles: Record<string, any> = {}
        if (userIds.length > 0) {
          const profilesResult = await optimizedSelect("profiles", {
            columns: "id, username, avatar_url",
            filters: {
              id: userIds,
            },
            cacheKey: `profiles:${userIds.join(",")}`,
            ttl: 300000, // 5 minute cache for profiles
          })

          if (!profilesResult.error && profilesResult.data) {
            profiles = profilesResult.data.reduce(
              (acc, profile) => {
                acc[profile.id] = profile
                return acc
              },
              {} as Record<string, any>,
            )
          }
        }

        // Fetch reactions for all comments
        const allCommentIds = allComments.map((comment) => comment.id)
        let reactions: Record<string, any[]> = {}

        if (allCommentIds.length > 0) {
          try {
            const reactionsResult = await optimizedSelect("comment_reactions", {
              columns: "*",
              filters: {
                comment_id: allCommentIds,
              },
              cacheKey: `reactions:${allCommentIds.join(",")}`,
              ttl: 60000, // 1 minute cache
            })

            if (!reactionsResult.error && reactionsResult.data) {
              // Group reactions by comment_id
              reactions = reactionsResult.data.reduce(
                (acc, reaction) => {
                  if (!acc[reaction.comment_id]) {
                    acc[reaction.comment_id] = []
                  }
                  acc[reaction.comment_id].push(reaction)
                  return acc
                },
                {} as Record<string, any[]>,
              )
            }
          } catch (err) {
            console.error("Error fetching reactions:", err)
            // Continue without reactions
          }
        }

        // Enhance comments with profiles and reactions
        const enhancedComments = allComments.map((comment) => ({
          ...comment,
          profile: profiles[comment.user_id]
            ? {
                username: profiles[comment.user_id].username,
                avatar_url: profiles[comment.user_id].avatar_url,
              }
            : undefined,
          reactions: reactions[comment.id] || [],
        }))

        // Organize comments into a hierarchical structure
        const organizedComments = organizeComments(enhancedComments)

        // Update state
        if (append) {
          setComments((prev) => [...prev, ...organizedComments])
        } else {
          setComments(organizedComments)
        }

        setHasMore(result.count ? (pageNum + 1) * pageSize < result.count : false)
        setTotalComments(result.count || 0)
        setError(null)
      } catch (err: any) {
        console.error("Error loading comments:", err)
        setError(err.message || "Failed to load comments")
      } finally {
        setLoading(false)
      }
    },
    [postId, pageSize, sortOption],
  )

  // Load initial comments
  useEffect(() => {
    setPage(0)
    fetchComments(0, false)
  }, [fetchComments, postId, sortOption])

  // Function to load more comments
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchComments(nextPage, true)
    }
  }, [hasMore, loading, page, fetchComments])

  // Function to refresh comments
  const refresh = useCallback(() => {
    setPage(0)
    fetchComments(0, false)
  }, [fetchComments])

  // Helper function to organize comments
  function organizeComments(comments: Comment[]): Comment[] {
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

  return {
    comments,
    loading,
    error,
    hasMore,
    totalComments,
    loadMore,
    refresh,
    page,
  }
}
