import { NextResponse } from "next/server"
import { fetchRecentPosts } from "@/lib/wordpress"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "5", 10)

    // In a real implementation, this would query an analytics service
    // to retrieve view counts for posts and return them sorted.
    // For now, we fetch recent posts and attach deterministic view counts
    const posts = await fetchRecentPosts(limit)
    const postsWithViews = posts.map((post, index) => ({
      ...post,
      viewCount: (limit - index) * 100,
    }))

    return NextResponse.json({ posts: postsWithViews })
  } catch (error: any) {
    console.error("Error fetching most read posts:", error)
    return NextResponse.json({ error: "Failed to fetch most read posts" }, { status: 500 })
  }
}
