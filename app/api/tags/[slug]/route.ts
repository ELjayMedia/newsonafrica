import { NextResponse } from "next/server"
import { fetchPostsByTag } from "@/lib/wordpress-api"
import logger from '@/utils/logger'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url)
  const after = searchParams.get("after") || null
  const slug = params.slug

  try {
    const data = await fetchPostsByTag(slug, after)
    return NextResponse.json(data)
  } catch (error) {
    logger.error("Error fetching posts by tag:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}
