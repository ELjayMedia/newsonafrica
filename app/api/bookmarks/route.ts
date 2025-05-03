import { type NextRequest, NextResponse } from "next/server"
import { getAuthTokenFromRequest } from "@/lib/cookies"
import { fetchUserProfile, updateUserProfile } from "@/lib/wordpress-api"

export async function GET(request: NextRequest) {
  const token = getAuthTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await fetchUserProfile(token)
    return NextResponse.json(user.bookmarks)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = getAuthTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { postId } = await request.json()
    const user = await fetchUserProfile(token)
    const updatedBookmarks = [...user.bookmarks, postId]
    await updateUserProfile(token, { bookmarks: updatedBookmarks })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = getAuthTokenFromRequest(request)
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { postId } = await request.json()
    const user = await fetchUserProfile(token)
    const updatedBookmarks = user.bookmarks.filter((id: string) => id !== postId)
    await updateUserProfile(token, { bookmarks: updatedBookmarks })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 })
  }
}
