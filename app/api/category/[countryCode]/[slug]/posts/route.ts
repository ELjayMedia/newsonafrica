import { NextResponse } from "next/server"
import { getPostsByCategoryForCountry } from "@/lib/wordpress-api"
import { mapWordPressPostsToPostListItems } from "@/lib/data/post-list"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  { params }: { params: { countryCode: string; slug: string } },
) {
  const { countryCode, slug } = params
  const searchParams = new URL(request.url).searchParams
  const first = Number.parseInt(searchParams.get("first") || "10", 10)
  const after = searchParams.get("after") || undefined

  try {
    const result = await getPostsByCategoryForCountry(countryCode, slug, first, after ?? undefined)
    const posts = mapWordPressPostsToPostListItems(result.posts, countryCode)

    return NextResponse.json({
      posts,
      pageInfo: { hasNextPage: result.hasNextPage, endCursor: result.endCursor },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
