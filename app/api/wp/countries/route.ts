import { NextRequest, NextResponse } from "next/server"
import { getCountryBaseUrl } from "@/lib/wp"
import { CACHE_DURATIONS } from "@/lib/cache-utils"


export const runtime = "edge"
// Cache policy: short (1 minute)
export const revalidate = CACHE_DURATIONS.SHORT

export async function GET(req: NextRequest) {
  logRequest(req)
  const base = getCountryBaseUrl(process.env.NEXT_PUBLIC_DEFAULT_SITE || "")
  const res = await fetch(`${base}/wp-json/wp/v2/countries?per_page=100&_fields=id,slug`)
  const data = await res.json()
  return jsonWithCors(req, data)
}
