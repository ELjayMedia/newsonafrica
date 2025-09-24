import { NextRequest } from "next/server"
import { getWpEndpoints, DEFAULT_SITE } from "@/config/wp"
import { jsonWithCors, logRequest } from "@/lib/api-utils"


export const runtime = "edge"
// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const base = getWpEndpoints(DEFAULT_SITE).rest
  const res = await fetch(`${base}/countries?per_page=100&_fields=id,slug`)
  const data = await res.json()
  return jsonWithCors(req, data)
}
