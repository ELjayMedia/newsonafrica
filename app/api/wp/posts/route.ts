import type { NextRequest } from "next/server"
import { fetchPosts, resolveCountryCode } from "@/lib/wordpress/service"
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
  const section = searchParams.get("section") || undefined
  const page = Number(searchParams.get("page") || "1")
  const perPage = Number(searchParams.get("per_page") || "10")
  const idsParam = searchParams.get("ids")
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined

  const opts: any = { category: section || undefined, page, perPage, ids }

  if (country) {
    if (country.length === 2) {
      opts.countryCode = country.toLowerCase()
    } else {
      const resolved = resolveCountryCode(country)
      if (resolved) {
        opts.countryCode = resolved
      }
    }
  }

  const data = await fetchPosts(opts)
  return jsonWithCors(req, data, { headers: DEPRECATION_HEADERS })
}
