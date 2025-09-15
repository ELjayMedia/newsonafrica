import { NextRequest, NextResponse } from "next/server"
import { fetchCategories } from "@/lib/wordpress-api"
import { CACHE_DURATIONS } from "@/lib/cache-utils"


export const runtime = "edge"
// Cache policy: short (1 minute)
export const revalidate = CACHE_DURATIONS.SHORT

export async function GET(req: NextRequest) {
  logRequest(req)
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country")?.toLowerCase() || undefined
  const cats = await fetchCategories(country)
  return jsonWithCors(req, cats)
}
