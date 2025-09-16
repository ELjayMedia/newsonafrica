import { NextResponse } from "next/server"
import { fetchTaggedPosts } from "@/lib/wordpress-api"

// Cache policy: medium (5 minutes)
export const revalidate = 300

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  logRequest(request)
  const { searchParams } = new URL(request.url)
  const after = searchParams.get("after") || null
  const slug = params.slug

  try {
    const data = await fetchTaggedPosts(slug, after)
    return jsonWithCors(request, data)
  } catch (error) {
    console.error("Error fetching posts by tag:", error)
    return jsonWithCors(request, { error: "Failed to fetch posts" }, { status: 500 })
  }
}
