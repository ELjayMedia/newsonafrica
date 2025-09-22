import type { NextRequest } from "next/server"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { fetchTaggedPosts } from "@/lib/wordpress-api"

// Cache policy: medium (5 minutes)
export const revalidate = 300

type TagRouteParams = Record<string, string | string[] | undefined>

type TagRouteContext = {
  params?: Promise<TagRouteParams>
}

export async function GET(request: NextRequest, context: TagRouteContext) {
  logRequest(request)
  const params = await context.params
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  if (!slug) {
    return jsonWithCors(request, { error: "Tag slug is required" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const after = searchParams.get("after") || null

  try {
    const data = await fetchTaggedPosts(slug, after)
    return jsonWithCors(request, data)
  } catch (error) {
    console.error("Error fetching posts by tag:", error)
    return jsonWithCors(request, { error: "Failed to fetch posts" }, { status: 500 })
  }
}
