import type { NextRequest } from "next/server"
import { fetchCategories } from "@/lib/wordpress/service"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export const runtime = "nodejs"
// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country")?.toLowerCase() || undefined
  const cats = await fetchCategories(country)
  return jsonWithCors(req, cats)
}
