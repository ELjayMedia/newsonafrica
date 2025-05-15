import type { NextRequest } from "next/server"
import { z } from "zod"
import { getAuthTokenFromRequest } from "@/lib/cookies"
import { fetchUserProfile, updateUserProfile } from "@/lib/wordpress-api"
import { applyRateLimit, handleApiError, successResponse } from "@/lib/api-utils"

// Input validation schemas
const addBookmarkSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
})

const removeBookmarkSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
})

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 20, "BOOKMARKS_GET_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const token = getAuthTokenFromRequest(request)
    if (!token) {
      throw new Error("Unauthorized")
    }

    const user = await fetchUserProfile(token)
    return successResponse(user.bookmarks || [])
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "BOOKMARKS_POST_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const token = getAuthTokenFromRequest(request)
    if (!token) {
      throw new Error("Unauthorized")
    }

    const body = await request.json()

    // Validate request body
    const { postId } = addBookmarkSchema.parse(body)

    const user = await fetchUserProfile(token)

    // Check if bookmark already exists
    if (user.bookmarks && user.bookmarks.includes(postId)) {
      return successResponse({ success: true, message: "Bookmark already exists" })
    }

    const updatedBookmarks = [...(user.bookmarks || []), postId]
    await updateUserProfile(token, { bookmarks: updatedBookmarks })

    return successResponse({
      success: true,
      bookmarks: updatedBookmarks,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await applyRateLimit(request, 10, "BOOKMARKS_DELETE_API_CACHE_TOKEN")
    if (rateLimitResponse) return rateLimitResponse

    const token = getAuthTokenFromRequest(request)
    if (!token) {
      throw new Error("Unauthorized")
    }

    const body = await request.json()

    // Validate request body
    const { postId } = removeBookmarkSchema.parse(body)

    const user = await fetchUserProfile(token)

    if (!user.bookmarks || !user.bookmarks.includes(postId)) {
      return successResponse({ success: true, message: "Bookmark does not exist" })
    }

    const updatedBookmarks = (user.bookmarks || []).filter((id: string) => id !== postId)
    await updateUserProfile(token, { bookmarks: updatedBookmarks })

    return successResponse({
      success: true,
      bookmarks: updatedBookmarks,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
