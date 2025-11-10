import type { NextRequest } from "next/server"
import { getRestBase } from "@/lib/wp-endpoints"
import { jsonWithCors, logRequest } from "@/lib/api-utils"
import { ENV } from "@/config/env"

export const runtime = "nodejs"
// Cache policy: short (1 minute)
export const revalidate = 60

export async function GET(req: NextRequest) {
  logRequest(req)
  const base = getRestBase(ENV.NEXT_PUBLIC_DEFAULT_SITE)
  const res = await fetch(`${base}/countries?per_page=100&_fields=id,slug`)
  const data = await res.json()
  return jsonWithCors(req, data)
}
