import type { NextRequest } from "next/server"
import { fetchCategories } from "@/lib/wordpress/service"
import { jsonWithCors, logRequest } from "@/lib/api-utils"

export const runtime = "nodejs"
// Cache policy: short (1 minute)
export const revalidate = 60

const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Sunset: "Tue, 30 Jun 2026 23:59:59 GMT",
  Link: '</docs/wordpress-service-migration>; rel="deprecation"; type="text/markdown"',
} as const

export async function GET(req: NextRequest) {
  logRequest(req)
  const { searchParams } = new URL(req.url)
  const country = searchParams.get("country")?.toLowerCase() || undefined
  const cats = await fetchCategories(country)
  return jsonWithCors(req, cats, { headers: DEPRECATION_HEADERS })
}
