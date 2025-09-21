import { NextRequest } from "next/server"
import { getWpEndpoints } from "@/config/wp"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { env } from "@/config/env"


export const runtime = "edge"
// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const base = getWpEndpoints(env.NEXT_PUBLIC_DEFAULT_SITE).rest
  const res = await fetch(`${base}/countries?per_page=100&_fields=id,slug`)
  const data = await res.json()
  return jsonWithCors(req, data)
}
